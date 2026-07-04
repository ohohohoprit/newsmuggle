'use client';

import { useEffect, useRef, useState } from 'react';
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
  type LucideIcon,
} from 'lucide-react';

export interface HookGeneratorPageProps {
  onBack: () => void;
}

/* ---------- Data ---------- */

interface PlatformOption {
  name: string;
  icon: LucideIcon;
  color: string;
}

const PLATFORMS: PlatformOption[] = [
  { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { name: 'Instagram', icon: Instagram, color: '#E1306C' },
  { name: 'TikTok', icon: Star, color: '#111111' },
  { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
];

const TONES = ['Casual', 'Engaging & Direct', 'Professional', 'Humorous', 'Controversial'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Hindi', 'Japanese'];
const AUDIENCES = [
  'Content Creators',
  'Marketers',
  'Entrepreneurs',
  'Educators',
  'Fitness Enthusiasts',
  'Tech Professionals',
];
const HOOK_COUNTS = [5, 10, 15, 20];

interface GeneratedHook {
  id: number;
  text: string;
  score: number;
  favorited: boolean;
}

const SAMPLE_HOOKS: Omit<GeneratedHook, 'id' | 'favorited'>[] = [
  { text: "These 5 hacks save me 10+ hours every week (and they're game changers)", score: 92 },
  { text: "The AI tool that will save you 10 hours a week (and it's free).", score: 88 },
  { text: "Stop doing content research manually. Do THIS instead.", score: 85 },
  { text: "I tried the top 5 productivity apps so you don't have to. Here's the truth.", score: 79 },
  { text: "The secret formula top creators use to go viral consistently.", score: 94 },
];

const SCORE_METRICS = [
  { label: 'Curiosity', value: 9.2, percent: 92, color: '#4C6B4A' },
  { label: 'Specificity', value: 8.7, percent: 87, color: '#8B9E5E' },
  { label: 'Benefit Driven', value: 9.5, percent: 95, color: '#4C6B4A' },
  { label: 'Emotional Impact', value: 8.3, percent: 83, color: '#8B9E5E' },
];

const SCORE_GUIDE = [
  { range: '90-100', label: 'Excellent', color: '#4C6B4A' },
  { range: '70-89', label: 'Good', color: '#8B9E5E' },
  { range: '50-69', label: 'Average', color: '#C28B5E' },
  { range: 'Below 50', label: 'Poor', color: '#9B3D3D' },
];

/* ---------- Circular Score Ring ---------- */

function CircularScore({ score }: { score: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? '#4C6B4A' : score >= 70 ? '#8B9E5E' : score >= 50 ? '#C28B5E' : '#9B3D3D';
  const label = score >= 90 ? 'Excellent Hook' : score >= 70 ? 'Good Hook' : score >= 50 ? 'Average Hook' : 'Needs Work';

  return (
    <div className="relative flex h-[140px] w-[140px] items-center justify-center">
      <svg ref={ref} className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E5DDC8"
          strokeWidth="8"
        />
        {/* Progress */}
        <motion.circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circumference }}
          transition={{ duration: 1.4, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-[0.65rem] font-semibold uppercase tracking-[1.5px] text-[#888]"
        >
          Overall Score
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ delay: 0.6, duration: 0.5, type: 'spring', bounce: 0.4 }}
          className="text-[2rem] font-extrabold leading-none text-[#111]"
        >
          {score}
          <span className="text-[1rem] text-[#888]">/100</span>
        </motion.span>
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          className="mt-0.5 flex items-center gap-1 text-[0.7rem] font-bold"
          style={{ color }}
        >
          <Trophy size={12} className="fill-current" style={{ color: '#C09A4D' }} />
          {label}
        </motion.span>
      </div>
    </div>
  );
}

/* ---------- Score Metric Bar ---------- */

function ScoreMetric({
  metric,
  index,
}: {
  metric: (typeof SCORE_METRICS)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[0.85rem] font-semibold text-[#333]">{metric.label}</span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5 + index * 0.15, duration: 0.4 }}
          className="text-[0.85rem] font-bold text-[#111]"
        >
          {metric.value.toFixed(1)}
          <span className="text-[#888]">/10</span>
        </motion.span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5DDC8]">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: metric.color }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${metric.percent}%` } : { width: 0 }}
          transition={{
            duration: 1.1,
            ease: [0.25, 1, 0.5, 1],
            delay: 0.3 + index * 0.15,
          }}
        />
      </div>
    </div>
  );
}

/* ---------- Hook Card ---------- */

function HookCard({
  hook,
  index,
  onCopy,
  onToggleFavorite,
}: {
  hook: GeneratedHook;
  index: number;
  onCopy: (text: string) => void;
  onToggleFavorite: (id: number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const scoreColor =
    hook.score >= 90 ? '#4C6B4A' : hook.score >= 70 ? '#8B9E5E' : hook.score >= 50 ? '#C28B5E' : '#9B3D3D';

  const handleCopy = () => {
    onCopy(hook.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group relative flex items-start gap-4 rounded-xl border border-[#E5DDC8] bg-[#FFFDF5] p-5 transition-shadow duration-300 hover:shadow-[0_8px_24px_rgba(140,106,59,0.1)]"
    >
      {/* Number */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[1rem] font-extrabold text-white"
        style={{ backgroundColor: scoreColor }}
      >
        {hook.id}
      </div>

      {/* Hook text + score */}
      <div className="flex-1">
        <p className="m-0 text-[0.95rem] leading-[1.55] text-[#222]">{hook.text}</p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[0.65rem] font-bold text-white"
            style={{ backgroundColor: scoreColor }}
          >
            {hook.score}/100
          </span>
          <span className="text-[0.7rem] text-[#888]">
            {hook.score >= 90 ? 'Excellent' : hook.score >= 70 ? 'Good' : 'Average'}
          </span>
        </div>
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F0E8D5] hover:text-[#111]"
          aria-label={copied ? 'Copied' : 'Copy hook'}
        >
          {copied ? (
            <ShieldCheck size={16} className="text-[#4C6B4A]" />
          ) : (
            <Copy size={16} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(hook.id)}
          className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#F0E8D5]"
          aria-label="Bookmark hook"
        >
          <Bookmark
            size={16}
            className={hook.favorited ? 'fill-current text-[#C09A4D]' : 'text-[#666]'}
          />
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(hook.id)}
          className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[#F0E8D5]"
          aria-label="Favorite hook"
        >
          <Star
            size={16}
            className={hook.favorited ? 'fill-current text-[#F4D03F]' : 'text-[#666]'}
          />
        </button>
        <button
          type="button"
          className="smuggler-press flex h-8 w-8 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F0E8D5] hover:text-[#111]"
          aria-label="More options"
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- Empty State (Awaiting Mission Brief) ---------- */

function EmptyState() {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5C9AA] bg-[#FAF6EC] p-8 text-center">
      {/* Radar visual */}
      <div className="relative mb-6 h-[120px] w-[120px]">
        {/* Concentric rings */}
        <div className="absolute inset-0 rounded-full border-2 border-[#C09858]/20" />
        <div className="absolute inset-[15px] rounded-full border-2 border-[#C09858]/25" />
        <div className="absolute inset-[30px] rounded-full border-2 border-[#C09858]/30" />
        <div className="absolute inset-[45px] rounded-full border-2 border-[#C09858]/35" />
        {/* Cross hairs */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[#C09858]/20" />
        <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-[#C09858]/20" />
        {/* Sweeping line */}
        <div className="smuggler-radar-sweep absolute inset-0 origin-center">
          <div
            className="absolute left-1/2 top-1/2 h-1/2 w-px origin-top"
            style={{
              background: 'linear-gradient(to bottom, rgba(192,152,88,0.7), transparent)',
            }}
          />
        </div>
        {/* Center dot */}
        <div className="smuggler-pulse-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C09858]" />
      </div>

      {/* Classified label */}
      <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[#C0392B]/40 bg-[#C0392B]/5 px-3 py-1">
        <span className="smuggler-pulse-dot h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
        <span
          className="text-[0.65rem] font-black uppercase tracking-[2px] text-[#C0392B]"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          Classified · Awaiting Input
        </span>
      </div>

      <h3 className="smuggler-shimmer-text mb-2 font-serif text-[1.4rem] font-bold">
        Awaiting Mission Brief...
      </h3>
      <p className="m-0 max-w-[320px] text-[0.85rem] leading-relaxed text-[#666]">
        Describe your content on the left and dispatch the agent. Your
        scroll-stopping hooks will be decrypted here.
      </p>

      {/* Agent tip footer */}
      <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#F0E8D5] px-3 py-2">
        <Sparkles size={14} className="text-[#8C6A3B]" />
        <span className="text-[0.75rem] italic text-[#555]">
          Agent Tip: The best hooks create curiosity, promise value, or
          challenge the status quo.
        </span>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

export function HookGeneratorPage({ onBack }: HookGeneratorPageProps) {
  const [content, setContent] = useState(
    '5 productivity hacks that help content creators save 10+ hours every week',
  );
  const [audience, setAudience] = useState('Content Creators');
  const [platform, setPlatform] = useState('YouTube');
  const [tone, setTone] = useState('Casual');
  const [language, setLanguage] = useState('English');
  const [hookCount, setHookCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [hooks, setHooks] = useState<GeneratedHook[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const overallScore =
    hooks.length > 0
      ? Math.round(hooks.reduce((s, h) => s + h.score, 0) / hooks.length)
      : 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => {
      const generated = SAMPLE_HOOKS.slice(0, hookCount).map((h, i) => ({
        ...h,
        id: i + 1,
        favorited: false,
      }));
      setHooks(generated);
      setIsGenerating(false);
      setHasGenerated(true);
    }, 2200);
  };

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('Hook copied to clipboard');
  };

  const handleCopyAll = () => {
    const all = hooks.map((h) => `${h.id}. ${h.text}`).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(all).catch(() => {});
    }
    showToast('All hooks copied');
  };

  const handleToggleFavorite = (id: number) => {
    setHooks((prev) =>
      prev.map((h) => (h.id === id ? { ...h, favorited: !h.favorited } : h)),
    );
  };

  const handleSaveAll = () => showToast('Hooks saved to your vault');
  const handleExport = () => showToast('Hooks exported as .txt');

  return (
    <section
      className="relative min-h-screen"
      style={{
        backgroundColor: '#F8F5E6',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.035 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        color: '#222',
      }}
    >
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-8 lg:px-12">
        {/* ===========================
            1. HERO SECTION
            =========================== */}
        <div className="relative mb-8">
          {/* Breadcrumb */}
          <motion.button
            type="button"
            onClick={onBack}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ x: -3 }}
            className="mb-5 flex items-center gap-1.5 text-[0.8rem] font-semibold text-[#666] transition-colors hover:text-[#1E5E3E]"
          >
            <ChevronLeft size={14} />
            <span>Dashboard</span>
            <span className="text-[#BBB]">/</span>
            <span>Tools</span>
            <span className="text-[#BBB]">/</span>
            <span className="text-[#1E5E3E]">Hook Generator</span>
          </motion.button>

          {/* Hero grid: title block | mascot+stamp | pro tip */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto_280px]">
            {/* Title block */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="mb-3 flex items-center gap-3">
                <h1
                  className="m-0 font-serif text-[2.2rem] font-bold leading-none tracking-tight text-[#111] sm:text-[2.6rem]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Hook Generator
                </h1>
                {/* AI Powered pill */}
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-bold text-white"
                  style={{ backgroundColor: '#1E5E3E' }}
                >
                  <Sparkles size={12} className="fill-current" />
                  AI Powered
                </span>
              </div>
              <p className="m-0 max-w-[460px] text-[1rem] leading-[1.55] text-[#555]">
                Create scroll-stopping hooks that grab attention instantly.
              </p>
            </motion.div>

            {/* Mascot + TOP SECRET stamp */}
            <motion.div
              className="relative hidden h-[180px] w-[200px] justify-center lg:flex"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            >
              {/* Mascot */}
              <motion.img
                src="/smuggler/assets/mascot-5.png"
                alt="Content Smuggler spy mascot carrying classified documents"
                className="smuggler-mascot-float relative z-10 h-[180px] w-auto object-contain"
                style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}
              />
              {/* TOP SECRET stamp — top-right, overlapping mascot corner */}
              <motion.div
                className="smuggler-stamp-entrance smuggler-stamp-swing-loop pointer-events-none absolute right-[-8px] top-[2px] z-20 rounded-md border-[3px] border-[#C0392B] bg-transparent px-3 py-1.5 text-center"
                style={{ opacity: 0.88 }}
              >
                <span
                  className="block text-[1rem] font-black tracking-[2px] text-[#C0392B]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  TOP SECRET
                </span>
                <span
                  className="block text-[0.55rem] font-bold tracking-[1px] text-[#C0392B]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  HANDLE WITH CARE
                </span>
              </motion.div>
            </motion.div>

            {/* Pro Tip card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
              className="relative rounded-xl border border-[#D5C9AA] bg-[#FFFDF5] p-5 shadow-sm"
            >
              {/* Paperclip */}
              <div className="absolute -top-2 left-4 text-[#999]">
                <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                  <path
                    d="M14 4v16a4 4 0 11-8 0V6a2.5 2.5 0 015 0v13a1 1 0 11-2 0V8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#C09A4D]" />
                <span className="text-[0.8rem] font-bold uppercase tracking-[1px] text-[#8C6A3B]">
                  Pro Tip
                </span>
              </div>
              <p className="m-0 text-[0.85rem] leading-[1.55] text-[#444]">
                The best hooks create curiosity, promise value, or challenge
                the status quo.
              </p>
              <p
                className="mt-2 text-right text-[0.8rem] italic text-[#888]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                — Content Smuggler
              </p>
            </motion.div>
          </div>
        </div>

        {/* ===========================
            2. MAIN WORKSPACE
            =========================== */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* ---- LEFT PANEL: Mission Parameters ---- */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-[#E5DDC8] bg-[#FFFDF5] p-6 shadow-[0_2px_12px_rgba(140,106,59,0.06)]"
          >
            <h2 className="mb-5 text-[1.1rem] font-bold text-[#111]">
              <span className="mr-2 text-[#1E5E3E]">1.</span>
              Describe your content
            </h2>

            {/* Content textarea */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                What is your video/post about?
              </label>
              <div className="smuggler-input-glow relative rounded-xl border border-[#E5DDC8] bg-white transition-all">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="e.g., 5 productivity hacks for content creators..."
                  className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[0.9rem] text-[#222] outline-none placeholder:text-[#AAA]"
                />
                <span className="absolute bottom-2 right-3 text-[0.7rem] text-[#999]">
                  {content.length}/500
                </span>
              </div>
            </div>

            {/* Audience */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                Audience <span className="text-[#999]">(Optional)</span>
              </label>
              <div className="smuggler-input-glow relative rounded-xl border border-[#E5DDC8] bg-white">
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full appearance-none rounded-xl bg-transparent px-4 py-2.5 text-[0.9rem] text-[#222] outline-none"
                >
                  {AUDIENCES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
                />
              </div>
            </div>

            {/* Platform */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                Platform
              </label>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  const isActive = platform === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setPlatform(p.name)}
                      className={`smuggler-press flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all`}
                      style={{
                        borderColor: isActive ? p.color : '#E5DDC8',
                        backgroundColor: isActive ? p.color + '10' : '#fff',
                      }}
                      aria-label={p.name}
                      aria-pressed={isActive}
                    >
                      <Icon
                        size={20}
                        className={isActive ? '' : 'text-[#666]'}
                        style={{ color: isActive ? p.color : undefined }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tone + Language (two col) */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                  Tone
                </label>
                <div className="smuggler-input-glow relative rounded-xl border border-[#E5DDC8] bg-white">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-[0.85rem] text-[#222] outline-none"
                  >
                    {TONES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                  Language
                </label>
                <div className="smuggler-input-glow relative rounded-xl border border-[#E5DDC8] bg-white">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full appearance-none rounded-xl bg-transparent px-3 py-2.5 text-[0.85rem] text-[#222] outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888]"
                  />
                </div>
              </div>
            </div>

            {/* Number of hooks */}
            <div className="mb-6">
              <label className="mb-1.5 block text-[0.85rem] font-semibold text-[#444]">
                Number of hooks
              </label>
              <div className="flex gap-2">
                {HOOK_COUNTS.map((n) => {
                  const isActive = hookCount === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setHookCount(n)}
                      className="smuggler-press flex h-10 flex-1 items-center justify-center rounded-lg border-2 text-[0.85rem] font-bold transition-all"
                      style={{
                        borderColor: isActive ? '#1E5E3E' : '#E5DDC8',
                        backgroundColor: isActive ? '#1E5E3E' : '#fff',
                        color: isActive ? '#fff' : '#555',
                      }}
                      aria-pressed={isActive}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="smuggler-press flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.95rem] font-bold text-white shadow-[0_4px_14px_rgba(30,94,62,0.3)] transition-all disabled:opacity-70"
              style={{ backgroundColor: '#1E5E3E' }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Decrypting Hooks...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="fill-current" />
                  Generate Hooks
                </>
              )}
            </button>
          </motion.div>

          {/* ---- RIGHT PANEL: Generated Hooks ---- */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-[#E5DDC8] bg-[#FFFDF5] p-6 shadow-[0_2px_12px_rgba(140,106,59,0.06)]"
          >
            {/* Panel header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-[1.1rem] font-bold text-[#111]">
                  <span className="mr-2 text-[#1E5E3E]">2.</span>
                  Your Generated Hooks
                </h2>
                {hasGenerated && (
                  <span className="rounded-full bg-[#FFF3E0] px-2.5 py-0.5 text-[0.7rem] font-bold text-[#C28B5E]">
                    {hookCount * 2} credits used
                  </span>
                )}
              </div>
              {hasGenerated && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="smuggler-press flex items-center gap-1.5 rounded-lg border border-[#E5DDC8] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[#555] transition-colors hover:border-[#1E5E3E] hover:text-[#1E5E3E]"
                  >
                    <Bookmark size={14} />
                    Save All
                  </button>
                  <button
                    type="button"
                    onClick={handleExport}
                    className="smuggler-press flex items-center gap-1.5 rounded-lg border border-[#E5DDC8] bg-white px-3 py-1.5 text-[0.8rem] font-semibold text-[#555] transition-colors hover:border-[#1E5E3E] hover:text-[#1E5E3E]"
                  >
                    <Download size={14} />
                    Export
                  </button>
                </div>
              )}
            </div>

            {/* Content area */}
            <AnimatePresence mode="wait">
              {isGenerating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-[400px] flex-col items-center justify-center"
                >
                  <div className="relative mb-6 h-[100px] w-[100px]">
                    <div className="smuggler-radar-sweep absolute inset-0 rounded-full border-2 border-[#1E5E3E]/30">
                      <div
                        className="absolute left-1/2 top-1/2 h-1/2 w-1 origin-top"
                        style={{
                          background:
                            'linear-gradient(to bottom, rgba(30,94,62,0.6), transparent)',
                        }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={28} className="text-[#1E5E3E] animate-pulse" />
                    </div>
                  </div>
                  <p className="font-mono text-[0.8rem] font-bold uppercase tracking-[2px] text-[#1E5E3E]">
                    Analyzing target data...
                  </p>
                  <p className="mt-1 text-[0.75rem] text-[#888]">
                    Agent is decrypting your hooks
                  </p>
                </motion.div>
              )}

              {!isGenerating && !hasGenerated && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <EmptyState />
                </motion.div>
              )}

              {!isGenerating && hasGenerated && (
                <motion.div
                  key="generated"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Hook cards */}
                  <div className="mb-5 flex flex-col gap-3">
                    {hooks.map((hook, i) => (
                      <HookCard
                        key={hook.id}
                        hook={hook}
                        index={i}
                        onCopy={handleCopy}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>

                  {/* Copy All + Generate More */}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="smuggler-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5DDC8] bg-white py-2.5 text-[0.85rem] font-semibold text-[#555] transition-colors hover:border-[#C09858] hover:text-[#8C6A3B]"
                    >
                      <Copy size={15} />
                      Copy All Hooks
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="smuggler-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E5DDC8] bg-white py-2.5 text-[0.85rem] font-semibold text-[#555] transition-colors hover:border-[#1E5E3E] hover:text-[#1E5E3E]"
                    >
                      <RefreshCw size={15} />
                      Generate More
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ===========================
            3. BOTTOM ANALYSIS AREA
            =========================== */}
        <AnimatePresence>
          {hasGenerated && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr_auto]"
            >
              {/* Hook Score Guide */}
              <div className="rounded-2xl border border-[#E5DDC8] bg-[#FFFDF5] p-6">
                <h3 className="mb-1 text-[1rem] font-bold text-[#111]">
                  Hook Score Guide
                </h3>
                <p className="mb-4 text-[0.8rem] text-[#666]">
                  We score hooks based on proven engagement factors.
                </p>
                <div className="flex flex-col gap-2.5">
                  {SCORE_GUIDE.map((g) => (
                    <div key={g.range} className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      <span className="text-[0.8rem] font-semibold text-[#333]">
                        {g.range}
                      </span>
                      <span className="text-[0.8rem] text-[#888]">{g.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why this hook works */}
              <div className="rounded-2xl border border-[#E5DDC8] bg-[#FFFDF5] p-6">
                <h3 className="mb-1 text-[1rem] font-bold text-[#111]">
                  Why this hook works?
                </h3>
                <p className="mb-4 text-[0.8rem] leading-relaxed text-[#666]">
                  This hook creates curiosity by highlighting a big benefit
                  (saving 10+ hours) and sets up a promise of valuable,
                  actionable tips.
                </p>
                <div className="flex flex-col gap-3">
                  {SCORE_METRICS.map((m, i) => (
                    <ScoreMetric key={m.label} metric={m} index={i} />
                  ))}
                </div>
              </div>

              {/* Circular Score */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E5DDC8] bg-gradient-to-br from-[#FFFDF5] to-[#F0E8D5] p-6">
                <CircularScore score={overallScore} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===========================
            4. FOOTER
            =========================== */}
        <footer className="border-t border-[#E5DDC8] pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Trust row */}
            <div className="flex items-center gap-4 text-[0.78rem] text-[#666]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#1E5E3E]" />
                Your data is encrypted and secure.
              </span>
              <span className="hidden items-center gap-1.5 sm:flex">
                <Users size={14} className="text-[#8C6A3B]" />
                Trusted by 10,000+ creators worldwide.
              </span>
            </div>

            {/* Share row */}
            <div className="flex items-center gap-2 text-[0.78rem] text-[#666]">
              <span className="flex items-center gap-1.5">
                <Share2 size={13} />
                Share this tool:
              </span>
              <button
                type="button"
                className="smuggler-press flex h-7 w-7 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F0E8D5] hover:text-[#1DA1F2]"
                aria-label="Share on Twitter"
              >
                <Twitter size={14} />
              </button>
              <button
                type="button"
                className="smuggler-press flex h-7 w-7 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F0E8D5] hover:text-[#0A66C2]"
                aria-label="Share on LinkedIn"
              >
                <Linkedin size={14} />
              </button>
              <button
                type="button"
                className="smuggler-press flex h-7 w-7 items-center justify-center rounded-lg text-[#666] transition-colors hover:bg-[#F0E8D5] hover:text-[#1877F2]"
                aria-label="Share on Facebook"
              >
                <Facebook size={14} />
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 z-[100] flex items-center gap-2 rounded-xl border border-[#1E5E3E]/30 bg-[#FFFDF5] px-4 py-2.5 text-[0.85rem] font-semibold text-[#1E5E3E] shadow-2xl"
            role="status"
            aria-live="polite"
          >
            <ShieldCheck size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default HookGeneratorPage;
