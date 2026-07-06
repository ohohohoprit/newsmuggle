"use client";

import { create } from "zustand";

/* ---------- Types ---------- */

export type PlatformId =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "twitch"
  | "pinterest"
  | "reddit"
  | "discord";

export interface SocialAccount {
  id: string;
  platform: PlatformId;
  username: string;
  connected: boolean;
  avatar: string;
  followers: number;
  views: number;
  subscribers: number;
  engagement: number; // %
  lastSync: number;
  health: "good" | "warning" | "error";
}

export interface StudioGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  color: string;
  createdAt: number;
}

export interface StudioActivity {
  id: string;
  icon: string;
  text: string;
  time: number;
  color: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  why: string;
  how: string;
  toolId: string;
  toolName: string;
  expectedImpact: string;
  severity: "info" | "warning" | "success";
  color: string;
}

export interface CalendarItem {
  id: string;
  time: string;
  title: string;
  platform: PlatformId;
  status: "done" | "scheduled" | "missed" | "idea";
}

export interface ContentItem {
  id: string;
  title: string;
  platform: PlatformId;
  views: number;
  engagement: number;
  type: "video" | "short" | "reel" | "post" | "tweet" | "stream";
  publishedAt: number;
  trend: "up" | "down" | "stable";
}

export interface DemographicData {
  label: string;
  value: number;
  color: string;
}

/* ---------- Platform metadata ---------- */

export const PLATFORM_META: Record<PlatformId, { name: string; color: string; icon: string }> = {
  youtube: { name: "YouTube", color: "#FF0000", icon: "▶" },
  instagram: { name: "Instagram", color: "#E1306C", icon: "📸" },
  tiktok: { name: "TikTok", color: "#000000", icon: "🎵" },
  twitter: { name: "X (Twitter)", color: "#1DA1F2", icon: "🐦" },
  facebook: { name: "Facebook", color: "#1877F2", icon: "f" },
  linkedin: { name: "LinkedIn", color: "#0A66C2", icon: "in" },
  twitch: { name: "Twitch", color: "#9146FF", icon: "📺" },
  pinterest: { name: "Pinterest", color: "#E60023", icon: "📌" },
  reddit: { name: "Reddit", color: "#FF4500", icon: "🤖" },
  discord: { name: "Discord", color: "#5865F2", icon: "💬" },
};

/* ---------- Storage ---------- */

const ACCOUNTS_KEY = "smuggler:studio:accounts";
const GOALS_KEY = "smuggler:studio:goals";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Seed data ---------- */

