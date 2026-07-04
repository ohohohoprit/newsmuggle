'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  animate,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  type Variants,
} from 'framer-motion';
import {
  ALL_TOOLS,
  POPULAR_TOOLS,
  CATEGORY_STATS,
  TOOL_COUNT,
  type SmugglerTool,
} from '@/smuggler/data/tools';
import {
  Sparkles,
  ArrowRight,
  PlayCircle,
  Briefcase,
  Zap,
  LockKeyhole,
  Infinity as InfinityIcon,
  Star,
  ShieldCheck,
  Users,
  Brain,
  Wrench,
  Heart,
  Target,
  TrendingUp,
  Share2,
  Megaphone,
  PenLine,
  BarChart3,
  Check,
  ChevronDown,
  Crown,
  Paperclip,
  CheckSquare,
  Mail,
  Youtube,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Twitch,
  Github,
  Rss,
  type LucideIcon,
} from 'lucide-react';

// =====================================================================
// Types & Props
// =====================================================================

export interface HomepageProps {
  onExploreTools: () => void;
  onSelectTool: (toolId: string) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

// =====================================================================
// Shared animation variants
// =====================================================================

const sectionContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const sectionItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const viewportOnce = { once: true, amount: 0.15 } as const;

// =====================================================================
// Typewriter hook
// =====================================================================

const TYPEWRITER_PHRASES = [
  'Smuggle It To Success.',
  'Go Viral Effortlessly.',
  'Save 10+ Hours Weekly.',
  'Outsmart The Algorithm.',
];

function useTypewriter() {
  const [text, setText] = useState('');
  const idxRef = useRef(0);
  const phraseRef = useRef(0);
  const modeRef = useRef<'type' | 'hold' | 'erase' | 'pause'>('type');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phrase = TYPEWRITER_PHRASES[phraseRef.current];
      const mode = modeRef.current;
      if (mode === 'type') {
        if (idxRef.current < phrase.length) {
          idxRef.current += 1;
          setText(phrase.slice(0, idxRef.current));
          timer = setTimeout(tick, 40);
        } else {
          modeRef.current = 'hold';
          timer = setTimeout(tick, 2000);
        }
      } else if (mode === 'hold') {
        modeRef.current = 'erase';
        timer = setTimeout(tick, 20);
      } else if (mode === 'erase') {
        if (idxRef.current > 0) {
          idxRef.current -= 1;
          setText(phrase.slice(0, idxRef.current));
          timer = setTimeout(tick, 20);
        } else {
          modeRef.current = 'pause';
          timer = setTimeout(tick, 300);
        }
      } else {
        phraseRef.current = (phraseRef.current + 1) % TYPEWRITER_PHRASES.length;
        modeRef.current = 'type';
        timer = setTimeout(tick, 40);
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, []);

  return text;
}

// =====================================================================
// Animated counter
// =====================================================================

interface CounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

function Counter({ value, suffix = '', prefix = '', decimals = 0, className, style }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 2,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString('en-US');

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

// =====================================================================
// Section wrapper
// =====================================================================

function Section({
  id,
  children,
  className = '',
  ariaLabel,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={`mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-8 lg:px-16 lg:py-28 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  const isCenter = align === 'center';
  return (
    <motion.div
      variants={sectionContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className={`flex flex-col gap-3 ${isCenter ? 'items-center text-center' : 'items-start text-left'} mb-12`}
    >
      {eyebrow && (
        <motion.span
          variants={sectionItem}
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1"
          style={{
            color: 'var(--smuggler-gold)',
            borderColor: 'rgba(192, 152, 88, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          <Star size={10} className="fill-current" aria-hidden="true" />
          {eyebrow}
        </motion.span>
      )}
      <motion.h2
        variants={sectionItem}
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(2rem, 4vw, 2.75rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          color: 'var(--smuggler-text)',
          maxWidth: isCenter ? '780px' : 'none',
        }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={sectionItem}
          className={isCenter ? 'mx-auto' : ''}
          style={{
            color: 'var(--smuggler-text-secondary)',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            maxWidth: '640px',
          }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

// =====================================================================
// 1. HERO SECTION
// =====================================================================

const FEATURE_PILLS: { icon: LucideIcon; label: string }[] = [
  { icon: Briefcase, label: '95+ Tools' },
  { icon: Zap, label: 'AI Powered' },
  { icon: LockKeyhole, label: '100% Secure' },
  { icon: InfinityIcon, label: 'No Limits' },
];

const HERO_AVATARS = [11, 12, 13];

function HeroSection({ onExploreTools }: { onExploreTools: () => void }) {
  const typed = useTypewriter();

  // 3D tilt mascot
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['10deg', '-10deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-10deg', '10deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const heroVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.15 },
    },
  };
  const heroItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
  };

  return (
    <header
      className="relative overflow-hidden"
      aria-label="Hero"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, rgba(192,152,88,0.08), transparent 50%),' +
          'radial-gradient(circle at 100% 100%, rgba(30,94,62,0.08), transparent 50%),' +
          'var(--smuggler-bg)',
      }}
    >
      {/* Noise texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      <div className="relative mx-auto flex min-h-[92vh] w-full max-w-[1400px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-8 lg:flex-row lg:gap-8 lg:px-16 lg:pb-28 lg:pt-20">
        {/* LEFT column */}
        <motion.div
          className="flex flex-1 flex-col justify-center"
          style={{ maxWidth: '680px' }}
          variants={heroVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Gold badge pill */}
          <motion.div
            variants={heroItem}
            className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{
              color: 'var(--smuggler-gold)',
              borderColor: 'rgba(192, 152, 88, 0.3)',
              backgroundColor: 'rgba(192, 152, 88, 0.06)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            <Star size={12} className="fill-current" aria-hidden="true" />
            THE ALL-IN-ONE CREATOR TOOLKIT
          </motion.div>

          {/* H1 + typewriter */}
          <motion.h1
            variants={heroItem}
            className="smuggler-hero-title-shadow"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.05,
              fontWeight: 800,
              color: 'var(--smuggler-text)',
              marginBottom: '0.5rem',
            }}
          >
            Create Legendary Content.
          </motion.h1>

          {/* Cycling typewriter line */}
          <motion.div
            variants={heroItem}
            className="mb-7 flex items-baseline"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.05,
              fontWeight: 800,
              color: 'var(--smuggler-green)',
              minHeight: '1.1em',
            }}
          >
            <span>{typed}</span>
            <span
              className="smuggler-caret-blink"
              style={{ color: 'var(--smuggler-green)' }}
              aria-hidden="true"
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            variants={heroItem}
            className="mb-9 max-w-[520px]"
            style={{
              color: 'var(--smuggler-text-secondary)',
              fontSize: '1.1rem',
              lineHeight: 1.65,
            }}
          >
            AI-powered tools to ideate, create, optimize, and grow your content.
            Everything you need. One top-secret location.
          </motion.p>

          {/* CTA row */}
          <motion.div
            variants={heroItem}
            className="mb-9 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={onExploreTools}
              className="smuggler-cta-premium"
            >
              Explore All Tools
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onExploreTools}
              className="smuggler-cta-outline"
              aria-label="See how Content Smuggler works"
            >
              <PlayCircle size={20} aria-hidden="true" />
              See How It Works
            </button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={heroItem}
            className="mb-9 flex flex-wrap items-center gap-4"
          >
            <div className="flex" aria-hidden="true">
              {HERO_AVATARS.map((imgId, idx) => (
                <img
                  key={imgId}
                  src={`https://i.pravatar.cc/100?img=${imgId}`}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className="h-8 w-8 rounded-full object-cover"
                  style={{
                    marginLeft: idx === 0 ? 0 : '-10px',
                    border: '2px solid var(--smuggler-bg)',
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col">
              <div className="mb-0.5 flex gap-0.5" aria-label="5 out of 5 stars">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star
                    key={i}
                    size={13}
                    className="fill-current"
                    style={{ color: 'var(--smuggler-gold)' }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--smuggler-text-secondary)',
                }}
              >
                Loved by 10,000+ Creators
              </span>
            </div>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            variants={heroItem}
            className="flex flex-wrap gap-x-6 gap-y-3"
          >
            {FEATURE_PILLS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{
                  borderColor: 'var(--smuggler-border)',
                  backgroundColor: 'var(--smuggler-bg-panel)',
                }}
              >
                <Icon
                  size={14}
                  style={{ color: 'var(--smuggler-green)' }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--smuggler-text)',
                    letterSpacing: '0.3px',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* RIGHT column - 3D tilt mascot */}
        <div
          className="relative hidden flex-1 lg:block"
          style={{ perspective: '1200px' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-hidden="true"
        >
          <motion.div
            ref={ref}
            className="relative h-[560px] w-full"
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Mission Brief document */}
            <div
              className="smuggler-paper absolute"
              style={{
                top: '20px',
                right: '40px',
                width: '260px',
                padding: '1.5rem',
                transform: 'translateZ(20px) rotate(-4deg)',
                zIndex: 3,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '20px',
                  transform: 'rotate(45deg)',
                  color: '#555',
                }}
              >
                <Paperclip size={28} strokeWidth={2} aria-hidden="true" />
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  borderBottom: '1px dashed #1A120D',
                  paddingBottom: '6px',
                  marginBottom: '12px',
                }}
              >
                MISSION BRIEF
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '24px',
                  lineHeight: 1.1,
                  color: '#1A120D',
                }}
              >
                YOUR CONTENT.
                <br />
                OUR MISSION.
                <br />
                MAX IMPACT.
              </h3>
              <div
                className="smuggler-stamp-secret"
                style={{
                  position: 'absolute',
                  bottom: '-10px',
                  right: '-10px',
                }}
              >
                TOP SECRET
              </div>
            </div>

