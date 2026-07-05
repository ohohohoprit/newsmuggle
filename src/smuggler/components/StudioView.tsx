'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  animate,
  type Variants,
} from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  ShieldCheck,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  DollarSign,
  FileText,
  Sparkles,
  ArrowRight,
  Plus,
  Bell,
  Check,
  X,
  RefreshCw,
  Zap,
  PenLine,
  Target,
  ImageIcon,
  Share2,
  Calendar,
  Crown,
  ChevronDown,
  Trophy,
  Users,
} from 'lucide-react';
import {
  useStudioStore,
  type PlatformId,
  type SocialAccount,
  type StudioGoal,
  type AIInsight,
  type CalendarItem,
  type ContentItem,
  type DemographicData,
  PLATFORM_META,
  formatNumber,
  formatTimeAgo,
} from '@/smuggler/store/useStudioStore';
import BackButton from '@/smuggler/components/BackButton';

/* ============================================================
   Props
   ============================================================ */

export interface StudioViewProps {
  onNavigate: (view: 'home' | 'tools' | 'library') => void;
  onSelectTool: (toolId: string) => void;
}

/* ============================================================
   Constants
   ============================================================ */

type TimeframeKey = '7d' | '28d' | '90d';

const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: '7d', label: '7D' },
  { key: '28d', label: '28D' },
  { key: '90d', label: '90D' },
];

const GOAL_COLORS = [
  '#FF0000',
  '#E1306C',
  '#4C6B4A',
  '#C09858',
  '#3B648C',
  '#624B8B',
  '#C28B5E',
  '#1E5E3E',
];

const QUICK_ACTIONS: {
  toolId?: string;
  label: string;
  desc: string;
  icon: typeof Zap;
  color: string;
}[] = [
  { toolId: 'hook-generator', label: 'Hook Generator', desc: 'Scroll-stopping openers', icon: Zap, color: '#C09858' },
  { toolId: 'ai-writer', label: 'AI Writer', desc: 'Blogs, scripts, captions', icon: PenLine, color: '#4C6B4A' },
  { toolId: 'title-optimizer', label: 'Title Optimizer', desc: 'Click-worthy titles', icon: Target, color: '#3B648C' },
  { toolId: 'thumbnail-analyzer', label: 'Thumbnail Analyzer', desc: 'Boost mobile CTR', icon: ImageIcon, color: '#624B8B' },
  { toolId: 'repurpose-engine', label: 'Repurpose Engine', desc: 'One → ten assets', icon: Share2, color: '#E1306C' },
  { toolId: undefined, label: 'View All Tools', desc: 'Explore the full arsenal', icon: ArrowRight, color: '#C28B5E' },
];

const METRIC_META = [
  { key: 'followers', icon: Users, color: '#4C6B4A', trend: '+12.4%', trendUp: true, label: 'Total Followers' },
  { key: 'views', icon: Eye, color: '#3B648C', trend: '+8.1%', trendUp: true, label: 'Total Views' },
  { key: 'engagement', icon: Heart, color: '#E1306C', trend: '+0.6%', trendUp: true, label: 'Engagement Rate' },
  { key: 'watchtime', icon: Clock, color: '#624B8B', trend: '+3.2%', trendUp: true, label: 'Avg. Watch Time' },
  { key: 'revenue', icon: DollarSign, color: '#C09858', trend: '+18.7%', trendUp: true, label: 'Total Revenue' },
  { key: 'content', icon: FileText, color: '#C28B5E', trend: '+6', trendUp: true, label: 'Content Created' },
] as const;

/* ============================================================
   Animation variants
   ============================================================ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] },
  },
};

/* ============================================================
   AnimatedCounter
   ============================================================ */

function AnimatedCounter({
  to,
  duration = 1.6,
  formatter,
  prefix = '',
  suffix = '',
}: {
  to: number;
  duration?: number;
  formatter: (v: number) => string;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.25, 1, 0.5, 1],
      onUpdate(value) {
        setCount(value);
      },
    });
    return () => controls.stop();
  }, [to, duration, inView]);

  return (
    <span ref={ref}>
      {prefix}
      {formatter(count)}
      {suffix}
    </span>
  );
}

