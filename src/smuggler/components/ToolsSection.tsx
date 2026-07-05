'use client';

import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Eye,
  Heart,
  TrendingUp,
  Wallet,
  MoreVertical,
  Crown,
  Sparkles,
  PencilLine,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  POPULAR_TOOLS,
  CATEGORY_STATS,
  TOOL_COUNT,
  type SmugglerTool,
} from '@/smuggler/data/tools';

export interface ToolsSectionProps {
  onSelectTool: (toolId: string) => void;
  onExploreTools: () => void;
}

const fadeUpVariant: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const TIME_FILTERS = ['7D', '30D', 'All Time'] as const;
type TimeFilter = (typeof TIME_FILTERS)[number];

interface StatConfig {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  trend: string;
  compare: string;
}

const STATS: StatConfig[] = [
  {
    icon: Eye,
    iconColor: 'var(--smuggler-green)',
    label: 'Views Generated',
    value: '2.4M',
    trend: '+32%',
    compare: 'vs last 7 days',
  },
  {
    icon: Heart,
    iconColor: 'var(--smuggler-red)',
    label: 'Engagement',
    value: '142K',
    trend: '+24%',
    compare: 'vs last 7 days',
  },
  {
    icon: TrendingUp,
    iconColor: 'var(--smuggler-orange)',
    label: 'Content Created',
    value: '86',
    trend: '+18%',
    compare: 'vs last 7 days',
  },
  {
    icon: Wallet,
    iconColor: 'var(--smuggler-yellow)',
    label: 'Time Saved',
    value: '28.5 hrs',
    trend: '+30% 7 days',
    compare: 'vs last week',
  },
];

interface ActivityConfig {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  desc: string;
  time: string;
}

const ACTIVITIES: ActivityConfig[] = [
  {
    icon: Sparkles,
    iconBg: 'rgba(89, 127, 86, 0.18)',
    iconColor: 'var(--smuggler-green)',
    title: 'Hook Generator',
    tag: 'Completed',
    tagBg: 'rgba(89, 127, 86, 0.18)',
    tagColor: 'var(--smuggler-green)',
    desc: '10 Hook variants generated',
    time: '2 min ago',
  },
  {
    icon: PencilLine,
    iconBg: 'rgba(74, 122, 140, 0.18)',
    iconColor: 'var(--smuggler-blue)',
    title: 'Script Writer',
    tag: 'Completed',
    tagBg: 'rgba(89, 127, 86, 0.18)',
    tagColor: 'var(--smuggler-green)',
    desc: 'YouTube Script: "5 Habits of Successful Creators"',
    time: '15 min ago',
  },
  {
    icon: ImageIcon,
    iconBg: 'rgba(117, 91, 143, 0.18)',
    iconColor: 'var(--smuggler-purple)',
    title: 'Thumbnail Analyzer',
    tag: 'Analyzed',
    tagBg: 'rgba(184, 160, 62, 0.18)',
    tagColor: 'var(--smuggler-yellow)',
    desc: 'Thumbnail score: 87/100',
    time: '1 hr ago',
  },
];

function PopularToolCard({
  tool,
  onSelect,
}: {
  tool: SmugglerTool;
  onSelect: (id: string) => void;
}) {
  const Icon = tool.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className="group flex w-full items-center gap-4 rounded-lg border border-transparent p-3 text-left transition hover:border-white/[0.05] hover:bg-white/[0.02]"
      aria-label={`Open ${tool.name}`}
    >
      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: tool.bgColor }}
      >
        <Icon
          size={20}
          className="fill-current"
          style={{ color: tool.color }}
          aria-hidden="true"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className="truncate"
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--smuggler-text)',
          }}
        >
          {tool.name}
        </h3>
        <p
          className="truncate"
          style={{
            fontSize: '12px',
            color: 'var(--smuggler-text-secondary)',
          }}
        >
          {tool.desc}
        </p>
      </div>
      <ArrowRight
        size={16}
        className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
        style={{ color: 'var(--smuggler-text-muted)' }}
        aria-hidden="true"
      />
    </button>
  );
}

function StatCard({ stat }: { stat: StatConfig }) {
  const Icon = stat.icon;
  return (
    <div
      className="rounded-xl border p-6"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderColor: 'var(--smuggler-border)',
      }}
    >
      <Icon size={24} style={{ color: stat.iconColor }} aria-hidden="true" />
      <p
        className="mb-3 mt-3"
        style={{
          fontSize: '11px',
          color: 'var(--smuggler-text-secondary)',
          fontWeight: 500,
        }}
      >
        {stat.label}
      </p>
      <div className="flex items-baseline gap-2">
        <h4
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--smuggler-text)',
            lineHeight: 1,
          }}
        >
          {stat.value}
        </h4>
        <span
          className="flex items-center gap-0.5"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--smuggler-green)',
          }}
        >
          <ArrowUpRight size={12} aria-hidden="true" />
          {stat.trend}
        </span>
      </div>
      <p
        className="mt-2"
        style={{ fontSize: '11px', color: 'var(--smuggler-text-muted)' }}
      >
        {stat.compare}
      </p>
    </div>
  );
}