            {/* Objectives document */}
            <div
              className="smuggler-paper absolute"
              style={{
                top: '170px',
                right: '120px',
                width: '220px',
                padding: '1.5rem',
                transform: 'translateZ(10px) rotate(2deg)',
                zIndex: 4,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  borderBottom: '1px dashed #1A120D',
                  paddingBottom: '6px',
                  marginBottom: '12px',
                }}
              >
                OBJECTIVES
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  fontSize: '13px',
                  lineHeight: 1.8,
                  fontWeight: 500,
                  color: '#1A120D',
                }}
              >
                {['More Views', 'More Engagement', 'More Revenue'].map((item) => (
                  <li
                    key={item}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <CheckSquare
                      size={14}
                      className="fill-current"
                      style={{ color: '#213A28' }}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '20px',
                  marginTop: '1.5rem',
                  opacity: 0.7,
                  color: '#1A120D',
                }}
              >
                Content Smuggler
              </div>
            </div>

            {/* Classified doc */}
            <div
              className="smuggler-paper absolute flex items-center justify-center"
              style={{
                top: '280px',
                right: '-10px',
                width: '180px',
                height: '140px',
                padding: '1rem',
                transform: 'translateZ(15px) rotate(-8deg)',
                zIndex: 2,
                backgroundColor: '#D3C1A1',
              }}
            >
              <div className="smuggler-stamp-classified">
                CLASSIFIED
                <br />
                <span style={{ fontSize: '8px' }}>HANDLE WITH CARE</span>
              </div>
            </div>

            {/* Wax seal */}
            <div
              className="smuggler-wax-seal absolute"
              style={{
                bottom: '20px',
                right: '90px',
                width: '50px',
                height: '50px',
                transform: 'translateZ(40px)',
                zIndex: 5,
                fontSize: '24px',
              }}
              aria-label="Wax seal stamped with letter C"
            >
              C
            </div>

            {/* Floating mascot — mix-blend-mode multiply removes the white background on light theme */}
            <motion.img
              src="/smuggler/assets/mascot-5.png"
              alt="Content Smuggler AI spy mascot"
              style={{
                position: 'absolute',
                left: '-160px',
                top: '-20px',
                width: '520px',
                height: '520px',
                objectFit: 'contain',
                zIndex: 10,
                transform: 'translateZ(80px)',
                filter: 'drop-shadow(0px 12px 24px rgba(0,0,0,0.18))',
                pointerEvents: 'none',
                mixBlendMode: 'multiply',
              }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </div>
    </header>
  );
}