/* ============================================================
   Toast
   ============================================================ */

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const accent =
    toast.type === 'error'
      ? 'var(--smuggler-red)'
      : toast.type === 'info'
      ? 'var(--smuggler-blue)'
      : 'var(--smuggler-green)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="pointer-events-auto fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl"
      style={{
        backgroundColor: 'var(--smuggler-bg-panel)',
        borderColor: 'var(--smuggler-border)',
        minWidth: 240,
        maxWidth: 360,
      }}
    >
      <span
        className="flex h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
      />
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--smuggler-text)' }}
      >
        {toast.message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto shrink-0 rounded p-0.5 transition-colors"
        style={{ color: 'var(--smuggler-text-muted)' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ============================================================
   PlatformIcon — colored circular badge with platform glyph
   ============================================================ */

function PlatformIcon({
  platform,
  size = 40,
}: {
  platform: PlatformId;
  size?: number;
}) {
  const meta = PLATFORM_META[platform];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: meta.color,
        fontSize: size * 0.42,
        boxShadow: `0 4px 12px ${meta.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      aria-hidden
    >
      {meta.icon}
    </span>
  );
}

/* ============================================================
   HealthDot — green/yellow/red status indicator
   ============================================================ */

function HealthDot({ status }: { status: SocialAccount['health'] }) {
  const color =
    status === 'good'
      ? 'var(--smuggler-green)'
      : status === 'warning'
      ? 'var(--smuggler-yellow)'
      : 'var(--smuggler-red)';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      {status}
    </span>
  );
}

/* ============================================================
   SectionHeading — Playfair Display heading with gold divider
   ============================================================ */

function SectionHeading({
  title,
  icon: Icon,
  badge,
  action,
}: {
  title: string;
  icon?: typeof Trophy;
  badge?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--smuggler-gold) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--smuggler-gold) 30%, transparent)',
              color: 'var(--smuggler-gold)',
            }}
          >
            <Icon size={18} />
          </span>
        )}
        <div>
          <h2
            className="smuggler-section-heading text-2xl sm:text-[1.75rem]"
            style={{ color: 'var(--smuggler-text)' }}
          >
            {title}
          </h2>
          <span className="smuggler-title-divider" />
        </div>
        {badge && (
          <span
            className="smuggler-glow ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: 'var(--smuggler-accent-green)',
              color: '#fff',
            }}
          >
            <Sparkles size={10} />
            {badge}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

/* ============================================================
   TimeframeSelector — 7D / 28D / 90D pill toggle
   ============================================================ */

function TimeframeSelector({
  value,
  onChange,
}: {
  value: TimeframeKey;
  onChange: (v: TimeframeKey) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border p-1"
      style={{
        backgroundColor: 'var(--smuggler-bg-panel)',
        borderColor: 'var(--smuggler-border)',
      }}
    >
      {TIMEFRAMES.map((tf) => {
        const active = tf.key === value;
        return (
          <button
            key={tf.key}
            type="button"
            onClick={() => onChange(tf.key)}
            className="relative rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
            style={{
              color: active ? '#fff' : 'var(--smuggler-text-secondary)',
              zIndex: 1,
            }}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="studio-timeframe-pill"
                className="absolute inset-0 -z-10 rounded-full"
                style={{ backgroundColor: 'var(--smuggler-accent-green)' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   NotificationBell — floating bell with dropdown
   ============================================================ */

function NotificationBell({
  activities,
}: {
  activities: ReturnType<typeof useStudioStore.getState>['activities'];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = activities.length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border transition-all"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          borderColor: open ? 'var(--smuggler-gold)' : 'var(--smuggler-border)',
          color: open ? 'var(--smuggler-gold)' : 'var(--smuggler-text-secondary)',
        }}
        aria-label={`Notifications (${count} new)`}
        aria-expanded={open}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[0.6rem] font-bold text-white"
            style={{
              backgroundColor: 'var(--smuggler-red)',
              boxShadow: '0 0 0 2px var(--smuggler-bg-panel)',
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-[340px] max-w-[90vw] overflow-hidden rounded-xl border shadow-2xl"
            style={{
              backgroundColor: 'var(--smuggler-bg-panel)',
              borderColor: 'var(--smuggler-border)',
            }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--smuggler-border)' }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                Notifications
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--smuggler-red) 16%, transparent)',
                  color: 'var(--smuggler-red)',
                }}
              >
                {count} new
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {activities.length === 0 ? (
                <div
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  You&apos;re all caught up.
                </div>
              ) : (
                activities.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-0 hover:bg-[var(--smuggler-panel-hover)]"
                    style={{ borderColor: 'var(--smuggler-border)' }}
                  >
                    <span
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${a.color} 14%, transparent)`,
                        color: a.color,
                      }}
                    >
                      {a.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--smuggler-text)' }}
                      >
                        {a.text}
                      </p>
                      <p
                        className="mt-1 text-[0.65rem]"
                        style={{ color: 'var(--smuggler-text-muted)' }}
                      >
                        {formatTimeAgo(a.time)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   MetricCard — single animated counter card
   ============================================================ */

function MetricCard({
  meta,
  value,
  formatter,
  prefix,
  suffix,
  index,
}: {
  meta: (typeof METRIC_META)[number];
  value: number;
  formatter: (v: number) => string;
  prefix?: string;
  suffix?: string;
  index: number;
}) {
  const Icon = meta.icon;
  return (
    <motion.div
      variants={itemVariants}
      className="smuggler-panel-premium smuggler-paper-grain relative overflow-hidden rounded-2xl p-5"
    >
      {/* glow accent */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${meta.color} 16%, transparent)`,
            color: meta.color,
            border: `1px solid color-mix(in srgb, ${meta.color} 28%, transparent)`,
          }}
        >
          <Icon size={20} />
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold"
          style={{
            backgroundColor: meta.trendUp
              ? 'color-mix(in srgb, var(--smuggler-green) 14%, transparent)'
              : 'color-mix(in srgb, var(--smuggler-red) 14%, transparent)',
            color: meta.trendUp ? 'var(--smuggler-green)' : 'var(--smuggler-red)',
          }}
        >
          <TrendingUp
            size={11}
            style={{ transform: meta.trendUp ? 'none' : 'rotate(180deg)' }}
          />
          {meta.trend}
        </span>
      </div>
      <p
        className="mt-4 text-[0.7rem] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        {meta.label}
      </p>
      <p
        className="mt-1 text-2xl font-extrabold sm:text-[1.85rem]"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--smuggler-text)',
          lineHeight: 1.1,
        }}
      >
        <AnimatedCounter
          to={value}
          formatter={formatter}
          prefix={prefix}
          suffix={suffix}
          duration={1.4 + index * 0.05}
        />
      </p>
    </motion.div>
  );
}

/* ============================================================
   AccountCard — connected / disconnected account
   ============================================================ */

function AccountCard({
  account,
  onConnect,
  onDisconnect,
  onRefresh,
  onToast,
}: {
  account: SocialAccount;
  onConnect: (p: PlatformId) => void;
  onDisconnect: (id: string) => void;
  onRefresh: (id: string) => void;
  onToast: (msg: string, type?: ToastState['type']) => void;
}) {
  const meta = PLATFORM_META[account.platform];
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh(account.id);
    onToast(`Refreshed ${meta.name} data`, 'success');
    setTimeout(() => setRefreshing(false), 900);
  };

  const handleConnect = () => {
    onConnect(account.platform);
    onToast(`Connected to ${meta.name}`, 'success');
  };

  const handleDisconnect = () => {
    onDisconnect(account.id);
    onToast(`Disconnected ${meta.name}`, 'info');
  };

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      className="smuggler-hook-card relative overflow-hidden rounded-2xl p-4"
      style={{ opacity: account.connected ? 1 : 0.85 }}
    >
      {/* left color stripe */}
      <span
        className="absolute left-0 top-0 h-full w-1"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={account.platform} size={44} />
          <div className="min-w-0">
            <p
              className="truncate text-sm font-bold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {meta.name}
            </p>
            {account.connected ? (
              <p
                className="truncate text-xs"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                {account.username}
              </p>
            ) : (
              <p
                className="text-xs italic"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                Not connected
              </p>
            )}
          </div>
        </div>
        {account.connected && <HealthDot status={account.health} />}
      </div>

      {account.connected ? (
        <>
          <div
            className="mt-4 grid grid-cols-3 gap-2 rounded-xl border p-3"
            style={{
              borderColor: 'var(--smuggler-border)',
              backgroundColor: 'color-mix(in srgb, var(--smuggler-bg) 50%, transparent)',
            }}
          >
            <Stat label="Followers" value={formatNumber(account.followers)} />
            <Stat label="Views" value={formatNumber(account.views)} />
            <Stat label="Engage" value={`${account.engagement.toFixed(1)}%`} />
          </div>
          <div
            className="mt-3 flex items-center justify-between text-[0.65rem]"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            <span>
              Last sync: {formatTimeAgo(account.lastSync)}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition-all"
              style={{
                borderColor: 'var(--smuggler-border)',
                color: 'var(--smuggler-text-secondary)',
              }}
            >
              <RefreshCw
                size={12}
                className={refreshing ? 'animate-spin' : ''}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all"
              style={{
                borderColor: 'color-mix(in srgb, var(--smuggler-red) 30%, transparent)',
                color: 'var(--smuggler-red)',
                backgroundColor: 'color-mix(in srgb, var(--smuggler-red) 8%, transparent)',
              }}
            >
              <X size={12} />
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          className="smuggler-cta-premium !px-4 !py-2 !text-xs mt-4 w-full justify-center"
        >
          <Plus size={13} />
          Connect
        </button>
      )}
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p
        className="text-sm font-extrabold"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--smuggler-text)',
        }}
      >
        {value}
      </p>
      <p
        className="mt-0.5 text-[0.6rem] uppercase tracking-wide"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        {label}
      </p>
    </div>
  );
}

/* ============================================================
   PerformanceChart — custom SVG line chart (3 series)
   ============================================================ */

interface ChartSeries {
  key: string;
  label: string;
  color: string;
  data: number[];
}

function buildSeries(timeframe: TimeframeKey): ChartSeries[] {
  // Deterministic pseudo-random series that scales with the timeframe
  const points =
    timeframe === '7d' ? 7 : timeframe === '28d' ? 14 : 12;
  const seedBase = timeframe === '7d' ? 11 : timeframe === '28d' ? 23 : 37;

  function rng(i: number, salt: number) {
    const x = Math.sin((i + 1) * seedBase + salt * 13) * 10000;
    return x - Math.floor(x);
  }

  const views: number[] = [];
  const engage: number[] = [];
  const followers: number[] = [];

  const baseViews = timeframe === '7d' ? 60000 : timeframe === '28d' ? 85000 : 240000;
  const baseFollow = timeframe === '7d' ? 1200 : timeframe === '28d' ? 2800 : 9000;

  for (let i = 0; i < points; i++) {
    views.push(Math.round(baseViews * (0.7 + rng(i, 1) * 0.6) + i * (baseViews * 0.02)));
    engage.push(parseFloat((3.5 + rng(i, 2) * 5).toFixed(2)));
    followers.push(Math.round(baseFollow * (0.6 + rng(i, 3) * 0.9) + i * (baseFollow * 0.05)));
  }

  return [
    { key: 'views', label: 'Views', color: '#3B648C', data: views },
    { key: 'engage', label: 'Engagement %', color: '#E1306C', data: engage },
    { key: 'followers', label: 'Followers', color: '#4C6B4A', data: followers },
  ];
}

function PerformanceChart({ timeframe }: { timeframe: TimeframeKey }) {
  const series = useMemo(() => buildSeries(timeframe), [timeframe]);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const width = 720;
  const height = 280;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 28;

  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const allValues = series.flatMap((s) => s.data);
  const maxRaw = Math.max(...allValues);
  const minRaw = Math.min(...allValues, 0);
  const range = maxRaw - minRaw || 1;

  // Normalize each series independently for visual clarity (we still show actual values in tooltip/legend range)
  function pathFor(data: number[]) {
    const stepX = innerW / Math.max(data.length - 1, 1);
    return data
      .map((v, i) => {
        const x = padL + i * stepX;
        const y = padT + innerH - ((v - minRaw) / range) * innerH;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  // Y-axis gridlines (4)
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => padT + innerH - t * innerH);

  // X-axis labels
  const xLabels =
    timeframe === '7d'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : timeframe === '28d'
      ? ['W1', 'W2', 'W3', 'W4', '', '', '', '', '', '', '', '', '', '']
      : ['M1', 'M2', 'M3', '', '', '', '', '', '', '', '', ''];

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="Performance chart"
      >
        {/* Gridlines */}
        {gridYs.map((y, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={y}
            y2={y}
            stroke="var(--smuggler-border)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
        ))}

        {/* X-axis labels */}
        {series[0].data.map((_, i) => {
          const stepX = innerW / Math.max(series[0].data.length - 1, 1);
          const x = padL + i * stepX;
          const label = xLabels[i] ?? '';
          if (!label) return null;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill="var(--smuggler-text-muted)"
              fontFamily="var(--font-body)"
            >
              {label}
            </text>
          );
        })}

        {/* Area fills + lines */}
        {series.map((s, si) => {
          const path = pathFor(s.data);
          const areaPath = `${path} L${padL + innerW},${padT + innerH} L${padL},${padT + innerH} Z`;
          // length for stroke draw-in
          const approxLen = 1200;
          return (
            <g key={s.key}>
              <defs>
                <linearGradient id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <motion.path
                d={areaPath}
                fill={`url(#grad-${s.key})`}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.8, delay: 0.2 + si * 0.15 }}
              />
              <motion.path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ strokeDashoffset: approxLen, strokeDasharray: approxLen }}
                animate={
                  inView
                    ? { strokeDashoffset: 0 }
                    : { strokeDashoffset: approxLen }
                }
                transition={{ duration: 1.4, delay: 0.2 + si * 0.2, ease: [0.25, 1, 0.5, 1] }}
              />
              {/* Dots */}
              {s.data.map((v, i) => {
                const stepX = innerW / Math.max(s.data.length - 1, 1);
                const x = padL + i * stepX;
                const y = padT + innerH - ((v - minRaw) / range) * innerH;
                return (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={3}
                    fill="var(--smuggler-bg-panel)"
                    stroke={s.color}
                    strokeWidth={2}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.6 + si * 0.15 + i * 0.03 }}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}80` }}
            />
            <span
              className="text-xs font-semibold"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              {s.label}
            </span>
            <span
              className="text-xs font-bold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              {s.key === 'engage'
                ? `${s.data[s.data.length - 1].toFixed(1)}%`
                : formatNumber(s.data[s.data.length - 1])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   InsightCard — AI coach insight
   ============================================================ */

function InsightCard({
  insight,
  onSelectTool,
}: {
  insight: AIInsight;
  onSelectTool: (toolId: string) => void;
}) {
  const borderColor =
    insight.severity === 'success'
      ? 'var(--smuggler-green)'
      : insight.severity === 'warning'
      ? 'var(--smuggler-yellow)'
      : 'var(--smuggler-blue)';

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      className="smuggler-hook-card relative overflow-hidden rounded-2xl p-5"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide"
          style={{
            backgroundColor: `color-mix(in srgb, ${borderColor} 14%, transparent)`,
            color: borderColor,
          }}
        >
          <Sparkles size={10} />
          {insight.severity === 'success' ? 'Opportunity' : 'Action needed'}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--smuggler-gold) 14%, transparent)',
            color: 'var(--smuggler-gold)',
          }}
        >
          <TrendingUp size={10} />
          {insight.expectedImpact}
        </span>
      </div>

      <h3
        className="mt-3 text-base font-bold leading-snug"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
      >
        {insight.title}
      </h3>
      <p
        className="mt-2 text-xs leading-relaxed"
        style={{ color: 'var(--smuggler-text-secondary)' }}
      >
        {insight.description}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div
          className="rounded-lg border p-2.5"
          style={{ borderColor: 'var(--smuggler-border)', backgroundColor: 'color-mix(in srgb, var(--smuggler-bg) 50%, transparent)' }}
        >
          <p
            className="text-[0.6rem] font-bold uppercase tracking-wider"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            Why
          </p>
          <p
            className="mt-1 text-[0.7rem] leading-relaxed"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            {insight.why}
          </p>
        </div>
        <div
          className="rounded-lg border p-2.5"
          style={{ borderColor: 'var(--smuggler-border)', backgroundColor: 'color-mix(in srgb, var(--smuggler-bg) 50%, transparent)' }}
        >
          <p
            className="text-[0.6rem] font-bold uppercase tracking-wider"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            How
          </p>
          <p
            className="mt-1 text-[0.7rem] leading-relaxed"
            style={{ color: 'var(--smuggler-text-secondary)' }}
          >
            {insight.how}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectTool(insight.toolId)}
        className="smuggler-cta-gold !px-3 !py-2 !text-xs mt-4 w-full justify-center"
      >
        <Zap size={12} />
        Try {insight.toolName}
        <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

/* ============================================================
   TopContentRow
   ============================================================ */

type ContentSortKey = 'views' | 'engagement' | 'date';

function TopContentSection({
  items,
}: {
  items: ContentItem[];
}) {
  const [sort, setSort] = useState<ContentSortKey>('views');
  const [open, setOpen] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === 'views') copy.sort((a, b) => b.views - a.views);
    else if (sort === 'engagement') copy.sort((a, b) => b.engagement - a.engagement);
    else copy.sort((a, b) => b.publishedAt - a.publishedAt);
    return copy;
  }, [items, sort]);

  const sortLabels: Record<ContentSortKey, string> = {
    views: 'By Views',
    engagement: 'By Engagement',
    date: 'By Date',
  };

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy size={18} style={{ color: 'var(--smuggler-gold)' }} />
          <h2
            className="smuggler-section-heading text-xl"
            style={{ color: 'var(--smuggler-text)' }}
          >
            Top Performing Content
          </h2>
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--smuggler-bg-panel)',
              borderColor: 'var(--smuggler-border)',
              color: 'var(--smuggler-text-secondary)',
            }}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {sortLabels[sort]}
            <ChevronDown
              size={12}
              className="transition-transform"
              style={{ transform: open ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          <AnimatePresence>
            {open && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setOpen(false)}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border shadow-2xl"
                  style={{
                    backgroundColor: 'var(--smuggler-bg-panel)',
                    borderColor: 'var(--smuggler-border)',
                  }}
                >
                  {(['views', 'engagement', 'date'] as ContentSortKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        setSort(k);
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                      style={{
                        color: k === sort ? 'var(--smuggler-gold)' : 'var(--smuggler-text)',
                      }}
                    >
                      {sortLabels[k]}
                      {k === sort && <Check size={12} />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2"
      >
        {sorted.map((item) => {
          const meta = PLATFORM_META[item.platform];
          const trendColor =
            item.trend === 'up'
              ? 'var(--smuggler-green)'
              : item.trend === 'down'
              ? 'var(--smuggler-red)'
              : 'var(--smuggler-text-muted)';
          return (
            <motion.div
              key={item.id}
              variants={itemVariants}
              whileHover={{ x: 2 }}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors"
              style={{
                borderColor: 'var(--smuggler-border)',
                backgroundColor: 'color-mix(in srgb, var(--smuggler-bg) 40%, transparent)',
              }}
            >
              <PlatformIcon platform={item.platform} size={36} />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  {item.title}
                </p>
                <p
                  className="mt-0.5 text-[0.65rem]"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {meta.name} · {formatTimeAgo(item.publishedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-right">
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: 'var(--smuggler-text)' }}
                  >
                    {formatNumber(item.views)}
                  </p>
                  <p
                    className="text-[0.6rem] uppercase"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    Views
                  </p>
                </div>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{ color: 'var(--smuggler-text)' }}
                  >
                    {item.engagement.toFixed(1)}%
                  </p>
                  <p
                    className="text-[0.6rem] uppercase"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    Engage
                  </p>
                </div>
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${trendColor} 14%, transparent)`,
                    color: trendColor,
                  }}
                  aria-label={`Trend ${item.trend}`}
                >
                  <TrendingUp
                    size={14}
                    style={{
                      transform:
                        item.trend === 'down'
                          ? 'rotate(180deg)'
                          : item.trend === 'stable'
                          ? 'rotate(90deg)'
                          : 'none',
                    }}
                  />
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

/* ============================================================
   CalendarSection — Today's Plan
   ============================================================ */

function CalendarSection({
  items,
  onToggle,
  onNavigate,
}: {
  items: CalendarItem[];
  onToggle: (id: string) => void;
  onNavigate: (view: 'home' | 'tools' | 'library') => void;
}) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.section
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Calendar size={18} style={{ color: 'var(--smuggler-gold)' }} />
          <div>
            <h2
              className="smuggler-section-heading text-xl"
              style={{ color: 'var(--smuggler-text)' }}
            >
              Today&apos;s Plan
            </h2>
            <p
              className="text-[0.65rem]"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              {today}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('tools')}
          className="flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: 'var(--smuggler-gold)' }}
        >
          View Calendar
          <ArrowRight size={12} />
        </button>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-2"
      >
        {items.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-6 text-center text-xs"
            style={{
              borderColor: 'var(--smuggler-border)',
              color: 'var(--smuggler-text-muted)',
            }}
          >
            Nothing scheduled for today. Enjoy the breather.
          </div>
        )}
        {items.map((item) => {
          const meta = PLATFORM_META[item.platform];
          const isDone = item.status === 'done';
          const isMissed = item.status === 'missed';
          const accent = isMissed ? 'var(--smuggler-red)' : isDone ? 'var(--smuggler-green)' : 'var(--smuggler-gold)';
          return (
            <motion.button
              key={item.id}
              variants={itemVariants}
              type="button"
              onClick={() => onToggle(item.id)}
              className="group flex items-center gap-3 rounded-xl border p-3 text-left transition-all"
              style={{
                borderColor: isMissed
                  ? 'color-mix(in srgb, var(--smuggler-red) 30%, transparent)'
                  : 'var(--smuggler-border)',
                backgroundColor: isDone
                  ? 'color-mix(in srgb, var(--smuggler-green) 8%, transparent)'
                  : 'color-mix(in srgb, var(--smuggler-bg) 40%, transparent)',
                opacity: isMissed ? 0.7 : 1,
              }}
            >
              {/* Checkbox */}
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all"
                style={{
                  borderColor: accent,
                  backgroundColor: isDone ? accent : 'transparent',
                }}
              >
                {isDone && <Check size={14} color="#fff" strokeWidth={3} />}
                {isMissed && <X size={12} color="var(--smuggler-red)" strokeWidth={3} />}
              </span>

              <PlatformIcon platform={item.platform} size={28} />

              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold"
                  style={{
                    color: 'var(--smuggler-text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                    opacity: isDone ? 0.6 : 1,
                  }}
                >
                  {item.title}
                </p>
                <p
                  className="text-[0.65rem]"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {meta.name}
                </p>
              </div>

              <span
                className="shrink-0 text-xs font-bold"
                style={{ color: accent }}
              >
                {item.time}
              </span>
            </motion.button>
          );
        })}
      </motion.div>
    </motion.section>
  );
}

