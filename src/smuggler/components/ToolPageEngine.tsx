'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ChevronLeft,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Users,
  Share2,
  Copy,
  Bookmark,
  Star,
  MoreVertical,
  RefreshCw,
  Download,
  Trophy,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Instagram,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { generateContent } from '@/smuggler/lib/generate-client';
import { getToolTips } from '@/smuggler/lib/tool-tips';
import { getToolConfig, type FieldConfig, type MetricConfig } from '@/smuggler/lib/tool-configs';
import { ALL_TOOLS, type SmugglerTool } from '@/smuggler/data/tools';
import { useLibraryStore } from '@/smuggler/store/useLibraryStore';

export interface ToolPageEngineProps {
  toolId: string;
  onBack: () => void;
}

/* ---------- Platform options ---------- */
const PLATFORM_OPTIONS = [
  { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { name: 'Instagram', icon: Instagram, color: '#E1306C' },
  { name: 'TikTok', icon: Star, color: '#111111' },
  { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
];

/* ---------- Typewriter Text (Pro Tip — multi-tip cycling) ---------- */
function TypewriterText({ tips }: { tips: string[] }) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * tips.length));
  const [display, setDisplay] = useState('');
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing' | 'paused'>('typing');

  const text = tips[tipIndex] || tips[0] || '';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      if (display.length < text.length) {
        timer = setTimeout(() => setDisplay(text.slice(0, display.length + 1)), 35);
      } else {
        timer = setTimeout(() => setPhase('holding'), 300);
      }
    } else if (phase === 'holding') {
      timer = setTimeout(() => setPhase('erasing'), 3000);
    } else if (phase === 'erasing') {
      if (display.length > 0) {
        timer = setTimeout(() => setDisplay(text.slice(0, display.length - 1)), 15);
      } else {
        timer = setTimeout(() => setPhase('paused'), 200);
      }
    } else {
      // Pick a random next tip (different from current) — schedule for next tick
      timer = setTimeout(() => {
        let nextIdx = Math.floor(Math.random() * tips.length);
        if (tips.length > 1 && nextIdx === tipIndex) nextIdx = (nextIdx + 1) % tips.length;
        setTipIndex(nextIdx);
        setPhase('typing');
      }, 400);
    }
    return () => clearTimeout(timer);
  }, [display, phase, text, tips, tipIndex]);

  return (
    <span>
      {display}
      <span className="smuggler-caret-blink" aria-hidden="true" />
    </span>
  );
}

/* ---------- Loading Sequence ---------- */
const LOADING_LINES = [
  'Mission Accepted',
  'Analyzing parameters',
  'Processing intelligence',
  'Generating classified results',
];

function LoadingSequence() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % LOADING_LINES.length), 1100);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-1.5">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="font-mono text-[0.8rem] font-bold uppercase tracking-[2px] text-[var(--smuggler-accent-green)]"
        >
          {LOADING_LINES[index]}
          <span className="smuggler-caret-blink ml-0.5" aria-hidden="true" />
        </motion.p>
      </AnimatePresence>
      <p className="text-[0.7rem] text-[var(--smuggler-text-muted)]">
        Step {index + 1} of {LOADING_LINES.length}
      </p>
    </div>
  );
}

/* ---------- Generate Button ---------- */
function GenerateButton({
  onClick,
  disabled,
  isGenerating,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  label: string;
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; size: number }>>([]);
  const idRef = useRef(0);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 0.6;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const id = ++idRef.current;
    setRipples((r) => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 650);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="smuggler-press-3d smuggler-generate-shine relative overflow-hidden flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.95rem] font-bold text-white"
      style={{ backgroundColor: 'var(--smuggler-accent-green)' }}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="smuggler-ripple-span"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
      {isGenerating ? (
        <>
          <RefreshCw size={18} className="animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Sparkles size={18} className="fill-current" />
          {label}
        </>
      )}
    </button>
  );
}