// =====================================================================
// 2. TRUSTED BY SECTION — continuously scrolling marquee
// =====================================================================

const TRUSTED_PLATFORMS: Array<{ name: string; icon: typeof Youtube }> = [
  { name: 'YouTube', icon: Youtube },
  { name: 'LinkedIn', icon: Linkedin },
  { name: 'Twitter / X', icon: Twitter },
  { name: 'Instagram', icon: Instagram },
  { name: 'Facebook', icon: Facebook },
  { name: 'Twitch', icon: Twitch },
  { name: 'GitHub', icon: Github },
  { name: 'Substack', icon: Rss },
];

function TrustedBySection() {
  // Duplicate the list so the marquee loops seamlessly
  const loop = [...TRUSTED_PLATFORMS, ...TRUSTED_PLATFORMS];
  return (
    <Section ariaLabel="Trusted by creators worldwide">
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="flex flex-col items-center gap-8"
      >
        <motion.p
          variants={sectionItem}
          className="text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '3px',
            color: 'var(--smuggler-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Trusted by creators worldwide
        </motion.p>

        {/* Scrolling marquee */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <motion.div
            className="flex w-max items-center gap-12"
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {loop.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={`${p.name}-${i}`}
                  className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-100"
                  style={{ opacity: 0.65 }}
                >
                  <Icon
                    size={26}
                    strokeWidth={1.5}
                    style={{ color: 'var(--smuggler-text-secondary)' }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      color: 'var(--smuggler-text-secondary)',
                    }}
                  >
                    {p.name}
                  </span>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          variants={sectionItem}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <div className="flex gap-0.5" aria-label="4.9 out of 5 stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                size={16}
                className="fill-current"
                style={{ color: 'var(--smuggler-gold)' }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--smuggler-text)',
            }}
          >
            4.9/5
          </span>
          <span
            style={{
              fontSize: '14px',
              color: 'var(--smuggler-text-muted)',
            }}
          >
            — from 2,000+ reviews
          </span>
        </motion.div>
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 3. STATISTICS SECTION
// =====================================================================

interface StatItem {
  icon: LucideIcon;
  iconColor: string;
  value: number;
  suffix?: string;
  decimals?: number;
  label: string;
}

const STATS: StatItem[] = [
  { icon: Wrench, iconColor: 'var(--smuggler-gold)', value: 95, suffix: '+', label: 'Tools Available' },
  { icon: Sparkles, iconColor: 'var(--smuggler-green)', value: 2.4, suffix: 'M+', decimals: 1, label: 'AI Generations' },
  { icon: Users, iconColor: 'var(--smuggler-blue)', value: 10000, suffix: '+', label: 'Happy Creators' },
  { icon: TrendingUp, iconColor: 'var(--smuggler-orange)', value: 50, suffix: 'K+', label: 'Hours Saved' },
];

function StatsSection() {
  return (
    <Section ariaLabel="Content Smuggler by the numbers">
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STATS.map(({ icon: Icon, iconColor, value, suffix, decimals, label }) => (
          <motion.div
            key={label}
            variants={sectionItem}
            whileHover={{ y: -4 }}
            className="flex flex-col items-start gap-3 rounded-2xl border p-6"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(192, 152, 88, 0.08)',
                border: '1px solid rgba(192, 152, 88, 0.2)',
              }}
            >
              <Icon size={18} style={{ color: iconColor }} aria-hidden="true" />
            </div>
            <Counter
              value={value}
              suffix={suffix}
              decimals={decimals}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.5rem',
                fontWeight: 800,
                lineHeight: 1,
                color: 'var(--smuggler-text)',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                color: 'var(--smuggler-text-muted)',
                letterSpacing: '0.3px',
              }}
            >
              {label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 4. WHY CONTENT SMUGGLER SECTION
// =====================================================================

const WHY_FEATURES: {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
}[] = [
  {
    icon: Brain,
    iconColor: 'var(--smuggler-green)',
    title: 'AI-Powered Intelligence',
    description:
      'Every tool is supercharged with AI trained on millions of viral posts. Get output that doesn\u2019t just sound right \u2014 it performs.',
  },
  {
    icon: Wrench,
    iconColor: 'var(--smuggler-gold)',
    title: `${TOOL_COUNT}+ Premium Tools`,
    description:
      'From hooks to SEO to analytics to contracts \u2014 every tool a modern creator needs, under one roof. No more juggling 12 subscriptions.',
  },
  {
    icon: Heart,
    iconColor: 'var(--smuggler-red)',
    title: 'Creator-First Design',
    description:
      'Built by creators, for creators. Every pixel, every workflow, every shortcut is designed to save you time and multiply your output.',
  },
];

function WhyContentSmugglerSection() {
  return (
    <Section ariaLabel="Why Content Smuggler">
      <SectionHeader
        eyebrow="Why Content Smuggler"
        title="The unfair advantage serious creators rely on"
        subtitle="Three pillars that turn content creation from a grind into a system."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {WHY_FEATURES.map(({ icon: Icon, iconColor, title, description }) => (
          <motion.div
            key={title}
            variants={sectionItem}
            whileHover={{ y: -6 }}
            className="group relative overflow-hidden rounded-2xl border p-7 transition-colors"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(192, 152, 88, 0.5)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--smuggler-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(192, 152, 88, 0.08)',
                border: '1px solid rgba(192, 152, 88, 0.2)',
              }}
            >
              <Icon size={26} style={{ color: iconColor }} aria-hidden="true" />
            </div>
            <h3
              className="mb-3"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--smuggler-text)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: 'var(--smuggler-text-secondary)',
              }}
            >
              {description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 5. FEATURE HIGHLIGHTS SECTION
// =====================================================================

interface FeatureHighlight {
  title: string;
  description: string;
  icon: LucideIcon;
  bulletPoints: string[];
  visual: ReactNode;
}

function HookGeneratorVisual() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: 'var(--smuggler-border)',
        backgroundColor: 'var(--smuggler-bg-panel)',
      }}
    >
      <div
        className="mb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--smuggler-border)', paddingBottom: '12px' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            color: 'var(--smuggler-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Hook Generator
        </span>
        <span
          className="rounded-full px-2 py-0.5"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--smuggler-green)',
            backgroundColor: 'rgba(30, 94, 62, 0.1)',
          }}
        >
          LIVE
        </span>
      </div>
      {[
        { text: 'The AI tool that will save you 10 hours a week (and it\u2019s free).', score: 94 },
        { text: 'Stop doing content research manually. Do THIS instead.', score: 91 },
        { text: 'Why 99% of content fails (and how to be in the 1%).', score: 88 },
      ].map((hook, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ delay: 0.1 * idx, duration: 0.5 }}
          className="mb-3 flex items-start gap-3 rounded-lg border p-3"
          style={{
            borderColor: 'var(--smuggler-border)',
            backgroundColor: 'var(--smuggler-bg)',
          }}
        >
          <span
            className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              color: 'var(--smuggler-gold)',
              backgroundColor: 'rgba(192, 152, 88, 0.12)',
              border: '1px solid rgba(192, 152, 88, 0.3)',
            }}
          >
            {hook.score}
          </span>
          <p
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--smuggler-text)',
            }}
          >
            {hook.text}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function RepurposeEngineVisual() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: 'var(--smuggler-border)',
        backgroundColor: 'var(--smuggler-bg-panel)',
      }}
    >
      <div
        className="mb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--smuggler-border)', paddingBottom: '12px' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            color: 'var(--smuggler-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Repurpose Engine
        </span>
        <span
          className="rounded-full px-2 py-0.5"
          style={{
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--smuggler-gold)',
            backgroundColor: 'rgba(192, 152, 88, 0.12)',
          }}
        >
          6 ASSETS
        </span>
      </div>
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3"
          style={{
            borderColor: 'var(--smuggler-green)',
            backgroundColor: 'rgba(30, 94, 62, 0.08)',
          }}
        >
          <PlayCircle size={18} style={{ color: 'var(--smuggler-green)' }} aria-hidden="true" />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--smuggler-text)',
            }}
          >
            youtube.com/watch?v=8h2k...
          </span>
        </div>
        <div className="flex items-center gap-1" aria-hidden="true">
          <ArrowRight size={14} style={{ color: 'var(--smuggler-text-muted)' }} />
          <ArrowRight size={14} style={{ color: 'var(--smuggler-text-muted)' }} />
          <ArrowRight size={14} style={{ color: 'var(--smuggler-text-muted)' }} />
        </div>
        <div className="grid w-full grid-cols-3 gap-2">
          {[
            { icon: PenLine, label: 'Blog' },
            { icon: Share2, label: 'Thread' },
            { icon: Megaphone, label: 'LinkedIn' },
            { icon: Mail, label: 'Newsletter' },
            { icon: BarChart3, label: 'Carousel' },
            { icon: Zap, label: 'Shorts' },
          ].map(({ icon: Icon, label }, idx) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewportOnce}
              transition={{ delay: 0.08 * idx, duration: 0.4 }}
              className="flex flex-col items-center gap-1.5 rounded-lg border p-3"
              style={{
                borderColor: 'var(--smuggler-border)',
                backgroundColor: 'var(--smuggler-bg)',
              }}
            >
              <Icon size={18} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--smuggler-text-secondary)',
                }}
              >
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIWriterVisual() {
  const phrases = [
    'The future of content is',
    'The future of content is collaboration.',
    'The future of content is collaboration, not',
    'The future of content is collaboration, not automation.',
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setPhraseIdx((i) => (i + 1) % phrases.length), 1100);
    return () => clearTimeout(t);
  }, [phraseIdx]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6"
      style={{
        borderColor: 'var(--smuggler-border)',
        backgroundColor: 'var(--smuggler-bg-panel)',
      }}
    >
      <div
        className="mb-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--smuggler-border)', paddingBottom: '12px' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            color: 'var(--smuggler-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          AI Writer
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--smuggler-red)' }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--smuggler-gold)' }} />
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--smuggler-green)' }} />
        </div>
      </div>
      <div className="space-y-2">
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            lineHeight: 1.5,
            color: 'var(--smuggler-text)',
            minHeight: '4.5em',
          }}
        >
          {phrases[phraseIdx]}
          <span
            className="smuggler-caret-blink"
            style={{ color: 'var(--smuggler-green)' }}
            aria-hidden="true"
          />
        </p>
        <div
          className="mt-4 flex items-center gap-2 rounded-lg border p-2.5"
          style={{
            borderColor: 'var(--smuggler-border)',
            backgroundColor: 'var(--smuggler-bg)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
          <span style={{ fontSize: '12px', color: 'var(--smuggler-text-muted)' }}>
            Tone: Professional, yet conversational
          </span>
        </div>
      </div>
    </div>
  );
}