/* ============================================================
   Demographics — 3 mini charts
   ============================================================ */

function HBarChart({
  data,
  label,
}: {
  data: DemographicData[];
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div ref={ref} className="flex flex-col">
      <p
        className="mb-3 text-[0.7rem] font-bold uppercase tracking-wider"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        {label}
      </p>
      <div className="flex flex-col gap-2.5">
        {data.map((d, i) => (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-[0.7rem]">
              <span
                className="font-semibold"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                {d.label}
              </span>
              <span
                className="font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {d.value}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--smuggler-border) 60%, transparent)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${(d.value / max) * 100}%` } : { width: 0 }}
                transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: [0.25, 1, 0.5, 1] }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${d.color}, color-mix(in srgb, ${d.color} 70%, #fff))`,
                  boxShadow: `0 0 8px ${d.color}55`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrafficDonut({ data }: { data: DemographicData[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;

  interface DonutSeg {
    color: string;
    label: string;
    value: number;
    dasharray: string;
    dashoffset: number;
  }
  const segments = data.reduce<DonutSeg[]>((acc, d) => {
    const len = (d.value / total) * circumference;
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].dashoffset : 0;
    const seg: DonutSeg = {
      color: d.color,
      label: d.label,
      value: d.value,
      dasharray: `${len} ${circumference - len}`,
      dashoffset: prevOffset - len,
    };
    return [...acc, seg];
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center">
      <p
        className="mb-3 self-start text-[0.7rem] font-bold uppercase tracking-wider"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        Traffic Sources
      </p>
      <div className="relative">
        <svg width={160} height={160} viewBox="0 0 160 160">
          <circle
            cx={80}
            cy={80}
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--smuggler-border) 50%, transparent)"
            strokeWidth={stroke}
          />
          {segments.map((s, i) => (
            <motion.circle
              key={s.label}
              cx={80}
              cy={80}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={s.dasharray}
              initial={{ strokeDashoffset: circumference }}
              animate={inView ? { strokeDashoffset: s.dashoffset } : { strokeDashoffset: circumference }}
              transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease: [0.25, 1, 0.5, 1] }}
              transform="rotate(-90 80 80)"
              style={{ filter: `drop-shadow(0 0 4px ${s.color}55)` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-extrabold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
          >
            {total}%
          </span>
          <span
            className="text-[0.6rem] uppercase"
            style={{ color: 'var(--smuggler-text-muted)' }}
          >
            Tracked
          </span>
        </div>
      </div>
      <div className="mt-4 grid w-full grid-cols-2 gap-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[0.65rem]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span style={{ color: 'var(--smuggler-text-secondary)' }}>{d.label}</span>
            <span className="ml-auto font-bold" style={{ color: 'var(--smuggler-text)' }}>
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   GoalCard
   ============================================================ */

function GoalCard({
  goal,
  onDelete,
}: {
  goal: StudioGoal;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const isComplete = goal.current >= goal.target;

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3 }}
      ref={ref}
      className="smuggler-hook-card relative overflow-hidden rounded-2xl p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `color-mix(in srgb, ${goal.color} 16%, transparent)`,
              color: goal.color,
            }}
          >
            <Target size={16} />
          </span>
          {isComplete && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--smuggler-green) 16%, transparent)',
                color: 'var(--smuggler-green)',
              }}
            >
              <Check size={9} />
              Done
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--smuggler-text-muted)' }}
          aria-label="Delete goal"
        >
          <X size={14} />
        </button>
      </div>

      <h3
        className="mt-3 text-sm font-bold leading-snug"
        style={{ color: 'var(--smuggler-text)' }}
      >
        {goal.title}
      </h3>

      <div className="mt-3 flex items-baseline justify-between">
        <span
          className="text-lg font-extrabold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
        >
          {formatNumber(goal.current)}
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          / {formatNumber(goal.target)} {goal.unit}
        </span>
      </div>

      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'color-mix(in srgb, var(--smuggler-border) 60%, transparent)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${pct}%` } : { width: 0 }}
          transition={{ duration: 1.1, ease: [0.25, 1, 0.5, 1] }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${goal.color}, color-mix(in srgb, ${goal.color} 60%, #fff))`,
            boxShadow: `0 0 10px ${goal.color}55`,
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span
          className="text-xs font-bold"
          style={{ color: goal.color }}
        >
          {pct}%
        </span>
        <span
          className="text-[0.65rem]"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          {isComplete ? 'Goal achieved!' : `${formatNumber(goal.target - goal.current)} ${goal.unit} to go`}
        </span>
      </div>
    </motion.div>
  );
}

/* ============================================================
   CreateGoalDialog
   ============================================================ */

function CreateGoalDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (title: string, target: number, unit: string, color: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [color, setColor] = useState(GOAL_COLORS[0]);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      // Reset form state each time the dialog opens.
      setTitle('');
      setTarget('');
      setUnit('');
      setColor(GOAL_COLORS[0]);
    }
    onOpenChange(v);
  };

  const targetNum = parseInt(target, 10);
  const valid = title.trim().length > 0 && !Number.isNaN(targetNum) && targetNum > 0;

  const handleCreate = () => {
    if (!valid) return;
    onCreate(title.trim(), targetNum, unit.trim() || 'items', color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          borderColor: 'var(--smuggler-border)',
          color: 'var(--smuggler-text)',
        }}
      >
        <div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
          >
            Create a New Goal
          </h2>
          <span className="smuggler-title-divider" />
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
              htmlFor="goal-title"
            >
              Goal Title
            </label>
            <input
              id="goal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Reach 100K Subscribers"
              className="smuggler-input-premium w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ color: 'var(--smuggler-text)' }}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
                htmlFor="goal-target"
              >
                Target
              </label>
              <input
                id="goal-target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="100000"
                className="smuggler-input-premium w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ color: 'var(--smuggler-text)' }}
              />
            </div>
            <div>
              <label
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--smuggler-text-muted)' }}
                htmlFor="goal-unit"
              >
                Unit
              </label>
              <input
                id="goal-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="subs"
                className="smuggler-input-premium w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                style={{ color: 'var(--smuggler-text)' }}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-transform"
                  style={{
                    backgroundColor: c,
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow:
                      color === c
                        ? `0 0 0 2px var(--smuggler-bg-panel), 0 0 0 4px ${c}`
                        : 'none',
                  }}
                  aria-label={`Pick color ${c}`}
                  aria-pressed={color === c}
                >
                  {color === c && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="smuggler-cta-outline !px-4 !py-2 !text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!valid}
            className="smuggler-cta-premium !px-4 !py-2 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              opacity: valid ? 1 : 0.5,
              cursor: valid ? 'pointer' : 'not-allowed',
            }}
          >
            <Plus size={13} />
            Create Goal
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   ActivityRow
   ============================================================ */

function ActivityRow({ activity }: { activity: ReturnType<typeof useStudioStore.getState>['activities'][number] }) {
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-start gap-3 rounded-xl border p-3 transition-colors"
      style={{
        borderColor: 'var(--smuggler-border)',
        backgroundColor: 'color-mix(in srgb, var(--smuggler-bg) 40%, transparent)',
      }}
    >
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={{
          backgroundColor: `color-mix(in srgb, ${activity.color} 14%, transparent)`,
          color: activity.color,
        }}
      >
        {activity.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--smuggler-text)' }}
        >
          {activity.text}
        </p>
        <p
          className="mt-1 text-[0.65rem]"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          {formatTimeAgo(activity.time)}
        </p>
      </div>
    </motion.div>
  );
}

