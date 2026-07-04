'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  X,
  Tag,
  Flame,
  Star,
  Users,
  Sparkles,
  ArrowRight,
  Loader2,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Copy,
  Save,
  Check,
  FileSearch,
  Crosshair,
  ChevronDown,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { ALL_TOOLS } from '@/smuggler/data/tools';
import { generateContent } from '@/smuggler/lib/generate-client';

export interface ToolModalProps {
  toolId: string | null;
  onClose: () => void;
}

interface PlatformOption {
  name: string;
  icon: LucideIcon;
  color: string;
}

const PLATFORMS: PlatformOption[] = [
  { name: 'YouTube', icon: Youtube, color: '#FF0000' },
  { name: 'Instagram', icon: Instagram, color: '#E1306C' },
  { name: 'Twitter / X', icon: Twitter, color: '#1DA1F2' },
  { name: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
];

const TONES = [
  'Engaging & Direct',
  'Professional',
  'Humorous',
  'Controversial',
] as const;

const DEFAULT_AUDIENCE = 'Content Creators';
const DEFAULT_TOPIC =
  '5 productivity hacks that help content creators save 10+ hours every week';
const DEFAULT_TONE: (typeof TONES)[number] = 'Engaging & Direct';
const DEFAULT_PLATFORM = 'Twitter / X';

/**
 * Individual intel result card. Owns its own "copied" state so each card can
 * show a checkmark independently when its copy button is clicked.
 */
function IntelCard({
  text,
  index,
  number,
}: {
  text: string;
  index: number;
  number: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="flex gap-3 rounded-lg bg-white/80 border border-[#E5DDC8] p-4 mb-3"
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1A3620] text-white flex items-center justify-center font-bold text-sm">
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1A120D] leading-relaxed">{text}</p>
        <div className="flex items-center gap-2 mt-2 justify-end">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copy hook ${number}`}
            className="p-1.5 rounded-md bg-white border border-[#E5DDC8] text-[#4A4A4A] hover:text-[#1A3620] hover:border-[#C09858]/40 transition"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#1A3620]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label={`Star hook ${number}`}
            className="p-1.5 rounded-md bg-white border border-[#E5DDC8] text-[#4A4A4A] hover:text-[#C09858] hover:border-[#C09858]/40 transition"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Mark hook ${number} as used`}
            className="p-1.5 rounded-md bg-white border border-[#E5DDC8] text-[#4A4A4A] hover:text-[#1A3620] hover:border-[#C09858]/40 transition"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function ToolModal({ toolId, onClose }: ToolModalProps) {
  const [audience, setAudience] = useState(DEFAULT_AUDIENCE);
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [tone, setTone] = useState<(typeof TONES)[number]>(DEFAULT_TONE);
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [savedVault, setSavedVault] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<
    Array<{ text: string; score: number; rationale: string }>
  >([]);
  const [genError, setGenError] = useState<string | null>(null);

  const tool = ALL_TOOLS.find((t) => t.id === toolId);
  const open = toolId !== null;

  // Reset workspace state whenever a new tool is opened so the user starts
  // with a clean intel panel every time. Uses the React-recommended
  // "adjust state during render" pattern for resetting state on prop change.
  const [prevToolId, setPrevToolId] = useState(toolId);
  if (toolId !== prevToolId) {
    setPrevToolId(toolId);
    if (toolId) {
      setAudience(DEFAULT_AUDIENCE);
      setTopic(DEFAULT_TOPIC);
      setTone(DEFAULT_TONE);
      setPlatform(DEFAULT_PLATFORM);
      setIsGenerating(false);
      setHasGenerated(false);
      setCopiedAll(false);
      setSavedVault(false);
      setGeneratedItems([]);
      setGenError(null);
    }
  }

  const handleGenerate = async () => {
    if (isGenerating || !toolId) return;
    setIsGenerating(true);
    setHasGenerated(false);
    setGenError(null);
    try {
      const result = await generateContent(
        toolId,
        {
          content: topic,
          topic,
          audience,
          tone,
          platform,
          toolName: tool?.name ?? toolId,
        },
        5,
      );
      setGeneratedItems(result.items);
      setHasGenerated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setGenError(msg);
      setHasGenerated(true);
      setGeneratedItems([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyAll = () => {
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleSaveVault = () => {
    setSavedVault(true);
    window.setTimeout(() => setSavedVault(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[1100px] w-[95vw] max-h-[92vh] overflow-hidden bg-[#FDFBF7] text-[#1A120D] rounded-2xl border border-[#E5DDC8] p-0 gap-0 flex flex-col"
      >
        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DDC8] bg-white/80 backdrop-blur flex-shrink-0 z-30">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-sm font-semibold text-[#4A4A4A] hover:text-[#1A3620] transition"
          >
            <ChevronLeft className="w-4 h-4" />
            All Tools
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-[#4A4A4A] hover:bg-black/5 hover:text-[#1A3620] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="smuggler-scroll-light overflow-y-auto flex-1"
          style={{ maxHeight: 'calc(92vh - 65px)' }}
        >
          {toolId && !tool ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-10">
              <h1 className="font-serif text-4xl font-bold text-[#1A3620] mb-4">
                404 - Tool Not Found
              </h1>
              <button
                type="button"
                onClick={onClose}
                className="bg-[#1A3620] text-white px-6 py-3 rounded-xl hover:bg-[#213A28] transition"
              >
                Return to All Tools
              </button>
            </div>
          ) : tool ? (
            <div className="p-6 md:p-10">
              {/* Tool Hero Card */}
              <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1A3620] to-[#213A28] text-[#F4EEDF] p-6 md:p-8">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
                  style={{
                    backgroundImage:
                      'url(/smuggler/assets/paper-grain-noise.jpg)',
                    backgroundSize: 'cover',
                  }}
                />
                {/* Watermark */}
                <motion.img
                  src="/smuggler/the-smuggler.png"
                  alt=""
                  aria-hidden
                  className="absolute -right-10 top-0 w-[300px] blur-sm grayscale opacity-10 pointer-events-none"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 60,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
                <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
                  <motion.div
                    className="hidden md:block flex-shrink-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <motion.img
                      src="/smuggler/assets/rocket-mascot-correct.png"
                      alt="Smuggler mascot"
                      className="w-32 h-32 object-contain drop-shadow-lg"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </motion.div>

                  <div className="flex-1 text-center md:text-left min-w-0">
                    <motion.div
                      initial={{ rotate: -15, scale: 0.8, opacity: 0 }}
                      animate={{ rotate: -1, scale: 1, opacity: 1 }}
                      transition={{
                        type: 'spring',
                        bounce: 0.5,
                        duration: 0.8,
                        delay: 0.2,
                      }}
                      className="inline-block border-4 border-[#C09858]/40 px-4 py-2 mb-3 bg-black/20"
                    >
                      <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                        {tool.name.toUpperCase()}
                      </h1>
                    </motion.div>
                    <p className="text-[#9A9386] text-sm md:text-base mt-2">
                      {tool.desc}
                    </p>
                    <div className="mt-4 flex gap-2 flex-wrap justify-center md:justify-start">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#C09858]/15 border border-[#C09858]/30 px-3 py-1 text-xs font-semibold text-[#C09858]">
                        <Tag className="w-3 h-3" />
                        {tool.category}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#597F56]/15 border border-[#597F56]/30 px-3 py-1 text-xs font-semibold text-[#6FC276]">
                        <Flame className="w-3 h-3" />
                        High Popularity
                      </span>
                      {tool.isPopular && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#C09858]/15 border border-[#C09858]/30 px-3 py-1 text-xs font-semibold text-[#C09858]">
                          <Star className="w-3 h-3" />
                          Popular
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-[#F4EEDF]">
                        <Users className="w-3 h-3" />
                        {tool.uses} uses
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-Pane Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Pane — Mission Parameters */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative rounded-xl p-6 bg-white/60 border border-white/80 backdrop-blur-sm shadow-sm"
                >
                  <h2 className="font-serif text-lg font-bold mb-4 text-[#1A3620] flex items-center gap-2">
                    <Crosshair className="w-5 h-5" />
                    Mission Parameters
                  </h2>

                  <div className="flex flex-col gap-4">
                    {/* Target Audience */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-[#4A4A4A] mb-1.5 block">
                        Target Audience
                      </label>
                      <input
                        type="text"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="w-full rounded-lg border border-[#E5DDC8] bg-white px-4 py-2.5 text-sm font-medium text-[#1A120D] outline-none focus:border-[#C09858]/60 focus:ring-2 focus:ring-[#C09858]/20 transition"
                      />
                    </div>

                    {/* Topic / Niche */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-[#4A4A4A] mb-1.5 block">
                        Topic / Niche
                      </label>
                      <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-[#E5DDC8] bg-white px-4 py-2.5 text-sm font-medium text-[#1A120D] outline-none focus:border-[#C09858]/60 focus:ring-2 focus:ring-[#C09858]/20 transition resize-y"
                      />
                    </div>

                    {/* Tone */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-[#4A4A4A] mb-1.5 block">
                        Tone
                      </label>
                      <div className="relative">
                        <select
                          value={tone}
                          onChange={(e) =>
                            setTone(e.target.value as (typeof TONES)[number])
                          }
                          className="w-full appearance-none rounded-lg border border-[#E5DDC8] bg-white px-4 py-2.5 pr-10 text-sm font-medium text-[#1A120D] outline-none focus:border-[#C09858]/60 focus:ring-2 focus:ring-[#C09858]/20 transition cursor-pointer"
                        >
                          {TONES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A4A] pointer-events-none" />
                      </div>
                    </div>

                    {/* Platform */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wide text-[#4A4A4A] mb-1.5 block">
                        Platform
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PLATFORMS.map((p) => {
                          const Icon = p.icon;
                          const isActive = platform === p.name;
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => setPlatform(p.name)}
                              aria-pressed={isActive}
                              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                isActive
                                  ? 'bg-[#1A3620] text-white border-[#1A3620]'
                                  : 'bg-white text-[#555] border-[#E5DDC8] hover:border-[#C09858]/40'
                              }`}
                            >
                              <Icon
                                className="w-4 h-4"
                                style={isActive ? { color: p.color } : undefined}
                              />
                              <span className="hidden sm:inline">{p.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Generate Button */}
                    <motion.button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      whileHover={{ y: isGenerating ? 0 : -2 }}
                      whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                      className={`w-full rounded-lg py-3 font-semibold flex items-center justify-center gap-2 transition shadow-md mt-2 ${
                        isGenerating
                          ? 'bg-[#213A28] text-[#6FC276]'
                          : 'bg-[#1A3620] text-white hover:bg-[#213A28]'
                      } disabled:cursor-not-allowed`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="uppercase tracking-wider text-xs">
                            ANALYZING TARGET DATA...
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Intel</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>

                {/* Right Pane — Intel Acquired */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="relative rounded-xl p-6 bg-[#F5EFE0] border border-[#E5DDC8] shadow-sm"
                >
                  <h2 className="font-serif text-lg font-bold mb-4 text-[#1A3620] flex items-center gap-2">
                    <FileSearch className="w-5 h-5" />
                    Intel Acquired
                  </h2>

                  {/* Top action: Copy All */}
                  {hasGenerated && (
                    <div className="flex justify-end mb-3">
                      <motion.button
                        type="button"
                        onClick={handleCopyAll}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1.5 rounded-md bg-white border border-[#E5DDC8] px-3 py-1.5 text-xs font-semibold text-[#4A4A4A] hover:border-[#C09858]/40 hover:text-[#1A3620] transition"
                      >
                        {copiedAll ? (
                          <Check className="w-3.5 h-3.5 text-[#1A3620]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copiedAll ? 'Copied!' : 'Copy All'}
                      </motion.button>
                    </div>
                  )}

                  {/* Results list */}
                  <div className="relative min-h-[300px]">
                    {!hasGenerated && !isGenerating && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#888] opacity-70">
                        <motion.img
                          src="/smuggler/assets/logo.png"
                          alt=""
                          aria-hidden
                          className="w-16 h-16 mb-4 grayscale opacity-50"
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <p className="font-serif text-lg italic">
                          Awaiting parameters...
                        </p>
                      </div>
                    )}

                    {isGenerating && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#1A3620] animate-spin" />
                        <p className="font-bold tracking-widest text-[#1A3620] animate-pulse text-xs">
                          ANALYZING TARGET DATA...
                        </p>
                        {/* Radar visual */}
                        <div
                          className="w-16 h-16 rounded-full border-2 border-[#1A3620]/20 smuggler-radar"
                          style={{
                            background:
                              'conic-gradient(from 0deg, transparent 0deg, rgba(26, 54, 32, 0.25) 60deg, transparent 120deg)',
                          }}
                          aria-hidden
                        />
                      </div>
                    )}

                    {hasGenerated && genError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-3 flex items-center gap-2 rounded-lg border border-[#C0392B]/30 bg-[#C0392B]/5 px-4 py-3 text-[0.8rem] text-[#C0392B]"
                      >
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>Transmission failed: {genError}</span>
                      </motion.div>
                    )}

                    {hasGenerated && generatedItems.length === 0 && !genError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center py-8 text-[0.85rem] text-[#888]"
                      >
                        No results returned. Try different parameters.
                      </motion.div>
                    )}

                    {hasGenerated && generatedItems.length > 0 && (
                      <AnimatePresence>
                        {generatedItems.map((item, i) => (
                          <IntelCard
                            key={`intel-${i}`}
                            text={item.text}
                            index={i}
                            number={i + 1}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>

                  {/* Bottom action: Save to Vault */}
                  {hasGenerated && (
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      onClick={handleSaveVault}
                      className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-[#C09858] text-white py-3 font-semibold hover:bg-[#A07A40] transition shadow-md"
                    >
                      {savedVault ? (
                        <>
                          <Check className="w-4 h-4" />
                          VAULT SECURED
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save to Vault
                        </>
                      )}
                    </motion.button>
                  )}
                </motion.div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ToolModal;