const FEATURE_HIGHLIGHTS: FeatureHighlight[] = [
  {
    icon: Zap,
    title: 'Hook Generator',
    description:
      'Generate scroll-stopping hooks in any tone, for any platform. Stop staring at a blank page \u2014 start with 5 AI-scored options in seconds.',
    bulletPoints: [
      'AI-scored for virality (0\u2013100)',
      'Tuned per platform \u2014 YouTube, LinkedIn, TikTok',
      '5 variations in under 3 seconds',
    ],
    visual: <HookGeneratorVisual />,
  },
  {
    icon: Share2,
    title: 'Repurpose Engine',
    description:
      'Turn one piece of content into ten. Drop a YouTube URL, get a Twitter thread, LinkedIn post, blog outline, newsletter section, and carousel \u2014 instantly.',
    bulletPoints: [
      'One source \u2192 six platform-ready assets',
      'Preserves your unique voice across formats',
      'Cuts content creation time by 80%',
    ],
    visual: <RepurposeEngineVisual />,
  },
  {
    icon: PenLine,
    title: 'AI Writer',
    description:
      'Write blogs, scripts, captions, and emails that sound like you, not like a robot. Built-in humanizer makes every word feel authentic.',
    bulletPoints: [
      '12 tone presets + custom brand voice',
      'One-click humanizer for natural flow',
      'Grammar + clarity + SEO checks built in',
    ],
    visual: <AIWriterVisual />,
  },
];