/* ============================================================
   QuickActionButton
   ============================================================ */

function QuickActionButton({
  action,
  onSelectTool,
  onNavigate,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  onSelectTool: (toolId: string) => void;
  onNavigate: (view: 'home' | 'tools' | 'library') => void;
}) {
  const Icon = action.icon;
  const handleClick = () => {
    if (action.toolId) onSelectTool(action.toolId);
    else onNavigate('tools');
  };
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -3 }}
      type="button"
      onClick={handleClick}
      className="smuggler-hook-card group flex flex-col items-start gap-2 rounded-2xl p-4 text-left"
    >
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
        style={{
          backgroundColor: `color-mix(in srgb, ${action.color} 16%, transparent)`,
          color: action.color,
          border: `1px solid color-mix(in srgb, ${action.color} 28%, transparent)`,
        }}
      >
        <Icon size={20} />
      </span>
      <div>
        <p
          className="text-sm font-bold"
          style={{ color: 'var(--smuggler-text)' }}
        >
          {action.label}
        </p>
        <p
          className="mt-0.5 text-[0.7rem]"
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          {action.desc}
        </p>
      </div>
      <span
        className="mt-1 flex items-center gap-1 text-[0.65rem] font-bold transition-colors"
        style={{ color: action.color }}
      >
        Open
        <ArrowRight size={10} className="transition-transform group-hover:translate-x-1" />
      </span>
    </motion.button>
  );
}