const SEED_ACCOUNTS: SocialAccount[] = [
  { id: uid(), platform: "youtube", username: "@agentsmith", connected: true, avatar: "https://i.pravatar.cc/100?img=11", followers: 125400, views: 2480000, subscribers: 89200, engagement: 6.32, lastSync: Date.now() - 3600000, health: "good" },
  { id: uid(), platform: "instagram", username: "@agentsmith.content", connected: true, avatar: "https://i.pravatar.cc/100?img=12", followers: 89200, views: 1200000, subscribers: 0, engagement: 4.8, lastSync: Date.now() - 7200000, health: "good" },
  { id: uid(), platform: "tiktok", username: "@agent.smuggler", connected: true, avatar: "https://i.pravatar.cc/100?img=13", followers: 234000, views: 5600000, subscribers: 0, engagement: 8.2, lastSync: Date.now() - 10800000, health: "warning" },
  { id: uid(), platform: "twitter", username: "@contentsmuggler", connected: true, avatar: "https://i.pravatar.cc/100?img=14", followers: 45600, views: 890000, subscribers: 0, engagement: 3.1, lastSync: Date.now() - 14400000, health: "good" },
  { id: uid(), platform: "linkedin", username: "Agent Smith", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
  { id: uid(), platform: "facebook", username: "", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
  { id: uid(), platform: "twitch", username: "", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
  { id: uid(), platform: "pinterest", username: "", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
  { id: uid(), platform: "reddit", username: "", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
  { id: uid(), platform: "discord", username: "", connected: false, avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" },
];

const SEED_GOALS: StudioGoal[] = [
  { id: uid(), title: "Reach 150K YouTube Subscribers", current: 89200, target: 150000, unit: "subs", color: "#FF0000", createdAt: Date.now() - 86400000 * 30 },
  { id: uid(), title: "1M Monthly Views", current: 620000, target: 1000000, unit: "views", color: "#4C6B4A", createdAt: Date.now() - 86400000 * 20 },
  { id: uid(), title: "50K Instagram Followers", current: 89200, target: 50000, unit: "followers", color: "#E1306C", createdAt: Date.now() - 86400000 * 15 },
  { id: uid(), title: "Weekly Posting Goal", current: 4, target: 7, unit: "posts", color: "#C09858", createdAt: Date.now() - 86400000 * 7 },
];

const SEED_ACTIVITIES: StudioActivity[] = [
  { id: uid(), icon: "▶", text: "YouTube video published: \"5 Productivity Hacks\"", time: Date.now() - 300000, color: "#FF0000" },
  { id: uid(), icon: "📸", text: "Instagram post published: Behind the scenes", time: Date.now() - 3600000, color: "#E1306C" },
  { id: uid(), icon: "🎵", text: "TikTok video published: 60-second hook test", time: Date.now() - 7200000, color: "#000000" },
  { id: uid(), icon: "👥", text: "New subscriber @creative.mind_joined", time: Date.now() - 10800000, color: "#4C6B4A" },
  { id: uid(), icon: "💰", text: "Payment received: ₹2,499 from TechFlow", time: Date.now() - 14400000, color: "#C09858" },
  { id: uid(), icon: "🐦", text: "Tweet went viral: 12K impressions", time: Date.now() - 18000000, color: "#1DA1F2" },
];

const AI_INSIGHTS: AIInsight[] = [
  {
    id: "insight-1",
    title: "Best time to post on YouTube is 10:00 AM – 12:00 PM",
    description: "Your audience is most active between 10 AM and 12 PM. Videos published in this window get 23% more views.",
    why: "Your audience retention data shows peak activity during late morning hours on weekdays.",
    how: "Schedule your next 3 YouTube videos between 10 AM and 12 PM using the Content Calendar.",
    toolId: "content-calendar",
    toolName: "Content Calendar",
    expectedImpact: "+23% more views",
    severity: "success",
    color: "var(--smuggler-accent-green)",
  },
  {
    id: "insight-2",
    title: "Shorts with hooks in the first 3 seconds get 62% more retention",
    description: "Your Shorts that open with a strong hook retain viewers 62% longer than those that don't.",
    why: "Analysis of your last 20 Shorts shows a direct correlation between hook strength and retention rate.",
    how: "Use the Hook Generator to create scroll-stopping opening lines for every Short before recording.",
    toolId: "hook-generator",
    toolName: "Hook Generator",
    expectedImpact: "+62% retention",
    severity: "warning",
    color: "#E1306C",
  },
  {
    id: "insight-3",
    title: "Your titles are 18% longer than top-performing videos",
    description: "Videos with titles under 60 characters perform 34% better in your channel.",
    why: "Longer titles get truncated in search results and recommendations, reducing CTR.",
    how: "Run your next 5 video titles through the Title Optimizer to shorten and punch them up.",
    toolId: "title-optimizer",
    toolName: "Title Optimizer",
    expectedImpact: "+34% CTR",
    severity: "warning",
    color: "#3B648C",
  },
  {
    id: "insight-4",
    title: "Your first 15 seconds lose 38% of viewers",
    description: "Your video intros are too slow. 38% of viewers drop off before the 15-second mark.",
    why: "Your intros average 22 seconds before reaching the main content, causing early drop-off.",
    how: "Use the Script Writer to create fast-paced intros that hook viewers in the first 5 seconds.",
    toolId: "script-writer",
    toolName: "Script Writer",
    expectedImpact: "-38% drop-off",
    severity: "warning",
    color: "#9B3D3D",
  },
  {
    id: "insight-5",
    title: "You gained 2.4K followers this week! Keep it up!",
    description: "Your follower growth is up 18% compared to last week across all connected platforms.",
    why: "Consistent posting and improved engagement rates are driving organic growth.",
    how: "Maintain your current posting schedule and use the Repurpose Engine to multiply your content.",
    toolId: "repurpose-engine",
    toolName: "Repurpose Engine",
    expectedImpact: "Sustain +18% growth",
    severity: "success",
    color: "var(--smuggler-accent-green)",
  },
  {
    id: "insight-6",
    title: "Your thumbnails have low contrast on mobile",
    description: "67% of your views come from mobile, but your thumbnails use low-contrast colors.",
    why: "Mobile screens reduce color vibrancy. Low-contrast thumbnails are harder to read at small sizes.",
    how: "Run your thumbnail designs through the Thumbnail Analyzer for mobile-specific recommendations.",
    toolId: "thumbnail-analyzer",
    toolName: "Thumbnail Analyzer",
    expectedImpact: "+15% mobile CTR",
    severity: "warning",
    color: "#624B8B",
  },
];

const CALENDAR_ITEMS: CalendarItem[] = [
  { id: uid(), time: "10:00 AM", title: "Record YouTube Video", platform: "youtube", status: "done" },
  { id: uid(), time: "1:30 PM", title: "Edit & Publish Short", platform: "tiktok", status: "done" },
  { id: uid(), time: "5:00 PM", title: "Post on Instagram", platform: "instagram", status: "scheduled" },
  { id: uid(), time: "7:00 PM", title: "Engage with Community", platform: "twitter", status: "scheduled" },
];

const TOP_CONTENT: ContentItem[] = [
  { id: uid(), title: "5 Productivity Hacks That Changed My Life", platform: "youtube", views: 142000, engagement: 8.4, type: "video", publishedAt: Date.now() - 86400000 * 2, trend: "up" },
  { id: uid(), title: "The AI Tool That Saves 10 Hours a Week", platform: "youtube", views: 98000, engagement: 7.2, type: "video", publishedAt: Date.now() - 86400000 * 5, trend: "up" },
  { id: uid(), title: "Stop Doing This in Your Videos", platform: "tiktok", views: 540000, engagement: 12.1, type: "short", publishedAt: Date.now() - 86400000, trend: "up" },
  { id: uid(), title: "Behind the Scenes: My Setup", platform: "instagram", views: 42000, engagement: 5.8, type: "reel", publishedAt: Date.now() - 86400000 * 3, trend: "stable" },
  { id: uid(), title: "Why 99% of Creators Fail", platform: "youtube", views: 31000, engagement: 3.2, type: "video", publishedAt: Date.now() - 86400000 * 7, trend: "down" },
];

const DEMOGRAPHICS_AGE: DemographicData[] = [
  { label: "18-24", value: 32, color: "#4C6B4A" },
  { label: "25-34", value: 41, color: "#C09858" },
  { label: "35-44", value: 18, color: "#3B648C" },
  { label: "45-54", value: 7, color: "#624B8B" },
  { label: "55+", value: 2, color: "#C28B5E" },
];

const DEMOGRAPHICS_GEO: DemographicData[] = [
  { label: "United States", value: 38, color: "#4C6B4A" },
  { label: "India", value: 22, color: "#C09858" },
  { label: "United Kingdom", value: 12, color: "#3B648C" },
  { label: "Canada", value: 9, color: "#624B8B" },
  { label: "Australia", value: 7, color: "#C28B5E" },
  { label: "Others", value: 12, color: "#9A9386" },
];

const TRAFFIC_SOURCES: DemographicData[] = [
  { label: "Search", value: 42, color: "#4C6B4A" },
  { label: "Browse", value: 28, color: "#C09858" },
  { label: "Suggested", value: 18, color: "#3B648C" },
  { label: "External", value: 8, color: "#624B8B" },
  { label: "Direct", value: 4, color: "#C28B5E" },
];

/* ---------- Store ---------- */

interface StudioState {
  accounts: SocialAccount[];
  goals: StudioGoal[];
  activities: StudioActivity[];
  insights: AIInsight[];
  calendar: CalendarItem[];
  topContent: ContentItem[];
  demographicsAge: DemographicData[];
  demographicsGeo: DemographicData[];
  trafficSources: DemographicData[];
  hydrated: boolean;
  selectedTimeframe: "7d" | "28d" | "90d";

  hydrate: () => void;
  setTimeframe: (t: "7d" | "28d" | "90d") => void;

  /* Account actions */
  connectAccount: (platform: PlatformId) => void;
  disconnectAccount: (id: string) => void;
  refreshAccount: (id: string) => void;

  /* Goal actions */
  createGoal: (title: string, target: number, unit: string, color: string) => void;
  updateGoalProgress: (id: string, current: number) => void;
  deleteGoal: (id: string) => void;

  /* Calendar */
  toggleCalendarItem: (id: string) => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  accounts: [],
  goals: [],
  activities: SEED_ACTIVITIES,
  insights: AI_INSIGHTS,
  calendar: CALENDAR_ITEMS,
  topContent: TOP_CONTENT,
  demographicsAge: DEMOGRAPHICS_AGE,
  demographicsGeo: DEMOGRAPHICS_GEO,
  trafficSources: TRAFFIC_SOURCES,
  hydrated: false,
  selectedTimeframe: "28d",

  hydrate: () => {
    if (get().hydrated) return;
    const accounts = load<SocialAccount[]>(ACCOUNTS_KEY, SEED_ACCOUNTS);
    const goals = load<StudioGoal[]>(GOALS_KEY, SEED_GOALS);
    set({ accounts, goals, hydrated: true });
  },

  setTimeframe: (t) => set({ selectedTimeframe: t }),

  connectAccount: (platform) => {
    set((s) => {
      const accounts = s.accounts.map((a) =>
        a.platform === platform
          ? {
              ...a,
              connected: true,
              username: `@${platform}_creator`,
              avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`,
              followers: Math.floor(Math.random() * 50000) + 5000,
              views: Math.floor(Math.random() * 500000) + 50000,
              subscribers: platform === "youtube" ? Math.floor(Math.random() * 50000) + 5000 : 0,
              engagement: parseFloat((Math.random() * 8 + 2).toFixed(1)),
              lastSync: Date.now(),
              health: "good" as const,
            }
          : a
      );
      save(ACCOUNTS_KEY, accounts);
      return { accounts };
    });
  },

  disconnectAccount: (id) => {
    set((s) => {
      const accounts = s.accounts.map((a) =>
        a.id === id
          ? { ...a, connected: false, username: "", avatar: "", followers: 0, views: 0, subscribers: 0, engagement: 0, lastSync: 0, health: "error" as const }
          : a
      );
      save(ACCOUNTS_KEY, accounts);
      return { accounts };
    });
  },

  refreshAccount: (id) => {
    set((s) => {
      const accounts = s.accounts.map((a) =>
        a.id === id
          ? {
              ...a,
              lastSync: Date.now(),
              followers: a.followers + Math.floor(Math.random() * 200),
              views: a.views + Math.floor(Math.random() * 5000),
              health: "good" as const,
            }
          : a
      );
      save(ACCOUNTS_KEY, accounts);
      return { accounts };
    });
  },

  createGoal: (title, target, unit, color) => {
    const goal: StudioGoal = { id: uid(), title, current: 0, target, unit, color, createdAt: Date.now() };
    set((s) => {
      const goals = [...s.goals, goal];
      save(GOALS_KEY, goals);
      return { goals };
    });
  },

  updateGoalProgress: (id, current) => {
    set((s) => {
      const goals = s.goals.map((g) => (g.id === id ? { ...g, current } : g));
      save(GOALS_KEY, goals);
      return { goals };
    });
  },

  deleteGoal: (id) => {
    set((s) => {
      const goals = s.goals.filter((g) => g.id !== id);
      save(GOALS_KEY, goals);
      return { goals };
    });
  },

  toggleCalendarItem: (id) => {
    set((s) => ({
      calendar: s.calendar.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "done" ? "scheduled" : ("done" as const) }
          : c
      ),
    }));
  },
}));

/* ---------- Helpers ---------- */

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString();
}