function FeatureHighlightsSection() {
  return (
    <Section ariaLabel="Feature highlights">
      <SectionHeader
        eyebrow="Feature Highlights"
        title="Three tools that pay for themselves"
        subtitle="The fastest way to understand why creators switch to Content Smuggler and never look back."
      />
      <div className="flex flex-col gap-20">
        {FEATURE_HIGHLIGHTS.map((feature, idx) => {
          const isReverse = idx % 2 === 1;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              {/* Text column */}
              <div
                className={`flex flex-col gap-5 ${
                  isReverse ? 'lg:order-2' : 'lg:order-1'
                }`}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: 'rgba(192, 152, 88, 0.1)',
                    border: '1px solid rgba(192, 152, 88, 0.25)',
                  }}
                >
                  <feature.icon size={22} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'clamp(1.6rem, 3vw, 2.1rem)',
                    fontWeight: 700,
                    color: 'var(--smuggler-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: '1.05rem',
                    lineHeight: 1.65,
                    color: 'var(--smuggler-text-secondary)',
                  }}
                >
                  {feature.description}
                </p>
                <ul className="flex flex-col gap-2">
                  {feature.bulletPoints.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <Check
                        size={16}
                        className="mt-1 flex-shrink-0"
                        style={{ color: 'var(--smuggler-green)' }}
                        aria-hidden="true"
                      />
                      <span
                        style={{
                          fontSize: '0.95rem',
                          color: 'var(--smuggler-text)',
                        }}
                      >
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Visual column */}
              <div className={isReverse ? 'lg:order-1' : 'lg:order-2'}>
                {feature.visual}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Section>
  );
}

// =====================================================================
// 6. POPULAR CREATOR TOOLS SECTION
// =====================================================================