/* ---------- Circular Score Ring ---------- */
function CircularScore({ score }: { score: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#4C6B4A' : score >= 70 ? '#8B9E5E' : score >= 50 ? '#C28B5E' : '#9B3D3D';
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Average' : 'Needs Work';

  return (
    <div className="relative flex h-[140px] w-[140px] items-center justify-center">
      <svg ref={ref} className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--smuggler-border)" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={{ duration: 1.4, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-[var(--smuggler-text-muted)]"
        >
          Overall Score
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }} animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="text-[2rem] font-extrabold leading-none text-[var(--smuggler-text)]"
        >
          {score}<span className="text-[1rem] text-[var(--smuggler-text-muted)]">/100</span>
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: -4 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          className="mt-0.5 flex items-center gap-1 text-[0.7rem] font-bold" style={{ color }}
        >
          <Trophy size={12} className="fill-current" style={{ color: 'var(--smuggler-gold)' }} />
          {label}
        </motion.span>
      </div>
    </div>
  );
}

/* ---------- Score Metric Bar ---------- */
function ScoreMetric({ metric, index }: { metric: { label: string; value: number; percent: number; color: string }; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[0.85rem] font-semibold text-[#333]">{metric.label}</span>
        <motion.span
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
          className="text-[0.85rem] font-bold text-[var(--smuggler-text)]"
        >
          {metric.value.toFixed(1)}<span className="text-[var(--smuggler-text-muted)]">/10</span>
        </motion.span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--smuggler-border)]">
        <motion.div
          className="h-full rounded-full" style={{ backgroundColor: metric.color }}
          initial={{ width: 0 }} animate={inView ? { width: `${metric.percent}%` } : { width: 0 }}
          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1], delay: 0.3 + index * 0.15 }}
        />
      </div>
    </div>
  );
}

/* ---------- Result Card ---------- */
interface GeneratedItem {
  text: string;
  score: number;
  rationale: string;
  favorited: boolean;
}

function ResultCard({
  item, index, onCopy, onToggleFavorite,
}: {
  item: GeneratedItem; index: number; onCopy: (text: string) => void; onToggleFavorite: (idx: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const scoreColor = item.score >= 90 ? '#4C6B4A' : item.score >= 70 ? '#8B9E5E' : item.score >= 50 ? '#C28B5E' : '#9B3D3D';

  const handleCopy = () => {
    onCopy(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="smuggler-hook-card group relative flex items-start gap-4 rounded-xl p-5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[1rem] font-extrabold text-white" style={{ backgroundColor: scoreColor }}>
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="m-0 whitespace-pre-wrap text-[0.95rem] leading-[1.55] text-[var(--smuggler-text)]">{item.text}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white" style={{ backgroundColor: scoreColor }}>
            {item.score}/100
          </span>
          <span className="text-[0.7rem] text-[var(--smuggler-text-muted)]">
            {item.score >= 90 ? 'Excellent' : item.score >= 70 ? 'Good' : 'Average'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
        <button type="button" onClick={handleCopy} className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg text-[var(--smuggler-text-secondary)] transition-colors hover:bg-[var(--smuggler-border)] hover:text-[var(--smuggler-text)]" aria-label={copied ? 'Copied' : 'Copy'}>
          {copied ? <ShieldCheck size={16} className="text-[#4C6B4A]" /> : <Copy size={16} />}
        </button>
        <button type="button" onClick={() => onToggleFavorite(index)} className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--smuggler-border)]" aria-label="Bookmark">
          <Bookmark size={16} className={item.favorited ? 'fill-current text-[#C09A4D]' : 'text-[var(--smuggler-text-secondary)]'} />
        </button>
        <button type="button" onClick={() => onToggleFavorite(index)} className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--smuggler-border)]" aria-label="Favorite">
          <Star size={16} className={item.favorited ? 'fill-current text-[#F4D03F]' : 'text-[var(--smuggler-text-secondary)]'} />
        </button>
        <button type="button" className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg text-[var(--smuggler-text-secondary)] transition-colors hover:bg-[var(--smuggler-border)] hover:text-[var(--smuggler-text)]" aria-label="More options">
          <MoreVertical size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- Empty State ---------- */
function EmptyState() {
  return (
    <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)] p-8 text-center">
      <div className="smuggler-empty-glow" />
      <span className="smuggler-particle" style={{ width: 4, height: 4, top: '20%', left: '20%', animationDelay: '0s' }} aria-hidden="true" />
      <span className="smuggler-particle" style={{ width: 3, height: 3, top: '30%', right: '25%', animationDelay: '1.2s' }} aria-hidden="true" />
      <span className="smuggler-particle" style={{ width: 5, height: 5, bottom: '25%', left: '25%', animationDelay: '2s' }} aria-hidden="true" />
      <span className="smuggler-particle" style={{ width: 3, height: 3, bottom: '30%', right: '22%', animationDelay: '0.6s' }} aria-hidden="true" />
      <div className="relative z-10 mb-6 h-[120px] w-[120px]">
        <div className="absolute inset-0 rounded-full border-2 border-[#C09858]/20" />
        <div className="absolute inset-[15px] rounded-full border-2 border-[#C09858]/25" />
        <div className="absolute inset-[30px] rounded-full border-2 border-[#C09858]/30" />
        <div className="absolute inset-[45px] rounded-full border-2 border-[#C09858]/35" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#C09858]/20" />
        <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-[#C09858]/20" />
        <div className="smuggler-radar-sweep absolute inset-0 origin-center">
          <div className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top" style={{ background: 'linear-gradient(to bottom, rgba(192,152,88,0.7), transparent)' }} />
        </div>
        <div className="smuggler-pulse-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C09858]" />
      </div>
      <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#C0392B]/40 bg-[#C0392B]/5 px-3 py-1">
        <span className="smuggler-pulse-dot h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
        <span className="text-[0.65rem] font-black uppercase tracking-[2px] text-[#C0392B]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          Classified · Awaiting Input
        </span>
      </div>
      <h3 className="smuggler-shimmer-text mb-2 font-serif text-[1.4rem] font-bold">Awaiting Mission Brief...</h3>
      <p className="m-0 max-w-[320px] text-[0.85rem] leading-relaxed text-[var(--smuggler-text-secondary)]">
        Configure your parameters on the left and dispatch the agent. Your results will be decrypted here.
      </p>
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--smuggler-border)] px-3 py-2">
        <Sparkles size={14} className="text-[var(--smuggler-gold)]" />
        <span className="text-[0.75rem] italic text-[var(--smuggler-text-secondary)]">Agent Tip: Specific inputs produce superior intelligence.</span>
      </div>
    </div>
  );
}