function ActivityItem({ activity }: { activity: ActivityConfig }) {
  const Icon = activity.icon;
  return (
    <div
      className="flex items-center gap-4 rounded-lg p-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: activity.iconBg }}
      >
        <Icon size={16} style={{ color: activity.iconColor }} aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h4
            className="truncate"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--smuggler-text)',
            }}
          >
            {activity.title}
          </h4>
          <span
            className="flex-shrink-0 rounded px-1.5 py-0.5"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              backgroundColor: activity.tagBg,
              color: activity.tagColor,
              letterSpacing: '0.3px',
            }}
          >
            {activity.tag}
          </span>
        </div>
        <p
          className="truncate"
          style={{
            fontSize: '13px',
            color: 'var(--smuggler-text-secondary)',
          }}
        >
          {activity.desc}
        </p>
      </div>
      <div
        className="flex flex-shrink-0 items-center gap-2"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        <span style={{ fontSize: '12px' }}>{activity.time}</span>
        <MoreVertical size={14} aria-hidden="true" />
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={`mb-6 flex items-center justify-between ${className ?? ''}`}
    >
      <h2
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--smuggler-text)',
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="group flex items-center gap-1 text-xs font-medium transition-colors hover:text-[var(--smuggler-gold)]"
          style={{ color: 'var(--smuggler-text-secondary)' }}
        >
          {actionLabel}
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

export function ToolsSection({
  onSelectTool,
  onExploreTools,
}: ToolsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('7D');
  const popularTools = POPULAR_TOOLS.slice(0, 6);

  return (
    <motion.main
      className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-4 pb-8 sm:px-8 lg:grid-cols-[320px_1fr_300px] lg:px-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        visible: { transition: { staggerChildren: 0.15 } },
      }}
      aria-label="Creator workspace"
    >
      {/* LEFT: Popular Tools */}
      <motion.section
        variants={fadeUpVariant}
        className="smuggler-panel"
        aria-labelledby="popular-tools-heading"
      >
        <PanelHeader
          title="POPULAR TOOLS"
          actionLabel="View all tools"
          onAction={onExploreTools}
        />
        <div className="flex flex-col gap-2">
          {popularTools.map((tool) => (
            <PopularToolCard
              key={tool.id}
              tool={tool}
              onSelect={onSelectTool}
            />
          ))}
        </div>
      </motion.section>

      {/* MIDDLE: Command Center */}
      <motion.section
        variants={fadeUpVariant}
        className="smuggler-panel"
        aria-labelledby="command-center-heading"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="command-center-heading"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--smuggler-text)',
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}
          >
            YOUR COMMAND CENTER
          </h2>
          <div className="flex items-center gap-1 rounded-full border border-[var(--smuggler-border)] p-1">
            {TIME_FILTERS.map((filter) => {
              const isActive = filter === activeFilter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--smuggler-text)'
                      : 'var(--smuggler-text-muted)',
                  }}
                  aria-pressed={isActive}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        {/* Recent Activity */}
        <PanelHeader
          title="RECENT ACTIVITY"
          actionLabel="View all"
          onAction={onExploreTools}
          className="mt-8"
        />
        <div className="flex flex-col gap-2">
          {ACTIVITIES.map((activity) => (
            <ActivityItem key={activity.title} activity={activity} />
          ))}
        </div>
      </motion.section>

      {/* RIGHT: Top Categories + Promo */}
      <motion.section
        variants={fadeUpVariant}
        className="smuggler-panel"
        aria-labelledby="top-categories-heading"
      >
        <PanelHeader
          title="TOP CATEGORIES"
          actionLabel="View all"
          onAction={onExploreTools}
        />
        <div className="mb-6 grid grid-cols-2 gap-3">
          {CATEGORY_STATS.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={onExploreTools}
                className="flex flex-col items-center rounded-xl border p-6 text-center transition-colors hover:bg-white/[0.03]"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'var(--smuggler-border)',
                  padding: '1.5rem 1rem',
                }}
                aria-label={`Explore ${cat.name} (${cat.count} tools)`}
              >
                <Icon
                  size={24}
                  style={{ color: cat.color, marginBottom: '12px' }}
                  aria-hidden="true"
                />
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--smuggler-text)',
                  }}
                >
                  {cat.name}
                </h4>
                <p
                  className="mt-1"
                  style={{
                    fontSize: '12px',
                    color: 'var(--smuggler-text-secondary)',
                  }}
                >
                  {cat.count} Tools
                </p>
              </button>
            );
          })}
        </div>

        {/* Promo Box */}
        <div
          className="rounded-xl border p-6"
          style={{
            background:
              'linear-gradient(to bottom right, rgba(33,58,40,0.4), rgba(19,17,14,0.8))',
            borderColor: 'rgba(89,127,86,0.3)',
          }}
        >
          <div className="mb-4 flex items-start gap-4">
            <Crown
              size={32}
              style={{ color: 'var(--smuggler-gold)', flexShrink: 0 }}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--smuggler-text)',
                }}
              >
                Unlock Your Full Potential
              </h3>
              <p
                className="mt-1"
                style={{
                  fontSize: '13px',
                  color: 'var(--smuggler-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                Get unlimited access to all {TOOL_COUNT} tools, premium features
                and priority support.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onExploreTools}
            className="smuggler-btn smuggler-btn-primary w-full justify-center"
          >
            <Crown
              size={16}
              style={{ color: 'var(--smuggler-gold)' }}
              aria-hidden="true"
            />
            Upgrade Now
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </motion.section>
    </motion.main>
  );
}

export default ToolsSection;