function PopularToolCard({
  tool,
  index,
  onSelect,
}: {
  tool: SmugglerTool;
  index: number;
  onSelect: (id: string) => void;
}) {
  const Icon = tool.icon;
  const ref = useRef<HTMLButtonElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 25, stiffness: 300 });
  const smoothY = useSpring(mouseY, { damping: 25, stiffness: 300 });
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8]);
  const background = useMotionTemplate`radial-gradient(400px circle at ${useTransform(smoothX, (v) => (v + 0.5) * 100)}% ${useTransform(smoothY, (v) => (v + 0.5) * 100)}%, rgba(255,255,255,0.7), transparent 45%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => onSelect(tool.id)}
      variants={sectionItem}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      whileHover={{ y: -6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
      }}
      className="smuggler-hook-card group relative flex h-full min-h-[240px] flex-col cursor-pointer items-start gap-3 overflow-hidden rounded-2xl p-6 text-left"
      aria-label={`Launch ${tool.name}`}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />
      {/* Gold border glow on hover */}
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl border border-transparent transition-colors duration-300 group-hover:border-[var(--smuggler-gold)]/40" />

      <div className="relative z-10 flex w-full items-start justify-between">
        <motion.div
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:-translate-y-1"
          style={{ backgroundColor: tool.bgColor, color: tool.color }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Icon size={22} className="fill-current" aria-hidden="true" />
        </motion.div>
        {tool.isPopular && (
          <span className="rounded-md bg-[var(--smuggler-gold)]/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-[var(--smuggler-gold)]">
            Popular
          </span>
        )}
      </div>

      <div className="relative z-10 flex w-full flex-col gap-1.5">
        <h3
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--smuggler-text)',
          }}
        >
          {tool.name}
        </h3>
        <p
          className="line-clamp-2"
          style={{
            fontSize: '13px',
            lineHeight: 1.5,
            color: 'var(--smuggler-text-secondary)',
          }}
        >
          {tool.desc}
        </p>
      </div>

      <div className="relative z-10 mt-auto flex w-full items-center justify-between border-t border-[var(--smuggler-border)]/40 pt-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--smuggler-text-muted)' }}>
          <Users size={13} aria-hidden="true" />
          <span>{tool.uses} uses</span>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--smuggler-border)]/40 text-[var(--smuggler-text-muted)] transition-all duration-300 group-hover:bg-[var(--smuggler-accent-green)] group-hover:text-white"
        >
          <ArrowRight
            size={14}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </div>
      </div>
    </motion.button>
  );
}

function PopularToolsSection({
  onSelectTool,
  onExploreTools,
}: {
  onSelectTool: (id: string) => void;
  onExploreTools: () => void;
}) {
  return (
    <Section ariaLabel="Popular creator tools">
      <SectionHeader
        eyebrow="Most Loved"
        title="Popular creator tools"
        subtitle="The tools our 10,000+ creators reach for every single day. Each one is a launchpad for your next piece of legendary content."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {POPULAR_TOOLS.map((tool, i) => (
          <PopularToolCard key={tool.id} tool={tool} index={i} onSelect={onSelectTool} />
        ))}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-10 flex justify-center"
      >
        <button
          type="button"
          onClick={onExploreTools}
          className="smuggler-cta-gold"
        >
          View All {TOOL_COUNT} Tools
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 7. CREATOR WORKFLOW SECTION
// =====================================================================

const WORKFLOW_STEPS: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: PenLine,
    title: 'Describe',
    description: 'Tell our AI what you want to create. The more context you give, the better the output.',
  },
  {
    icon: Sparkles,
    title: 'Generate',
    description: 'Get high-quality drafts, hooks, titles, scripts, and more in seconds.',
  },
  {
    icon: BarChart3,
    title: 'Analyze',
    description: 'Score your content against proven engagement frameworks before you publish.',
  },
  {
    icon: Share2,
    title: 'Publish',
    description: 'Export anywhere \u2014 YouTube, LinkedIn, Twitter, your blog, your newsletter.',
  },
];

function WorkflowSection() {
  return (
    <Section ariaLabel="Creator workflow" className="relative">
      <SectionHeader
        eyebrow="The Workflow"
        title="From idea to publish in four steps"
        subtitle="A repeatable system that turns scattered creative energy into consistent, high-performing content."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Connecting line (desktop only) */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-8 hidden h-0.5 lg:block"
          style={{
            background:
              'linear-gradient(90deg, var(--smuggler-green) 0%, var(--smuggler-gold) 100%)',
            opacity: 0.4,
          }}
        />
        {WORKFLOW_STEPS.map(({ icon: Icon, title, description }, idx) => (
          <motion.div
            key={title}
            variants={sectionItem}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--smuggler-bg-panel)',
                border: '2px solid var(--smuggler-gold)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              }}
            >
              <Icon size={24} style={{ color: 'var(--smuggler-green)' }} aria-hidden="true" />
            </div>
            <span
              className="mb-2 text-xs font-bold"
              style={{
                color: 'var(--smuggler-gold)',
                letterSpacing: '2px',
              }}
            >
              STEP {String(idx + 1).padStart(2, '0')}
            </span>
            <h3
              className="mb-2"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--smuggler-text)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '0.92rem',
                lineHeight: 1.6,
                color: 'var(--smuggler-text-secondary)',
                maxWidth: '240px',
              }}
            >
              {description}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 8. AI FEATURES SECTION
// =====================================================================

const AI_FEATURES: {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    icon: Target,
    title: 'Smart Scoring',
    description:
      'Every output gets a performance score before you publish. Know what\u2019ll work before it goes live.',
    color: 'var(--smuggler-green)',
  },
  {
    icon: Share2,
    title: 'Multi-Platform',
    description:
      'Optimized for YouTube, LinkedIn, Twitter, Instagram, TikTok, and more. One source, ten formats.',
    color: 'var(--smuggler-gold)',
  },
  {
    icon: Zap,
    title: 'Real-Time Analysis',
    description:
      'Live trend detection, engagement prediction, and content gap analysis \u2014 updated every hour.',
    color: 'var(--smuggler-blue)',
  },
];

function AIFeaturesSection() {
  return (
    <Section ariaLabel="AI features">
      <SectionHeader
        eyebrow="AI That Actually Works"
        title="Built on intelligence, not just templates"
        subtitle="Our AI is trained on millions of high-performing pieces of content. It doesn\u2019t just write \u2014 it thinks."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {AI_FEATURES.map(({ icon: Icon, title, description, color }) => (
          <motion.div
            key={title}
            variants={sectionItem}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border p-7 text-center"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
            }}
          >
            {/* Glow effect */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-0 -z-0 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              style={{ backgroundColor: color }}
            />
            <div className="relative flex flex-col items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'rgba(192, 152, 88, 0.08)',
                  border: '1px solid rgba(192, 152, 88, 0.25)',
                }}
              >
                <Icon size={28} style={{ color }} aria-hidden="true" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: 'var(--smuggler-text)',
                }}
              >
                {title}
              </h3>
              <p
                style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  color: 'var(--smuggler-text-secondary)',
                }}
              >
                {description}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 9. TOOL CATEGORIES SECTION
// =====================================================================

function ToolCategoriesSection({ onExploreTools }: { onExploreTools: () => void }) {
  return (
    <Section ariaLabel="Tool categories">
      <SectionHeader
        eyebrow="Browse by Category"
        title="Every tool a modern creator needs"
        subtitle={`${TOOL_COUNT}+ premium tools across six categories \u2014 find exactly what you need in seconds.`}
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        {CATEGORY_STATS.map(({ name, count, color, icon: Icon }) => (
          <motion.button
            key={name}
            type="button"
            variants={sectionItem}
            whileHover={{ y: -4 }}
            onClick={onExploreTools}
            className="group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-colors"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(192, 152, 88, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--smuggler-border)';
            }}
            aria-label={`Browse ${name} tools (${count} tools)`}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${color}22`,
                border: `1px solid ${color}44`,
              }}
            >
              <Icon size={20} style={{ color }} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--smuggler-text)',
                }}
              >
                {name}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--smuggler-text-muted)',
                  letterSpacing: '0.5px',
                }}
              >
                {count} TOOLS
              </span>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 10. TESTIMONIALS SECTION