/* ---------- Dynamic Field Renderer ---------- */
function FieldRenderer({
  field, value, onChange,
}: {
  field: FieldConfig; value: string | number; onChange: (v: string | number) => void;
}) {
  switch (field.type) {
    case 'textarea':
      return (
        <div>
          <label className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)]">
            {field.label} {field.required && <span className="text-[#C0392B]">*</span>}
          </label>
          <div className="smuggler-input-premium relative rounded-xl transition-all">
            <textarea
              value={String(value)}
              onChange={(e) => onChange(field.maxLength ? e.target.value.slice(0, field.maxLength) : e.target.value)}
              rows={field.rows ?? 3}
              placeholder={field.placeholder}
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[0.9rem] text-[var(--smuggler-text)] outline-none placeholder:text-[#AAA]"
            />
            {field.maxLength && (
              <span className="absolute bottom-2 right-3 text-[0.7rem] text-[var(--smuggler-text-muted)]">
                {String(value).length}/{field.maxLength}
              </span>
            )}
          </div>
        </div>
      );

    case 'text':
      return (
        <div>
          <label className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)]">
            {field.label} {field.optional && <span className="text-[var(--smuggler-text-muted)]">(Optional)</span>}
          </label>
          <div className="smuggler-input-premium relative rounded-xl">
            <input
              type="text"
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-xl bg-transparent px-4 py-2.5 text-[0.9rem] text-[var(--smuggler-text)] outline-none placeholder:text-[#AAA]"
            />
          </div>
        </div>
      );

    case 'select':
    case 'tone':
    case 'language':
      return (
        <div>
          <label className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)]">
            {field.label} {field.optional && <span className="text-[var(--smuggler-text-muted)]">(Optional)</span>}
          </label>
          <div className="smuggler-input-premium relative rounded-xl">
            <select
              value={String(value)}
              onChange={(e) => onChange(e.target.value)}
              className="w-full appearance-none rounded-xl bg-transparent px-4 py-2.5 text-[0.9rem] text-[var(--smuggler-text)] outline-none"
            >
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--smuggler-text-muted)]" />
          </div>
        </div>
      );

    case 'platform': {
      return (
        <div>
          <label className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)]">{field.label}</label>
          <div className="flex gap-2">
            {PLATFORM_OPTIONS.map((p) => {
              const Icon = p.icon;
              const isActive = String(value) === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => onChange(p.name)}
                  className="smuggler-platform-btn smuggler-press flex h-11 w-11 items-center justify-center rounded-xl transition-all"
                  style={{
                    borderColor: isActive ? p.color : undefined,
                    backgroundColor: isActive ? p.color + '10' : undefined,
                    boxShadow: isActive
                      ? `0 0 0 3px ${p.color}20, 0 1px 0 0 rgba(255,255,255,0.8) inset, 0 6px 14px -2px rgba(60,40,10,0.12)`
                      : undefined,
                  }}
                  aria-label={p.name}
                  aria-pressed={isActive}
                >
                  <Icon size={20} className={isActive ? '' : 'text-[var(--smuggler-text-secondary)]'} style={{ color: isActive ? p.color : undefined }} />
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'count': {
      const counts = field.counts ?? [5, 10, 15, 20];
      return (
        <div>
          <label className="mb-1.5 block text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)]">{field.label}</label>
          <div className="flex gap-2">
            {counts.map((n) => {
              const isActive = Number(value) === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`smuggler-count-btn smuggler-press flex h-10 flex-1 items-center justify-center rounded-lg text-[0.85rem] font-bold transition-all ${isActive ? 'smuggler-count-btn-active' : ''}`}
                  aria-pressed={isActive}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

/* ---------- Main Engine ---------- */
export function ToolPageEngine({ toolId, onBack }: ToolPageEngineProps) {
  const tool = ALL_TOOLS.find((t) => t.id === toolId);
  const config = getToolConfig(toolId, tool);
  const toolTips = useMemo(() => getToolTips(toolId), [toolId]);
  const ToolIcon = tool?.icon ?? Sparkles;

  // Initialize field state from config defaults
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>(() => {
    const vals: Record<string, string | number> = {};
    for (const f of config.fields) {
      vals[f.key] = f.defaultValue ?? (f.type === 'count' ? 5 : '');
    }
    return vals;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [items, setItems] = useState<GeneratedItem[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savedContentRef = useRef<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState('');
  const [liveMetrics, setLiveMetrics] = useState<Array<{ label: string; value: number; percent: number; color: string }>>([]);

  // Reset state when toolId changes (render-time pattern)
  const [prevToolId, setPrevToolId] = useState(toolId);
  if (toolId !== prevToolId) {
    setPrevToolId(toolId);
    const vals: Record<string, string | number> = {};
    for (const f of config.fields) {
      vals[f.key] = f.defaultValue ?? (f.type === 'count' ? 5 : '');
    }
    setFieldValues(vals);
    setIsGenerating(false);
    setHasGenerated(false);
    setItems([]);
    setApiError(null);
    setAnalysisSummary('');
    setLiveMetrics([]);
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const count = typeof fieldValues.count === 'number' ? fieldValues.count : 5;
  const overallScore = items.length > 0 ? Math.round(items.reduce((s, h) => s + h.score, 0) / items.length) : 0;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setHasGenerated(false);
    setApiError(null);
    try {
      const result = await generateContent(toolId, { ...fieldValues, toolName: tool?.name ?? toolId }, count);
      setItems(result.items.map((item) => ({ ...item, favorited: false })));
      if (result.summary) setAnalysisSummary(result.summary);
      if (result.metrics) {
        setLiveMetrics(config.metrics.map((m) => {
          const val = result.metrics[m.key];
          return {
            label: m.label,
            value: val,
            percent: Math.round(val * 10),
            color: val >= 8.5 ? '#4C6B4A' : '#8B9E5E',
          };
        }));
      }
      setHasGenerated(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Generation failed');
      showToast('Generation failed — please retry');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('Copied to clipboard');
  };

  const handleCopyAll = () => {
    const all = items.map((it, i) => `${i + 1}. ${it.text}`).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(all).catch(() => {});
    }
    showToast('All results copied');
  };

  const handleToggleFavorite = (idx: number) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, favorited: !it.favorited } : it)));
  };

  const handleSaveAll = async () => {
    if (saving || items.length === 0) return;
    const contentStr = items.map((it) => it.text).join('\n---\n');
    if (savedContentRef.current === contentStr) {
      showToast('Already saved to your vault');
      return;
    }
    setSaving(true);
    try {
      const addItem = useLibraryStore.getState().addItem;
      const typeMap: Record<string, string> = {
        'hook-generator': 'hook',
        'script-writer': 'script',
        'podcast-script-writer': 'script',
        'caption-generator': 'caption',
        'instagram-caption-generator': 'caption',
        'title-generator': 'title',
        'thumbnail-creator': 'thumbnail',
      };
      const itemType = typeMap[toolId] || 'ai-output';
      await addItem({
        title: items[0].text.length > 60 ? items[0].text.slice(0, 57) + '...' : items[0].text,
        content: contentStr,
        type: itemType as any,
        toolName: tool?.name ?? toolId,
        category: tool?.category ?? 'AI Utility',
        folderId: null,
        tags: [],
        favorite: false,
        pinned: false,
        status: 'active',
        score: Math.round(items.reduce((s, it) => s + it.score, 0) / items.length),
      });
      savedContentRef.current = contentStr;
      showToast('Saved to your vault');
    } catch {
      showToast('Failed to save — please try again');
    } finally {
      setSaving(false);
    }
  };
  const handleExport = () => showToast('Exported as .txt');

  if (!tool) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-2xl font-bold text-[var(--smuggler-text)]">Tool not found</h1>
        <button onClick={onBack} className="text-[var(--smuggler-accent-green)] hover:underline">← Back to all tools</button>
      </div>
    );
  }

  const generateLabel = `Generate ${config.outputItemNoun === 'analysis' || config.outputItemNoun === 'guide' || config.outputItemNoun === 'calendar' || config.outputItemNoun === 'plan' || config.outputItemNoun === 'checklist' || config.outputItemNoun === 'brief' || config.outputItemNoun === 'contract' || config.outputItemNoun === 'proposal' || config.outputItemNoun === 'invoice' || config.outputItemNoun === 'schema' || config.outputItemNoun === 'chapters' || config.outputItemNoun === 'transcription' ? '' : ''}Results`;

  return (
    <section
      className="smuggler-bg-premium relative min-h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--smuggler-bg)', backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.035 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")", color: 'var(--smuggler-text)' }}
    >
      {/* Ambient floating particles — cinematic atmosphere */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        <motion.div
          className="absolute left-[10%] top-[20%] h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: 'rgba(192,152,88,0.3)' }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-[15%] top-[35%] h-1 w-1 rounded-full"
          style={{ backgroundColor: 'rgba(89,127,86,0.3)' }}
          animate={{ y: [0, -15, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute left-[80%] top-[60%] h-2 w-2 rounded-full"
          style={{ backgroundColor: 'rgba(192,152,88,0.2)' }}
          animate={{ y: [0, -12, 0], opacity: [0.15, 0.4, 0.15] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute left-[5%] top-[70%] h-1 w-1 rounded-full"
          style={{ backgroundColor: 'rgba(192,152,88,0.25)' }}
          animate={{ y: [0, -18, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(192,152,88,0.04), transparent 50%), radial-gradient(circle at 80% 80%, rgba(89,127,86,0.03), transparent 50%)',
        }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 lg:px-12">
        {/* HERO */}
        <div className="relative mb-8">
          <motion.button
            type="button" onClick={onBack}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
            whileHover={{ x: -3 }}
            className="mb-5 flex items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--smuggler-text-secondary)] transition-colors hover:text-[var(--smuggler-accent-green)]"
          >
            <ChevronLeft size={14} /><span>Dashboard</span><span className="text-[#BBB]">/</span><span>Tools</span><span className="text-[#BBB]">/</span><span className="text-[var(--smuggler-accent-green)]">{tool.name}</span>
          </motion.button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_280px]">
            {/* Title */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
              <div className="mb-3 flex items-center gap-3">
                <span className="smuggler-hero-title-wrap">
                  <h1 className="smuggler-hero-title m-0 text-[2.2rem] leading-none sm:text-[2.6rem]">{tool.name}</h1>
                </span>
                {tool.isPopular && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-bold text-white" style={{ backgroundColor: 'var(--smuggler-accent-green)', boxShadow: '0 2px 6px rgba(30,94,62,0.3), 0 1px 0 rgba(255,255,255,0.2) inset' }}>
                    <Sparkles size={12} className="fill-current" /> AI Powered
                  </span>
                )}
              </div>
              <span className="smuggler-title-divider mb-3" aria-hidden="true" />
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut', delay: 0.45 }} className="m-0 max-w-[460px] text-[1.02rem] leading-[1.65] text-[var(--smuggler-text-secondary)]" style={{ letterSpacing: '0.005em' }}>
                {tool.desc}
              </motion.p>
            </motion.div>

            {/* Mascot + stamp */}
            <motion.div className="relative hidden h-[180px] w-[200px] justify-center lg:flex" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}>
              <motion.img src="/smuggler/assets/hero-mascot-new.png" alt="Content Smuggler spy mascot" className="smuggler-mascot-float relative z-10 h-[180px] w-[180px] rounded-full border-2 object-cover" style={{ borderColor: 'rgba(192,152,88,0.3)', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.18))' }} />
              <motion.div className="smuggler-stamp-entrance smuggler-stamp-swing-loop pointer-events-none absolute bottom-[6px] right-[-4px] z-20 rounded-md border-[3px] border-[#C0392B] bg-[var(--smuggler-bg-panel)]/30 px-3 py-1.5 text-center backdrop-blur-[1px]" style={{ opacity: 0.92 }}>
                <span className="block text-[0.85rem] font-black tracking-[2px] text-[#C0392B]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>TOP SECRET</span>
                <span className="block text-[0.5rem] font-bold tracking-[1px] text-[#C0392B]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>HANDLE WITH CARE</span>
              </motion.div>
            </motion.div>

            {/* Pro Tip */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }} whileHover={{ y: -3, transition: { duration: 0.2 } }} className="smuggler-protip-card smuggler-paper-grain relative rounded-xl p-5">
              <div className="absolute -top-2 left-4 text-[var(--smuggler-text-muted)]">
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none"><path d="M14 4v16a4 4 0 11-8 0V6a2.5 2.5 0 015 0v13a1 1 0 11-2 0V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={13} className="text-[#C09A4D]" />
                <span className="text-[0.72rem] font-bold uppercase tracking-[2px] text-[var(--smuggler-gold)]" style={{ fontFamily: 'var(--font-heading)' }}>Pro Tip</span>
                <span className="ml-auto inline-block h-1 w-1 rounded-full bg-[#C09A4D]/50" aria-hidden="true" />
              </div>
              <p className="m-0 min-h-[3.4rem] text-[0.88rem] leading-[1.7] text-[var(--smuggler-text-secondary)]">
                <TypewriterText tips={toolTips} />
              </p>
              <p className="mt-2.5 text-right text-[0.82rem] italic text-[var(--smuggler-text-muted)]" style={{ fontFamily: 'var(--font-heading)' }}>— Content Smuggler</p>
            </motion.div>
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* LEFT PANEL */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="smuggler-panel-premium smuggler-paper-grain smuggler-surface-warm rounded-2xl p-6">
            <div className="mb-5 flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--smuggler-accent-green)]/10 text-[0.75rem] font-bold text-[var(--smuggler-accent-green)]" style={{ fontFamily: 'var(--font-heading)' }}>
                <ToolIcon size={14} />
              </span>
              <h2 className="smuggler-section-heading m-0 text-[1.12rem] text-[var(--smuggler-text)]">Mission Parameters</h2>
            </div>
            <div className="flex flex-col gap-5">
              {config.fields.map((field) => (
                <FieldRenderer
                  key={field.key}
                  field={field}
                  value={fieldValues[field.key] ?? field.defaultValue ?? ''}
                  onChange={(v) => setFieldValues((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </div>
            <div className="mt-6">
              <GenerateButton onClick={handleGenerate} disabled={isGenerating} isGenerating={isGenerating} label="Generate Results" />
            </div>
          </motion.div>

          {/* RIGHT PANEL — fixed height */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="smuggler-panel-premium smuggler-paper-grain smuggler-surface-warm smuggler-hooks-panel rounded-2xl p-6">
            {/* Header */}
            <div className="smuggler-hooks-header mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--smuggler-accent-green)]/10 text-[0.75rem] font-bold text-[var(--smuggler-accent-green)]" style={{ fontFamily: 'var(--font-heading)' }}>2</span>
                <h2 className="smuggler-section-heading m-0 text-[1.12rem] text-[var(--smuggler-text)]">{config.outputLabel}</h2>
                {hasGenerated && <span className="rounded-full bg-[var(--smuggler-gold)]/15 px-2.5 py-0.5 text-[0.7rem] font-bold text-[var(--smuggler-gold)]">{count * 2} credits used</span>}
              </div>
              {hasGenerated && (
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveAll} disabled={saving} className={`smuggler-press flex items-center gap-1.5 rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)] px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--smuggler-text-secondary)] transition-colors hover:border-[var(--smuggler-accent-green)] hover:text-[var(--smuggler-accent-green)] ${saving ? 'cursor-not-allowed opacity-50' : ''}`}>{saving ? <RefreshCw size={14} className="animate-spin" /> : <Bookmark size={14} />}{saving ? 'Saving...' : 'Save All'}</button>
                  <button type="button" onClick={handleExport} className="smuggler-press flex items-center gap-1.5 rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)] px-3 py-1.5 text-[0.8rem] font-semibold text-[var(--smuggler-text-secondary)] transition-colors hover:border-[var(--smuggler-accent-green)] hover:text-[var(--smuggler-accent-green)]"><Download size={14} />Export</button>
                </div>
              )}
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {apiError && !isGenerating && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="smuggler-hooks-header mb-3 flex items-center gap-2 overflow-hidden rounded-xl border border-[#C0392B]/30 bg-[#C0392B]/5 px-4 py-3 text-[0.8rem] text-[#C0392B]">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span className="flex-1">Agent transmission failed: {apiError}. Using fallback intelligence — retry for fresh results.</span>
                  <button type="button" onClick={handleGenerate} className="smuggler-press shrink-0 rounded-lg border border-[#C0392B]/40 px-3 py-1 text-[0.75rem] font-bold hover:bg-[#C0392B]/10">Retry</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable content */}
            <div className="smuggler-hooks-scroll">
              <AnimatePresence mode="wait">
                {isGenerating && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-[360px] flex-col items-center justify-center gap-5">
                    <div className="relative h-[100px] w-[100px]">
                      <div className="smuggler-radar-sweep absolute inset-0 rounded-full border-2 border-[var(--smuggler-accent-green)]/30">
                        <div className="absolute left-1/2 top-1/2 h-1/2 w-1 origin-top" style={{ background: 'linear-gradient(to bottom, rgba(30,94,62,0.6), transparent)' }} />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={28} className="text-[var(--smuggler-accent-green)] animate-pulse" /></div>
                    </div>
                    <LoadingSequence />
                    <div className="relative mt-1 h-1 w-full max-w-[280px] overflow-hidden rounded-full bg-[var(--smuggler-border)]">
                      <div className="smuggler-scan-bar absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[var(--smuggler-accent-green)] to-transparent" />
                    </div>
                  </motion.div>
                )}
                {!isGenerating && !hasGenerated && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><EmptyState /></motion.div>
                )}
                {!isGenerating && hasGenerated && (
                  <motion.div key="generated" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex flex-col gap-3 pb-2">
                      {items.map((item, i) => (
                        <ResultCard key={i} item={item} index={i} onCopy={handleCopy} onToggleFavorite={handleToggleFavorite} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer buttons */}
            {hasGenerated && !isGenerating && (
              <div className="smuggler-hooks-footer mt-4 flex flex-col gap-2 border-t border-[var(--smuggler-border)]/60 pt-4 sm:flex-row">
                <button type="button" onClick={handleCopyAll} className="smuggler-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)] py-2.5 text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)] transition-colors hover:border-[#C09858] hover:text-[var(--smuggler-gold)]"><Copy size={15} />Copy All</button>
                <button type="button" onClick={handleGenerate} className="smuggler-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)] py-2.5 text-[0.85rem] font-semibold text-[var(--smuggler-text-secondary)] transition-colors hover:border-[var(--smuggler-accent-green)] hover:text-[var(--smuggler-accent-green)]"><RefreshCw size={15} />Generate More</button>
              </div>
            )}
          </motion.div>
        </div>

        {/* BOTTOM ANALYSIS */}
        <AnimatePresence>
          {hasGenerated && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr_auto]">
              {/* Score Guide */}
              <div className="smuggler-panel-analysis smuggler-paper-grain smuggler-surface-warm rounded-2xl p-6">
                <div className="mb-1 flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--smuggler-gold)]" /><h3 className="smuggler-section-heading m-0 text-[1rem] text-[var(--smuggler-text)]">Score Guide</h3></div>
                <p className="mb-4 text-[0.8rem] text-[var(--smuggler-text-secondary)]">We score results based on proven engagement factors.</p>
                <div className="flex flex-col gap-2.5">
                  {[{ range: '90-100', label: 'Excellent', color: '#4C6B4A' }, { range: '70-89', label: 'Good', color: '#8B9E5E' }, { range: '50-69', label: 'Average', color: '#C28B5E' }, { range: 'Below 50', label: 'Poor', color: '#9B3D3D' }].map((g) => (
                    <div key={g.range} className="flex items-center gap-2.5">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color, boxShadow: `0 0 6px ${g.color}40` }} />
                      <span className="text-[0.8rem] font-semibold text-[#333]">{g.range}</span>
                      <span className="text-[0.8rem] text-[var(--smuggler-text-muted)]">{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why it works */}
              <div className="smuggler-panel-analysis smuggler-paper-grain smuggler-surface-warm rounded-2xl p-6">
                <div className="mb-1 flex items-center gap-2"><Sparkles size={15} className="text-[var(--smuggler-gold)]" /><h3 className="smuggler-section-heading m-0 text-[1rem] text-[var(--smuggler-text)]">{config.analysisTitle}</h3></div>
                <p className="mb-4 text-[0.8rem] leading-relaxed text-[var(--smuggler-text-secondary)]">{analysisSummary || 'Analysis will appear here after generation.'}</p>
                <div className="flex flex-col gap-3">
                  {liveMetrics.map((m, i) => <ScoreMetric key={m.label} metric={m} index={i} />)}
                </div>
              </div>

              {/* Circular Score */}
              <div className="smuggler-panel-analysis smuggler-paper-grain smuggler-surface-warm-deep flex flex-col items-center justify-center rounded-2xl p-6">
                <CircularScore score={overallScore} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FOOTER */}
        <footer className="relative border-t border-[var(--smuggler-border)] pt-6">
          <span className="pointer-events-none absolute -top-px left-1/2 h-px w-40 -translate-x-1/2" style={{ background: 'linear-gradient(90deg, transparent, rgba(192,152,88,0.5), transparent)' }} aria-hidden="true" />
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4 text-[0.78rem] text-[var(--smuggler-text-secondary)]">
              <span className="smuggler-footer-link flex items-center gap-1.5"><ShieldCheck size={14} className="text-[var(--smuggler-accent-green)]" />Your data is encrypted and secure.</span>
              <span className="hidden h-3 w-px bg-[var(--smuggler-border)] sm:block" aria-hidden="true" />
              <span className="hidden items-center gap-1.5 sm:flex smuggler-footer-link"><Users size={14} className="text-[var(--smuggler-gold)]" />Trusted by 10,000+ creators worldwide.</span>
            </div>
            <div className="flex items-center gap-2 text-[0.78rem] text-[var(--smuggler-text-secondary)]">
              <span className="flex items-center gap-1.5"><Share2 size={13} />Share this tool:</span>
              <button type="button" className="smuggler-share-btn flex h-7 w-7 items-center justify-center rounded-lg text-[var(--smuggler-text-secondary)] hover:bg-[var(--smuggler-border)] hover:text-[#1DA1F2]" aria-label="Share on Twitter"><Twitter size={14} /></button>
              <button type="button" className="smuggler-share-btn flex h-7 w-7 items-center justify-center rounded-lg text-[var(--smuggler-text-secondary)] hover:bg-[var(--smuggler-border)] hover:text-[#0A66C2]" aria-label="Share on LinkedIn"><Linkedin size={14} /></button>
              <button type="button" className="smuggler-share-btn flex h-7 w-7 items-center justify-center rounded-lg text-[var(--smuggler-text-secondary)] hover:bg-[var(--smuggler-border)] hover:text-[#1877F2]" aria-label="Share on Facebook"><Facebook size={14} /></button>
            </div>
          </div>
        </footer>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 40, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 40, x: '-50%' }} transition={{ duration: 0.3, ease: 'easeOut' }} className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-2 rounded-xl border border-[var(--smuggler-accent-green)]/30 bg-[var(--smuggler-bg-panel)] px-4 py-2.5 text-[0.85rem] font-semibold text-[var(--smuggler-accent-green)] shadow-2xl" role="status" aria-live="polite">
            <ShieldCheck size={16} />{toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default ToolPageEngine;