/* ============================================================
   Main StudioView
   ============================================================ */

export function StudioView({ onNavigate, onSelectTool }: StudioViewProps) {
  /* Store selectors */
  const hydrate = useStudioStore((s) => s.hydrate);
  const accounts = useStudioStore((s) => s.accounts);
  const goals = useStudioStore((s) => s.goals);
  const activities = useStudioStore((s) => s.activities);
  const insights = useStudioStore((s) => s.insights);
  const calendar = useStudioStore((s) => s.calendar);
  const topContent = useStudioStore((s) => s.topContent);
  const demographicsAge = useStudioStore((s) => s.demographicsAge);
  const demographicsGeo = useStudioStore((s) => s.demographicsGeo);
  const trafficSources = useStudioStore((s) => s.trafficSources);
  const timeframe = useStudioStore((s) => s.selectedTimeframe);
  const setTimeframe = useStudioStore((s) => s.setTimeframe);
  const connectAccount = useStudioStore((s) => s.connectAccount);
  const disconnectAccount = useStudioStore((s) => s.disconnectAccount);
  const refreshAccount = useStudioStore((s) => s.refreshAccount);
  const createGoal = useStudioStore((s) => s.createGoal);
  const deleteGoal = useStudioStore((s) => s.deleteGoal);
  const toggleCalendarItem = useStudioStore((s) => s.toggleCalendarItem);

  /* Hydrate on mount */
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  /* Toast state */
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastIdRef = useRef(0);
  const pushToast = (message: string, type: ToastState['type'] = 'success') => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  };
  const dismissToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  /* Goal dialog */
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);

  /* Derived metrics */
  const connected = useMemo(() => accounts.filter((a) => a.connected), [accounts]);
  const totalFollowers = useMemo(
    () => connected.reduce((s, a) => s + a.followers, 0),
    [connected],
  );
  const totalViews = useMemo(
    () => connected.reduce((s, a) => s + a.views, 0),
    [connected],
  );
  const avgEngagement = useMemo(() => {
    if (connected.length === 0) return 0;
    return connected.reduce((s, a) => s + a.engagement, 0) / connected.length;
  }, [connected]);
  const watchTimeSec = 272; // 4m 32s

  const fmtWatchTime = (v: number) => {
    const m = Math.floor(v / 60);
    const s = Math.round(v % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const fmtRevenue = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

  return (
    <div
      className="smuggler-bg-premium relative w-full overflow-hidden"
      style={{ backgroundColor: 'var(--smuggler-bg)' }}
    >
      {/* Radial gold/green gradient layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 15% -5%, color-mix(in srgb, var(--smuggler-gold) 18%, transparent), transparent 55%), radial-gradient(ellipse at 85% 10%, color-mix(in srgb, var(--smuggler-accent-green) 14%, transparent), transparent 50%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-20 pt-6 sm:px-8 lg:px-12">
        {/* ======================= HERO ======================= */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="relative mb-10 overflow-hidden rounded-3xl border p-6 sm:p-10"
          style={{
            borderColor: 'color-mix(in srgb, var(--smuggler-gold) 22%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--smuggler-bg-panel) 88%, transparent)',
            boxShadow:
              '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 12px 40px -12px rgba(140,106,59,0.18)',
          }}
        >
          <div
            aria-hidden
            className="smuggler-paper-grain pointer-events-none absolute inset-0"
          />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* Left: title + subtitle */}
            <div className="max-w-2xl flex-1">
              <div className="mb-3">
                <BackButton onBack={() => onNavigate('home')} label="Home" />
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className="smuggler-glow inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--smuggler-gold) 14%, transparent)',
                    color: 'var(--smuggler-gold)',
                    border: '1px solid color-mix(in srgb, var(--smuggler-gold) 30%, transparent)',
                  }}
                >
                  <Crown size={12} />
                  Creator Studio
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.65rem] font-semibold"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--smuggler-accent-green) 12%, transparent)',
                    color: 'var(--smuggler-green)',
                    border: '1px solid color-mix(in srgb, var(--smuggler-accent-green) 28%, transparent)',
                  }}
                >
                  <ShieldCheck size={12} />
                  {connected.length} accounts connected
                </span>
              </div>

              <div className="smuggler-hero-title-wrap">
                <h1
                  className="smuggler-hero-title text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Creator Studio
                </h1>
              </div>

              <p
                className="mt-4 max-w-xl text-sm leading-relaxed sm:text-base"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                Your AI-powered command center for content creation and growth.
                Track every metric, surface every insight, and ship faster — all in one premium dashboard.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <TimeframeSelector
                  value={timeframe as TimeframeKey}
                  onChange={(t) => {
                    setTimeframe(t);
                    pushToast(`Switched to ${t.toUpperCase()} view`, 'info');
                  }}
                />
                <button
                  type="button"
                  onClick={() => onNavigate('tools')}
                  className="smuggler-cta-outline !px-4 !py-2 !text-xs"
                >
                  <Zap size={13} />
                  Open Tools
                </button>
              </div>
            </div>

            {/* Right: mascot + bell */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full blur-2xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--smuggler-gold) 30%, transparent)' }}
                />
                <div
                  className="relative flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full border-2"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--smuggler-gold) 50%, transparent)',
                    backgroundColor: 'var(--smuggler-bg-panel)',
                    boxShadow:
                      '0 1px 0 0 rgba(255,255,255,0.6) inset, 0 14px 40px -10px rgba(140,106,59,0.4)',
                  }}
                >
                  <img
                    src="/smuggler/assets/hero-mascot-new.png"
                    alt="Content Smuggler mascot floating in a circular badge"
                    className="h-full w-full scale-110 object-contain p-1.5"
                  />
                </div>
                {/* Orbiting dot */}
                <motion.span
                  aria-hidden
                  className="absolute -right-1 top-3 h-3 w-3 rounded-full"
                  style={{ backgroundColor: 'var(--smuggler-gold)', boxShadow: '0 0 10px var(--smuggler-gold)' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>

              <NotificationBell activities={activities} />
            </div>
          </div>
        </motion.section>

        {/* ======================= KEY METRICS ======================= */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="mb-12"
          aria-label="Key metrics"
        >
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard
              index={0}
              meta={METRIC_META[0]}
              value={totalFollowers}
              formatter={formatNumber}
            />
            <MetricCard
              index={1}
              meta={METRIC_META[1]}
              value={totalViews}
              formatter={formatNumber}
            />
            <MetricCard
              index={2}
              meta={METRIC_META[2]}
              value={parseFloat(avgEngagement.toFixed(2))}
              formatter={(v) => v.toFixed(1)}
              suffix="%"
            />
            <MetricCard
              index={3}
              meta={METRIC_META[3]}
              value={watchTimeSec}
              formatter={fmtWatchTime}
            />
            <MetricCard
              index={4}
              meta={METRIC_META[4]}
              value={48920}
              formatter={fmtRevenue}
            />
            <MetricCard
              index={5}
              meta={METRIC_META[5]}
              value={86}
              formatter={(v) => Math.round(v).toString()}
            />
          </div>
        </motion.section>

        {/* ======================= CONNECTED ACCOUNTS ======================= */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12"
          aria-label="Connected accounts"
        >
          <SectionHeading
            title="Connected Accounts"
            icon={Users}
            action={
              <button
                type="button"
                onClick={() => pushToast('Account management coming soon', 'info')}
                className="smuggler-cta-outline !px-3 !py-1.5 !text-xs"
              >
                Manage
                <ArrowRight size={12} />
              </button>
            }
          />
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                account={acc}
                onConnect={connectAccount}
                onDisconnect={disconnectAccount}
                onRefresh={refreshAccount}
                onToast={pushToast}
              />
            ))}
          </motion.div>
        </motion.section>

        {/* ======================= PERFORMANCE CHART ======================= */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12"
          aria-label="Performance overview"
        >
          <SectionHeading
            title="Performance Overview"
            icon={TrendingUp}
            action={
              <TimeframeSelector
                value={timeframe as TimeframeKey}
                onChange={(t) => {
                  setTimeframe(t);
                  pushToast(`Range updated to ${t.toUpperCase()}`, 'info');
                }}
              />
            }
          />
          <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  Last {timeframe === '7d' ? '7 days' : timeframe === '28d' ? '28 days' : '90 days'}
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
                >
                  Views, Engagement & Follower Growth
                </p>
              </div>
            </div>
            <PerformanceChart timeframe={timeframe as TimeframeKey} />
          </div>
        </motion.section>

        {/* ======================= AI INSIGHTS ======================= */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12"
          aria-label="AI creator coach insights"
        >
          <SectionHeading
            title="Insights for You"
            icon={Sparkles}
            badge="New"
          />
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {insights.map((ins) => (
              <InsightCard
                key={ins.id}
                insight={ins}
                onSelectTool={(id) => {
                  onSelectTool(id);
                  pushToast(`Opening ${ins.toolName}…`, 'info');
                }}
              />
            ))}
          </motion.div>
        </motion.section>

        {/* ======================= TOP CONTENT + CALENDAR ======================= */}
        <div className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopContentSection items={topContent} />
          <CalendarSection
            items={calendar}
            onToggle={(id) => {
              toggleCalendarItem(id);
              pushToast('Calendar item updated', 'success');
            }}
            onNavigate={onNavigate}
          />
        </div>

        {/* ======================= DEMOGRAPHICS ======================= */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12"
          aria-label="Audience demographics"
        >
          <SectionHeading title="Audience Demographics" icon={Users} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5">
              <HBarChart data={demographicsAge} label="Age Groups" />
            </div>
            <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5">
              <HBarChart data={demographicsGeo} label="Top Countries" />
            </div>
            <div className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5">
              <TrafficDonut data={trafficSources} />
            </div>
          </div>
        </motion.section>

        {/* ======================= GOALS ======================= */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mb-12"
          aria-label="Your goals"
        >
          <SectionHeading
            title="Your Goals"
            icon={Target}
            action={
              <button
                type="button"
                onClick={() => setGoalDialogOpen(true)}
                className="smuggler-cta-premium !px-3 !py-1.5 !text-xs"
              >
                <Plus size={13} />
                New Goal
              </button>
            }
          />
          {goals.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed p-10 text-center"
              style={{
                borderColor: 'var(--smuggler-border)',
                color: 'var(--smuggler-text-muted)',
              }}
            >
              <Target size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No goals yet</p>
              <p className="mt-1 text-xs">
                Set your first goal to start tracking growth.
              </p>
              <button
                type="button"
                onClick={() => setGoalDialogOpen(true)}
                className="smuggler-cta-gold !px-4 !py-2 !text-xs mt-4 mx-auto"
              >
                <Plus size={13} />
                Create your first goal
              </button>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {goals.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  onDelete={(id) => {
                    deleteGoal(id);
                    pushToast('Goal deleted', 'info');
                  }}
                />
              ))}
            </motion.div>
          )}
        </motion.section>

        {/* ======================= ACTIVITY + QUICK ACTIONS ======================= */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5 sm:p-6"
            aria-label="Recent activity"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={18} style={{ color: 'var(--smuggler-gold)' }} />
                <h2
                  className="smuggler-section-heading text-xl"
                  style={{ color: 'var(--smuggler-text)' }}
                >
                  Recent Activity
                </h2>
              </div>
              <button
                type="button"
                onClick={() => pushToast('Full activity feed coming soon', 'info')}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: 'var(--smuggler-gold)' }}
              >
                View all
                <ArrowRight size={12} />
              </button>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="flex flex-col gap-2"
            >
              {activities.slice(0, 6).map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </motion.div>
          </motion.section>

          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="smuggler-panel-premium smuggler-paper-grain rounded-2xl p-5 sm:p-6"
            aria-label="Quick access tools"
          >
            <div className="mb-4 flex items-center gap-2">
              <Zap size={18} style={{ color: 'var(--smuggler-gold)' }} />
              <h2
                className="smuggler-section-heading text-xl"
                style={{ color: 'var(--smuggler-text)' }}
              >
                Quick Access
              </h2>
            </div>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {QUICK_ACTIONS.map((a) => (
                <QuickActionButton
                  key={a.label}
                  action={a}
                  onSelectTool={(id) => {
                    onSelectTool(id);
                    pushToast(`Opening ${a.label}…`, 'info');
                  }}
                  onNavigate={onNavigate}
                />
              ))}
            </motion.div>
          </motion.section>
        </div>
      </div>

      {/* Goal Dialog */}
      <CreateGoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        onCreate={(title, target, unit, color) => {
          createGoal(title, target, unit, color);
          pushToast('Goal created!', 'success');
        }}
      />

      {/* Toasts */}
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default StudioView;