// =====================================================================

interface Testimonial {
  avatar: string;
  name: string;
  role: string;
  quote: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    avatar: 'https://i.pravatar.cc/100?img=47',
    name: 'Maya Chen',
    role: 'YouTuber, 200K subscribers',
    quote:
      'Content Smuggler turned my 1-video-a-week grind into a 5-video-a-week breeze. The Hook Generator alone is worth its weight in gold.',
  },
  {
    avatar: 'https://i.pravatar.cc/100?img=53',
    name: 'Marcus Reid',
    role: 'Newsletter writer, 40K subscribers',
    quote:
      'I cancelled 4 other subscriptions after switching. The Repurpose Engine saved me 12 hours last week alone. It pays for itself.',
  },
  {
    avatar: 'https://i.pravatar.cc/100?img=32',
    name: 'Sofia Almeida',
    role: 'LinkedIn creator, 85K followers',
    quote:
      'From idea to publish in one tab. My engagement is up 3x since I started using the AI Writer daily. This is the unfair advantage.',
  },
];

function TestimonialsSection() {
  return (
    <Section ariaLabel="Creator testimonials">
      <SectionHeader
        eyebrow="From Real Creators"
        title="Loved by creators who ship"
        subtitle="Don\u2019t take our word for it \u2014 take theirs."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 gap-6 md:grid-cols-3"
      >
        {TESTIMONIALS.map((t) => (
          <motion.figure
            key={t.name}
            variants={sectionItem}
            whileHover={{ y: -4 }}
            className="flex flex-col gap-5 rounded-2xl border p-7"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
            }}
          >
            <div className="flex gap-0.5" aria-label="5 out of 5 stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={14}
                  className="fill-current"
                  style={{ color: 'var(--smuggler-gold)' }}
                  aria-hidden="true"
                />
              ))}
            </div>
            <blockquote
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.05rem',
                lineHeight: 1.65,
                color: 'var(--smuggler-text)',
                fontStyle: 'italic',
              }}
            >
              &ldquo;{t.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3">
              <img
                src={t.avatar}
                alt={`Photo of ${t.name}`}
                width={40}
                height={40}
                loading="lazy"
                className="h-10 w-10 rounded-full object-cover"
                style={{ border: '2px solid var(--smuggler-border)' }}
              />
              <div className="flex flex-col">
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--smuggler-text)',
                  }}
                >
                  {t.name}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--smuggler-text-muted)',
                  }}
                >
                  {t.role}
                </span>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 11. PRICING PREVIEW SECTION
// =====================================================================

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'For creators just getting started.',
    features: [
      '5 AI generations per day',
      'Access to 20 essential tools',
      'Basic analytics dashboard',
      'Community support',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Creator',
    price: '$19',
    period: '/mo',
    description: 'For serious creators ready to scale.',
    features: [
      'Unlimited AI generations',
      `Access to all ${TOOL_COUNT}+ tools`,
      'Advanced analytics & scoring',
      'Priority support',
      'Custom brand voice',
    ],
    cta: 'Start 14-Day Trial',
    highlighted: true,
    badge: 'MOST POPULAR',
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    description: 'For teams and full-time creators.',
    features: [
      'Everything in Creator',
      'Team collaboration (5 seats)',
      'API access',
      'White-label reports',
      'Dedicated success manager',
    ],
    cta: 'Go Pro',
  },
];

function PricingSection({ onOpenAuth }: { onOpenAuth: (mode: 'login' | 'signup') => void }) {
  return (
    <Section ariaLabel="Pricing preview">
      <SectionHeader
        eyebrow="Pricing"
        title="Simple pricing. Serious leverage."
        subtitle="Start free, scale when you\u2019re ready. Cancel anytime."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3"
      >
        {PRICING_PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            variants={sectionItem}
            whileHover={{ y: plan.highlighted ? -2 : -6 }}
            className="relative flex flex-col rounded-2xl border p-7"
            style={{
              borderColor: plan.highlighted
                ? 'var(--smuggler-gold)'
                : 'var(--smuggler-border)',
              backgroundColor: 'var(--smuggler-bg-panel)',
              transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
              boxShadow: plan.highlighted
                ? '0 16px 40px rgba(192, 152, 88, 0.18)'
                : '0 4px 16px rgba(0,0,0,0.05)',
              zIndex: plan.highlighted ? 2 : 1,
            }}
          >
            {plan.badge && (
              <span
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: 'var(--smuggler-gold)',
                  color: '#0B0A08',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 12px rgba(192, 152, 88, 0.4)',
                }}
              >
                {plan.badge}
              </span>
            )}
            <div className="mb-5 flex flex-col gap-1">
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--smuggler-text)',
                }}
              >
                {plan.name}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--smuggler-text-muted)',
                }}
              >
                {plan.description}
              </p>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.75rem',
                  fontWeight: 800,
                  color: 'var(--smuggler-text)',
                  lineHeight: 1,
                }}
              >
                {plan.price}
              </span>
              {plan.period && (
                <span
                  style={{
                    fontSize: '14px',
                    color: 'var(--smuggler-text-muted)',
                  }}
                >
                  {plan.period}
                </span>
              )}
            </div>
            <ul className="mb-7 flex flex-1 flex-col gap-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check
                    size={16}
                    className="mt-0.5 flex-shrink-0"
                    style={{ color: 'var(--smuggler-green)' }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: '14px',
                      color: 'var(--smuggler-text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {f}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className={
                plan.highlighted
                  ? 'smuggler-btn smuggler-btn-primary w-full justify-center'
                  : 'smuggler-btn smuggler-btn-secondary w-full justify-center'
              }
            >
              {plan.cta}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 12. FAQ SECTION
