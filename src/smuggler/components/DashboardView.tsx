'use client';

import { useEffect, useState } from 'react';
import { motion, animate, type Variants } from 'framer-motion';
import {
  Paperclip,
  Eye,
  Heart,
  TrendingUp,
  Clock,
  Trophy,
  ArrowLeftRight,
  PenLine,
  ImageIcon,
  Crown,
  MoreVertical,
  Search,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

export interface DashboardViewProps {
  onSelectTool: (toolId: string) => void;
  onExploreTools: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/* Animated counter — uses framer-motion's animate() like the original */
function AnimatedCounter({
  to,
  duration = 2,
  formatter,
}: {
  to: number;
  duration?: number;
  formatter: (v: number) => string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controls = animate(0, to, {
      duration,
      ease: [0.25, 1, 0.5, 1],
      onUpdate(value) {
        setCount(value);
      },
    });
    return () => controls.stop();
  }, [to, duration]);

  return <span>{formatter(count)}</span>;
}

interface StatConfig {
  icon: LucideIcon;
  iconBg: string;
  label: string;
  to: number;
  formatter: (v: number) => string;
  trend: string;
  trendSub: string;
  sparkline: string;
}

const STATS: StatConfig[] = [
  {
    icon: Eye,
    iconBg: '#4C6B4A',
    label: 'Views Generated',
    to: 2.4,
    formatter: (v) => v.toFixed(1) + 'M',
    trend: '↑ 32%',
    trendSub: 'vs last 7 days',
    sparkline: 'smuggler-sparkline smuggler-sparkline-green',
  },
  {
    icon: Heart,
    iconBg: '#9B3D3D',
    label: 'Engagement',
    to: 142,
    formatter: (v) => Math.round(v) + 'K',
    trend: '↑ 24%',
    trendSub: 'vs last 7 days',
    sparkline: 'smuggler-sparkline smuggler-sparkline-red',
  },
  {
    icon: TrendingUp,
    iconBg: '#C09A4D',
    label: 'Content Created',
    to: 86,
    formatter: (v) => String(Math.round(v)),
    trend: '↑ 18%',
    trendSub: 'vs last 7 days',
    sparkline: 'smuggler-sparkline smuggler-sparkline-gold',
  },
  {
    icon: Clock,
    iconBg: '#624B8B',
    label: 'Time Saved',
    to: 28.5,
    formatter: (v) => v.toFixed(1) + ' hrs',
    trend: '↑ 30%',
    trendSub: 'vs last 7 days',
    sparkline: 'smuggler-sparkline smuggler-sparkline-purple',
  },
  {
    icon: Trophy,
    iconBg: '#C28B5E',
    label: 'Top Tool Used',
    to: 0,
    formatter: () => 'Hook Generator',
    trend: '42% of total usage',
    trendSub: '',
    sparkline: 'smuggler-sparkline smuggler-sparkline-bronze',
  },
];

interface ActivityConfig {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  tag: string;
  tagClass: string;
  desc: string;
  time: string;
}

const ACTIVITIES: ActivityConfig[] = [
  {
    icon: ArrowLeftRight,
    iconBg: '#4C6B4A',
    title: 'Hook Generator',
    tag: 'Completed',
    tagClass: 'tag-completed',
    desc: '10 Hook variants generated',
    time: '2 min ago',
  },
  {
    icon: PenLine,
    iconBg: '#3B648C',
    title: 'Script Writer',
    tag: 'Completed',
    tagClass: 'tag-completed',
    desc: 'YouTube Script: "5 Habits of Successful Creators"',
    time: '15 min ago',
  },
  {
    icon: ImageIcon,
    iconBg: '#624B8B',
    title: 'Thumbnail Analyzer',
    tag: 'Analyzed',
    tagClass: 'tag-analyzed',
    desc: 'Thumbnail score: 87/100',
    time: '1 hr ago',
  },
  {
    icon: ArrowLeftRight,
    iconBg: '#4C6B4A',
    title: 'Repurpose Engine',
    tag: 'Completed',
    tagClass: 'tag-completed',
    desc: '1 YouTube video repurposed into 6 formats',
    time: '2 hrs ago',
  },
  {
    icon: Trophy,
    iconBg: '#C28B5E',
    title: 'Title Optimizer',
    tag: 'Completed',
    tagClass: 'tag-completed',
    desc: '20 title options generated',
    time: '3 hrs ago',
  },
];

interface PopularToolConfig {
  icon: LucideIcon;
  iconBg: string;
  name: string;
  desc: string;
  toolId: string;
}

const POPULAR: PopularToolConfig[] = [
  {
    icon: ArrowLeftRight,
    iconBg: '#4C6B4A',
    name: 'Hook Generator',
    desc: 'Create scroll-stopping hooks',
    toolId: 'hook-generator',
  },
  {
    icon: Trophy,
    iconBg: '#C09A4D',
    name: 'Title Optimizer',
    desc: 'Get viral-worthy titles',
    toolId: 'title-optimizer',
  },
  {
    icon: PenLine,
    iconBg: '#3B648C',
    name: 'Script Writer',
    desc: 'Write engaging scripts with AI',
    toolId: 'script-writer',
  },
];

const CALENDAR_ITEMS = [
  { time: '11:00 AM', platform: 'yt', icon: '▶', title: 'YouTube Video', tag: 'Scheduled', tagClass: 'tag-scheduled' },
  { time: '02:00 PM', platform: 'ig', icon: '📸', title: 'Instagram Post', tag: 'Scheduled', tagClass: 'tag-scheduled' },
  { time: '07:00 PM', platform: 'tw', icon: '🐦', title: 'Twitter Thread', tag: 'Draft', tagClass: 'tag-draft' },
];

const TRUSTED_AVATARS = [1, 2, 3, 4, 5, 6, 7, 8];

export function DashboardView({
  onSelectTool,
  onExploreTools,
}: DashboardViewProps) {
  return (
    <section
      className="relative min-h-screen overflow-hidden"
      style={{
        backgroundColor: '#EAE3D2',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        color: '#222',
      }}
      aria-labelledby="dashboard-heading"
    >
      <div className="smuggler-ambient-glow" />

      <motion.div
        className="relative z-10 mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-8 lg:px-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <h1 id="dashboard-heading" className="sr-only">
          Dashboard
        </h1>

        {/* Top Row: Welcome Banner + Plan Widget */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Welcome Banner */}
          <motion.div
            variants={itemVariants}
            className="smuggler-card-shine-host relative flex flex-1 flex-col items-start gap-6 rounded-xl border border-black/5 p-6 sm:flex-row sm:items-center sm:p-8"
            style={{
              background: 'linear-gradient(135deg, #F4EDDC, #E5DCB8)',
              boxShadow:
                '0 4px 15px rgba(0,0,0,0.05), inset 0 0 40px rgba(0,0,0,0.05)',
            }}
          >
            <div className="smuggler-card-shine" />

            {/* Mascot polaroid */}
            <div
              className="relative shrink-0 rounded p-2.5"
              style={{
                backgroundColor: '#D8CEB7',
                boxShadow: '2px 4px 10px rgba(0,0,0,0.1)',
                transform: 'rotate(-2deg)',
              }}
            >
              <img
                src="/smuggler/assets/mascot-2.png"
                alt="Smuggler Mascot"
                className="h-[100px] w-[100px] rounded object-cover"
              />
              <Paperclip
                size={24}
                className="absolute -top-3 left-2.5 text-[#666]"
                style={{ transform: 'rotate(15deg)' }}
              />
            </div>

            {/* Welcome text */}
            <div className="flex-1">
              <h2
                className="mb-2.5 font-serif text-[1.8rem] font-bold text-[#111]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Good morning, Agent Smith.
              </h2>
              <p className="mb-4 text-[1rem] text-[#444]">
                Your dashboard is fully decrypted and ready for operation.
              </p>
              <p
                className="m-0 font-serif text-[0.9rem] italic text-[#555]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                &ldquo;Great content isn&rsquo;t created. It&rsquo;s
                smuggled.&rdquo;
              </p>
            </div>

            {/* TOP SECRET stamp */}
            <div
              className="pointer-events-none absolute bottom-5 right-5 flex flex-col gap-1.5 opacity-70"
              style={{ transform: 'rotate(-5deg)' }}
            >
              <span
                className="smuggler-stamp-rotate rounded border-2 border-[#C43B3B] px-2 py-0.5 text-[0.7rem] font-extrabold tracking-[2px] text-[#C43B3B]"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                TOP SECRET
              </span>
              <span
                className="rounded border-2 border-[#C43B3B] px-2 py-0.5 text-center text-[0.7rem] font-extrabold tracking-[2px] text-[#C43B3B]"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                CONSISTENT
              </span>
            </div>
          </motion.div>

          {/* Plan Widget */}
          <motion.div
            variants={itemVariants}
            className="flex w-full flex-col justify-between rounded-xl p-6 lg:w-[320px]"
            style={{
              backgroundColor: '#1A1A1A',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <div
              className="flex items-center justify-between text-[0.8rem] font-semibold tracking-[1px] text-[#AAA]"
            >
              <span>YOUR PLAN</span>
              <span
                className="flex items-center gap-1 rounded bg-[rgba(228,216,180,0.15)] px-2 py-1 text-[0.7rem] text-[#E4D8B4]"
              >
                <Crown size={12} className="fill-current" /> Creator Plan
              </span>
            </div>

            <div className="mt-5">
              <div className="mb-2.5 flex justify-between text-[0.9rem]">
                <span>Usage this month</span>
                <span>12 / 100</span>
              </div>
              <div
                className="mb-2.5 h-2 overflow-hidden rounded"
                style={{ backgroundColor: '#333' }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '12%' }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                  className="h-full"
                  style={{ backgroundColor: '#4C6B4A' }}
                />
              </div>
              <div className="mb-5 text-[0.75rem] text-[#666]">
                Resets on 01 Jun, 2025
              </div>
            </div>

            <button
              type="button"
              className="smuggler-btn smuggler-btn-gold w-full justify-center"
              onClick={onExploreTools}
            >
              <Crown size={14} className="fill-current" /> Upgrade Plan
            </button>
          </motion.div>
        </div>

        {/* Stats Row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="smuggler-card-shine-host relative flex flex-col overflow-hidden rounded-[10px] border border-black/5 p-5"
                style={{
                  backgroundColor: '#F8F4EA',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                }}
              >
                <div className="smuggler-card-shine" />
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: stat.iconBg }}
                >
                  <Icon size={20} className="fill-current" />
                </div>
                <div>
                  <span className="text-[0.8rem] font-semibold text-[#555]">
                    {stat.label}
                  </span>
                  <h3 className="my-1 text-[1.8rem] font-extrabold text-[#111]">
                    {stat.label === 'Top Tool Used' ? (
                      'Hook Generator'
                    ) : (
                      <AnimatedCounter
                        to={stat.to}
                        formatter={stat.formatter}
                      />
                    )}
                  </h3>
                  <div className="text-[0.75rem] font-bold text-[#4C6B4A]">
                    {stat.trend}{' '}
                    {stat.trendSub && (
                      <span className="font-normal text-[#888]">
                        {stat.trendSub}
                      </span>
                    )}
                  </div>
                </div>
                <div className={stat.sparkline} />
              </div>
            );
          })}
        </motion.div>

        {/* 3-Column Grid: Recent Activity / Popular Tools / Calendar + Agent Tip */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1.5fr_1fr]">
          {/* Recent Activity */}
          <motion.div
            variants={itemVariants}
            className="smuggler-card-shine-host relative flex flex-col rounded-xl border border-black/5 p-6"
            style={{
              backgroundColor: '#F8F4EA',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            }}
          >
            <div className="smuggler-card-shine" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="m-0 text-[1.1rem] font-extrabold text-[#111]">
                Recent Activity
              </h3>
              <button
                type="button"
                onClick={onExploreTools}
                className="text-[0.8rem] font-semibold text-[#4C6B4A] hover:underline"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {ACTIVITIES.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.title + a.time}
                    className="flex items-start gap-3.5 rounded-lg p-2.5 transition-colors hover:bg-black/[0.03]"
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: a.iconBg }}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="m-0 mb-1 flex items-center gap-2 text-[0.95rem] text-[#222]">
                        {a.title}
                        <span
                          className={
                            a.tagClass +
                            ' rounded px-1.5 py-0.5 text-[0.65rem] font-bold'
                          }
                          style={
                            a.tagClass === 'tag-completed'
                              ? {
                                  backgroundColor: '#E2F0D9',
                                  color: '#4C6B4A',
                                }
                              : {
                                  backgroundColor: '#FCE4D6',
                                  color: '#C28B5E',
                                }
                          }
                        >
                          {a.tag}
                        </span>
                      </h4>
                      <p className="m-0 text-[0.8rem] text-[#666]">{a.desc}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 text-[#888]">
                      <span className="text-[0.75rem]">{a.time}</span>
                      <MoreVertical size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Popular Tools */}
          <motion.div
            variants={itemVariants}
            className="smuggler-card-shine-host relative flex flex-col rounded-xl border border-black/5 p-6"
            style={{
              backgroundColor: '#F8F4EA',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            }}
          >
            <div className="smuggler-card-shine" />
            <div className="mb-5 flex items-center justify-between">
              <h3 className="m-0 text-[1.1rem] font-extrabold text-[#111]">
                Popular Tools
              </h3>
              <button
                type="button"
                onClick={onExploreTools}
                className="text-[0.8rem] font-semibold text-[#4C6B4A] hover:underline"
              >
                View all
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {POPULAR.map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.toolId}
                    className="flex items-center gap-3.5 rounded-lg border border-black/5 bg-white/50 p-3 transition-transform duration-200 hover:-translate-y-0.5"
                    style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: t.iconBg }}
                    >
                      <Icon size={18} className="fill-current" />
                    </div>
                    <div className="flex-1">
                      <h4 className="m-0 mb-0.5 text-[0.95rem] text-[#111]">
                        {t.name}
                      </h4>
                      <p className="m-0 text-[0.75rem] text-[#666]">{t.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectTool(t.toolId)}
                      className="rounded border border-[#CCC] px-3 py-1.5 text-[0.8rem] font-semibold text-[#333] transition-all hover:bg-[#333] hover:text-white"
                    >
                      Launch
                    </button>
                  </div>
                );
              })}

              {/* Premium CTA */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                onClick={onExploreTools}
                className="relative mt-3 flex items-center justify-between overflow-hidden rounded-xl border border-[#4C6B4A] p-6 text-left"
                style={{
                  background: 'linear-gradient(135deg, #243B22, #1A2818)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                }}
              >
                <div className="relative z-10">
                  <h4 className="m-0 mb-1.5 text-[1.1rem] text-[#E4D8B4]">
                    Discover Your Next Mission
                  </h4>
                  <p className="m-0 mb-4 text-[0.8rem] text-[#888]">
                    Unlock the complete intelligence arsenal.
                  </p>
                  <span
                    className="inline-block rounded border-none px-4 py-2 font-bold text-white"
                    style={{ backgroundColor: '#4C6B4A' }}
                  >
                    Explore All Tools
                  </span>
                </div>
                <div
                  className="absolute -bottom-5 -right-5 h-[120px] w-[120px] opacity-90"
                  style={{ zIndex: 1 }}
                >
                  <img
                    src="/smuggler/the-smuggler.png"
                    alt="Smuggler"
                    className="h-full w-full object-contain"
                  />
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Right Column: Calendar + Agent Tip */}
          <div className="flex flex-col gap-6">
            {/* Content Calendar */}
            <motion.div
              variants={itemVariants}
              className="smuggler-card-shine-host relative flex flex-col rounded-xl border border-black/5 p-6"
              style={{
                backgroundColor: '#F8F4EA',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              }}
            >
              <div className="smuggler-card-shine" />
              <div className="mb-5 flex items-center justify-between">
                <h3 className="m-0 text-[1.1rem] font-extrabold text-[#111]">
                  Content Calendar
                </h3>
                <button
                  type="button"
                  onClick={onExploreTools}
                  className="text-[0.8rem] font-semibold text-[#4C6B4A] hover:underline"
                >
                  View calendar
                </button>
              </div>
              <div className="mb-4 flex items-center justify-between border-b border-dashed border-[#CCC] pb-3.5">
                <span className="text-[0.85rem] font-bold">
                  Today &bull; 29 May, 2025
                </span>
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-[#333] text-[0.7rem] font-bold text-white"
                >
                  3
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {CALENDAR_ITEMS.map((c) => (
                  <div key={c.title} className="flex items-center gap-2.5">
                    <span className="w-[60px] text-[0.75rem] text-[#666]">
                      {c.time}
                    </span>
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem]"
                      style={
                        c.platform === 'yt'
                          ? { backgroundColor: '#FF0000', color: '#fff' }
                          : c.platform === 'ig'
                            ? { backgroundColor: '#E1306C', color: '#fff' }
                            : { backgroundColor: '#1DA1F2', color: '#fff' }
                      }
                    >
                      {c.icon}
                    </div>
                    <span className="flex-1 text-[0.85rem] font-semibold">
                      {c.title}
                    </span>
                    <span
                      className={
                        c.tagClass +
                        ' rounded px-1.5 py-0.5 text-[0.65rem]'
                      }
                      style={
                        c.tagClass === 'tag-scheduled'
                          ? { border: '1px solid #CCC', color: '#666' }
                          : { backgroundColor: '#E0E0E0', color: '#666' }
                      }
                    >
                      {c.tag}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Agent Tip */}
            <motion.div
              variants={itemVariants}
              className="relative flex-1 rounded-xl border border-dashed border-[#C8BC9D] p-6"
              style={{
                background: 'linear-gradient(135deg, #F0E8D5, #E5DCB8)',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)',
              }}
            >
              <div
                className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-full font-bold text-white"
                style={{
                  backgroundColor: '#4C6B4A',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                C
              </div>
              <h4 className="m-0 mb-2.5 text-[1rem] font-bold text-[#111]">
                Agent&rsquo;s Tip
              </h4>
              <p className="m-0 text-[0.85rem] leading-relaxed text-[#444]">
                Analyze your top performing content regularly and double down on
                what your audience loves.
              </p>
              <Search
                size={48}
                className="absolute bottom-4 right-4 text-black/10"
                style={{ transform: 'rotate(15deg)' }}
              />
            </motion.div>
          </div>
        </div>

        {/* Bottom Banner */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center justify-between gap-6 rounded-xl p-6 sm:p-8 md:flex-row"
          style={{
            background: 'linear-gradient(135deg, #E5DCB8, #D8CEB7)',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.05)',
          }}
        >
          <div className="flex items-center gap-5">
            {/* Folder stack */}
            <div className="relative h-[60px] w-[80px] shrink-0">
              <div
                className="absolute h-[50px] w-[70px] rounded"
                style={{
                  backgroundColor: '#A07A2D',
                  transform: 'rotate(-5deg)',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                  borderRadius: '4px 10px 4px 4px',
                }}
              />
              <div
                className="absolute flex h-[50px] w-[70px] items-center justify-center rounded"
                style={{
                  backgroundColor: '#C09A4D',
                  transform: 'rotate(5deg)',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                  borderRadius: '4px 10px 4px 4px',
                }}
              >
                <span
                  className="rounded border-2 border-[#C43B3B] px-0.5 text-[0.4rem] font-extrabold tracking-[1px] text-[#C43B3B]"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    transform: 'rotate(-10deg)',
                  }}
                >
                  TOP SECRET
                </span>
              </div>
            </div>

            <div>
              <h3 className="m-0 mb-1 text-[1.2rem] font-bold text-[#111]">
                Your content mission is on track!
              </h3>
              <p className="m-0 text-[0.85rem] text-[#444]">
                Keep creating, optimizing, and growing. The results will follow.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <p className="m-0 text-[0.85rem] font-semibold text-[#333]">
              Trusted by 10,000+ Creators Worldwide
            </p>
            <div className="flex">
              {TRUSTED_AVATARS.map((i) => (
                <img
                  key={i}
                  src={`https://i.pravatar.cc/100?img=${i}`}
                  alt={`Creator ${i}`}
                  className="h-8 w-8 rounded-full border-2 border-[#E5DCB8] object-cover -ml-2.5 first:ml-0"
                />
              ))}
              <div
                className="z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#E5DCB8] bg-[#111] text-[0.65rem] font-bold text-white -ml-2.5"
              >
                +9.5K
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

export default DashboardView;