// =====================================================================

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Content Smuggler?',
    answer:
      'Content Smuggler is an all-in-one AI-powered toolkit for creators. It bundles 95+ premium tools for writing, SEO, video, social media, repurposing, analytics, planning, business, and AI utilities \u2014 all in one top-secret location.',
  },
  {
    question: 'How does the AI work?',
    answer:
      'Our AI is trained on millions of high-performing pieces of content across every major platform. It analyzes patterns, structures, and psychological triggers that drive engagement, then generates output tailored to your specific audience and goals.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no contracts or lock-ins. Cancel from your dashboard with one click and you\u2019ll keep access until the end of your billing period. No questions, no friction.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use bank-grade 256-bit encryption in transit and at rest. Your content is never sold, shared, or used to train external models. You own everything you generate, full stop.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'Yes \u2014 we offer a 14-day no-questions-asked refund policy on all paid plans. If you\u2019re not delighted within the first two weeks, we\u2019ll refund every cent.',
  },
];

function FaqItemRow({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        borderColor: isOpen ? 'rgba(192, 152, 88, 0.4)' : 'var(--smuggler-border)',
        backgroundColor: 'var(--smuggler-bg-panel)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: 'var(--smuggler-text)',
          }}
        >
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="flex-shrink-0"
        >
          <ChevronDown
            size={18}
            style={{ color: isOpen ? 'var(--smuggler-gold)' : 'var(--smuggler-text-muted)' }}
            aria-hidden="true"
          />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <p
              className="px-5 pb-5"
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.65,
                color: 'var(--smuggler-text-secondary)',
              }}
            >
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <Section ariaLabel="Frequently asked questions">
      <SectionHeader
        eyebrow="FAQ"
        title="Questions, answered"
        subtitle="Everything you need to know before you become a Content Smuggler."
      />
      <motion.div
        variants={sectionContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="mx-auto flex max-w-[760px] flex-col gap-3"
      >
        {FAQ_ITEMS.map((item, idx) => (
          <motion.div key={item.question} variants={sectionItem}>
            <FaqItemRow
              item={item}
              isOpen={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
            />
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

// =====================================================================
// 13. FINAL CTA SECTION
// =====================================================================

function FinalCtaSection({
  onOpenAuth,
  onExploreTools,
}: {
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onExploreTools: () => void;
}) {
  return (
    <section
      aria-label="Get started"
      className="relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--smuggler-forest) 0%, #0B0A08 100%)',
      }}
    >
      {/* Subtle noise overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.25] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ backgroundColor: 'rgba(192, 152, 88, 0.4)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: 'rgba(89, 127, 86, 0.6)' }}
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center gap-10 px-4 py-24 sm:px-8 lg:flex-row lg:px-16 lg:py-32">
        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-1 flex-col items-start gap-6 text-left"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{
              color: 'var(--smuggler-gold)',
              borderColor: 'rgba(192, 152, 88, 0.4)',
              backgroundColor: 'rgba(192, 152, 88, 0.08)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            <Crown size={12} aria-hidden="true" />
            Your Mission Awaits
          </span>
          <h2
            className="smuggler-hero-title-shadow"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#F4EEDF',
              maxWidth: '640px',
            }}
          >
            Ready to Smuggle Your Content to Success?
          </h2>
          <p
            style={{
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(244, 238, 223, 0.78)',
              maxWidth: '520px',
            }}
          >
            Start creating legendary content today. Join 10,000+ creators who\u2019ve already made the switch.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpenAuth('signup')}
              className="smuggler-cta-gold"
            >
              Get Started Free
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onExploreTools}
              className="smuggler-cta-outline"
              style={{
                color: '#F4EEDF',
                borderColor: 'rgba(244, 238, 223, 0.3)',
              }}
            >
              <PlayCircle size={20} aria-hidden="true" />
              Explore Tools
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Check size={14} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
              <span style={{ fontSize: '12px', color: 'rgba(244, 238, 223, 0.65)' }}>
                No credit card required
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
              <span style={{ fontSize: '12px', color: 'rgba(244, 238, 223, 0.65)' }}>
                14-day free trial
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} style={{ color: 'var(--smuggler-gold)' }} aria-hidden="true" />
              <span style={{ fontSize: '12px', color: 'rgba(244, 238, 223, 0.65)' }}>
                Cancel anytime
              </span>
            </div>
          </div>
        </motion.div>

        {/* Mascot */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
          className="relative hidden flex-1 lg:block"
          aria-hidden="true"
        >
          <motion.img
            src="/smuggler/assets/mascot-5.png"
            alt=""
            style={{
              width: '440px',
              height: '440px',
              objectFit: 'contain',
              filter: 'drop-shadow(0px 30px 60px rgba(0,0,0,0.5))',
              marginLeft: 'auto',
              pointerEvents: 'none',
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </section>
  );
}

// =====================================================================
// MAIN HOMEPAGE COMPONENT
// =====================================================================

export function Homepage({ onExploreTools, onSelectTool, onOpenAuth }: HomepageProps) {
  return (
    <main className="w-full" style={{ backgroundColor: 'var(--smuggler-bg)' }}>
      <HeroSection onExploreTools={onExploreTools} />
      <TrustedBySection />
      <StatsSection />
      <WhyContentSmugglerSection />
      <FeatureHighlightsSection />
      <PopularToolsSection onSelectTool={onSelectTool} onExploreTools={onExploreTools} />
      <WorkflowSection />
      <AIFeaturesSection />
      <ToolCategoriesSection onExploreTools={onExploreTools} />
      <TestimonialsSection />
      <PricingSection onOpenAuth={onOpenAuth} />
      <FaqSection />
      <FinalCtaSection onOpenAuth={onOpenAuth} onExploreTools={onExploreTools} />
    </main>
  );
}

export default Homepage;
