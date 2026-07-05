"use client";

import { create } from "zustand";

/* ---------- Types ---------- */

export type LibraryItemType =
  | "hook"
  | "title"
  | "script"
  | "caption"
  | "thumbnail"
  | "ai-output"
  | "repurposed"
  | "invoice"
  | "calendar"
  | "brand-asset"
  | "media"
  | "template"
  | "prompt"
  | "export"
  | "document";

export type LibraryItemStatus = "active" | "draft" | "archived" | "trash";

export interface LibraryItem {
  id: string;
  title: string;
  content: string;
  type: LibraryItemType;
  toolName: string;
  category: string;
  folderId: string | null;
  tags: string[];
  favorite: boolean;
  pinned: boolean;
  status: LibraryItemStatus;
  createdAt: number;
  updatedAt: number;
  score?: number;
}

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryActivity {
  id: string;
  action: string;
  itemTitle: string;
  itemType: LibraryItemType;
  timestamp: number;
}

/* ---------- Storage helpers ---------- */

const ITEMS_KEY = "smuggler:library:items";
const FOLDERS_KEY = "smuggler:library:folders";
const ACTIVITY_KEY = "smuggler:library:activity";

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

/* ---------- Seed data (first visit) ---------- */

const SEED_FOLDERS: LibraryFolder[] = [
  { id: "f-yt", name: "YouTube Content", color: "#FF0000", parentId: null, createdAt: Date.now() - 86400000 * 7, updatedAt: Date.now() - 86400000 * 2 },
  { id: "f-social", name: "Social Media", color: "#E1306C", parentId: null, createdAt: Date.now() - 86400000 * 6, updatedAt: Date.now() - 86400000 },
  { id: "f-scripts", name: "Scripts & Ideas", color: "#4C6B4A", parentId: null, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now() - 86400000 * 3 },
  { id: "f-brand", name: "Brand Assets", color: "#C09858", parentId: null, createdAt: Date.now() - 86400000 * 4, updatedAt: Date.now() - 86400000 * 7 },
  { id: "f-invoices", name: "Invoices", color: "#3B648C", parentId: null, createdAt: Date.now() - 86400000 * 3, updatedAt: Date.now() - 86400000 * 5 },
];

const SEED_ITEMS: LibraryItem[] = [
  { id: uid(), title: "5 Habits of Successful Creators", content: "Hook: The 5 AM routine that 7-figure creators swear by (and it's not what you think)...", type: "hook", toolName: "Hook Generator", category: "SEO", folderId: "f-yt", tags: ["productivity", "creators"], favorite: true, pinned: true, status: "active", createdAt: Date.now() - 7200000, updatedAt: Date.now() - 7200000, score: 92 },
  { id: uid(), title: "YouTube Script: Productivity Hacks", content: "Hey everyone, today I'm sharing 5 productivity hacks that saved me 10+ hours every week...", type: "script", toolName: "Script Writer", category: "Writing", folderId: "f-scripts", tags: ["youtube", "script"], favorite: false, pinned: false, status: "active", createdAt: Date.now() - 14400000, updatedAt: Date.now() - 14400000, score: 88 },
  { id: uid(), title: "Instagram Caption Pack", content: "Day 1: Stop scrolling. This changes everything. Day 2: The productivity hack nobody talks about...", type: "caption", toolName: "Caption Generator", category: "Social Media", folderId: "f-social", tags: ["instagram", "captions"], favorite: true, pinned: false, status: "active", createdAt: Date.now() - 21600000, updatedAt: Date.now() - 21600000, score: 85 },
  { id: uid(), title: "Brand Voice Guide", content: "Tone: Confident but approachable. Vocabulary: Professional with casual touches. avoid jargon...", type: "brand-asset", toolName: "Brand Voice Generator", category: "Business", folderId: "f-brand", tags: ["branding", "voice"], favorite: false, pinned: true, status: "active", createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000 },
  { id: uid(), title: "Invoice: TechFlow Sponsorship", content: "Invoice #2024-045. Client: TechFlow Inc. Amount: $5,000. Net 30...", type: "invoice", toolName: "Invoice Generator", category: "Business", folderId: "f-invoices", tags: ["invoice", "sponsorship"], favorite: false, pinned: false, status: "active", createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000 },
  { id: uid(), title: "Blog to Twitter Thread", content: "Thread: I spent 30 days testing productivity apps. Here's what actually works (thread) 1/", type: "repurposed", toolName: "Blog to Twitter", category: "Repurposing", folderId: "f-yt", tags: ["twitter", "thread"], favorite: false, pinned: false, status: "active", createdAt: Date.now() - 259200000, updatedAt: Date.now() - 259200000, score: 79 },
  { id: uid(), title: "Podcast Outline: Morning Routines", content: "Episode 42. Intro (2 min), Guest intro (3 min), Discussion (20 min), Q&A (5 min)...", type: "script", toolName: "Podcast Script Writer", category: "Video", folderId: "f-scripts", tags: ["podcast", "outline"], favorite: true, pinned: false, status: "draft", createdAt: Date.now() - 345600000, updatedAt: Date.now() - 345600000 },
  { id: uid(), title: "Thumbnail Concept: Shock + Arrow", content: "Layout: Left 60% shocked face, right 40% product with red arrow. Text: INSANE...", type: "thumbnail", toolName: "Thumbnail Creator", category: "Video", folderId: "f-yt", tags: ["thumbnail", "youtube"], favorite: false, pinned: false, status: "active", createdAt: Date.now() - 432000000, updatedAt: Date.now() - 432000000, score: 91 },
  { id: uid(), title: "Email Newsletter Draft", content: "Subject: This week's top 3 productivity finds. Hey friends, this week I discovered...", type: "ai-output", toolName: "AI Writer", category: "Writing", folderId: null, tags: ["email", "newsletter"], favorite: false, pinned: false, status: "draft", createdAt: Date.now() - 518400000, updatedAt: Date.now() - 518400000 },
  { id: uid(), title: "Meta Description: Productivity Blog", content: "Discover 10 proven productivity hacks that top creators use daily. Save time and boost output...", type: "ai-output", toolName: "Meta Description Generator", category: "SEO", folderId: null, tags: ["seo", "meta"], favorite: false, pinned: false, status: "active", createdAt: Date.now() - 604800000, updatedAt: Date.now() - 604800000 },
];

const SEED_ACTIVITY: LibraryActivity[] = [
  { id: uid(), action: "generated", itemTitle: "5 Habits of Successful Creators", itemType: "hook", timestamp: Date.now() - 7200000 },
  { id: uid(), action: "exported", itemTitle: "YouTube Script: Productivity Hacks", itemType: "script", timestamp: Date.now() - 14400000 },
  { id: uid(), action: "created", itemTitle: "Invoice: TechFlow Sponsorship", itemType: "invoice", timestamp: Date.now() - 172800000 },
  { id: uid(), action: "edited", itemTitle: "Brand Voice Guide", itemType: "brand-asset", timestamp: Date.now() - 86400000 },
];

/* ---------- Store ---------- */

interface LibraryState {
  items: LibraryItem[];
  folders: LibraryFolder[];
  activity: LibraryActivity[];
  hydrated: boolean;

  hydrate: () => void;

  /* Folder CRUD */
  createFolder: (name: string, color?: string, parentId?: string | null) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;

  /* Item CRUD */
  addItem: (item: Omit<LibraryItem, "id" | "createdAt" | "updatedAt">) => string;
  updateItem: (id: string, updates: Partial<LibraryItem>) => void;
  deleteItem: (id: string) => void; // soft-delete → trash
  permanentDelete: (id: string) => void;
  restoreItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  moveItemToFolder: (id: string, folderId: string | null) => void;
  toggleFavorite: (id: string) => void;
  togglePin: (id: string) => void;

  /* Bulk */
  bulkDelete: (ids: string[]) => void;
  bulkMove: (ids: string[], folderId: string | null) => void;
  bulkArchive: (ids: string[]) => void;
  clearTrash: () => void;

  /* Query helpers */
  itemsInFolder: (folderId: string) => LibraryItem[];
  itemCount: (folderId: string) => number;
}

const FOLDER_COLORS = ["#FF0000", "#E1306C", "#4C6B4A", "#C09858", "#3B648C", "#624B8B", "#C28B5E", "#B87B3E"];

export const useLibraryStore = create<LibraryState>((set, get) => ({
  items: [],
  folders: [],
  activity: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const items = load<LibraryItem[]>(ITEMS_KEY, SEED_ITEMS);
    const folders = load<LibraryFolder[]>(FOLDERS_KEY, SEED_FOLDERS);
    const activity = load<LibraryActivity[]>(ACTIVITY_KEY, SEED_ACTIVITY);
    set({ items, folders, activity, hydrated: true });
  },

  createFolder: (name, color, parentId) => {
    const folder: LibraryFolder = {
      id: uid(),
      name,
      color: color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      parentId: parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((s) => {
      const folders = [...s.folders, folder];
      save(FOLDERS_KEY, folders);
      return { folders };
    });
    return folder.id;
  },

  renameFolder: (id, name) => {
    set((s) => {
      const folders = s.folders.map((f) => (f.id === id ? { ...f, name, updatedAt: Date.now() } : f));
      save(FOLDERS_KEY, folders);
      return { folders };
    });
  },

  deleteFolder: (id) => {
    set((s) => {
      // Move items in folder to unsorted, delete folder
      const items = s.items.map((it) => (it.folderId === id ? { ...it, folderId: null } : it));
      const folders = s.folders.filter((f) => f.id !== id);
      save(ITEMS_KEY, items);
      save(FOLDERS_KEY, folders);
      return { items, folders };
    });
  },

  moveFolder: (id, parentId) => {
    set((s) => {
      const folders = s.folders.map((f) => (f.id === id ? { ...f, parentId, updatedAt: Date.now() } : f));
      save(FOLDERS_KEY, folders);
      return { folders };
    });
  },

  addItem: (item) => {
    const id = uid();
    const now = Date.now();
    const newItem: LibraryItem = { ...item, id, createdAt: now, updatedAt: now };
    const activity: LibraryActivity = { id: uid(), action: "saved", itemTitle: newItem.title, itemType: newItem.type, timestamp: now };
    set((s) => {
      const items = [newItem, ...s.items];
      const acts = [activity, ...s.activity].slice(0, 50);
      save(ITEMS_KEY, items);
      save(ACTIVITY_KEY, acts);
      return { items, activity: acts };
    });
    return id;
  },

  updateItem: (id, updates) => {
    set((s) => {
      const items = s.items.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: Date.now() } : it));
      save(ITEMS_KEY, items);
      return { items };
    });
  },

  deleteItem: (id) => {
    get().updateItem(id, { status: "trash" as LibraryItemStatus });
  },

  permanentDelete: (id) => {
    set((s) => {
      const items = s.items.filter((it) => it.id !== id);
      save(ITEMS_KEY, items);
      return { items };
    });
  },

  restoreItem: (id) => {
    get().updateItem(id, { status: "active" as LibraryItemStatus });
  },

  duplicateItem: (id) => {
    const item = get().items.find((it) => it.id === id);
    if (!item) return;
    get().addItem({
      title: item.title + " (copy)",
      content: item.content,
      type: item.type,
      toolName: item.toolName,
      category: item.category,
      folderId: item.folderId,
      tags: item.tags,
      favorite: false,
      pinned: false,
      status: "active",
      score: item.score,
    });
  },

  moveItemToFolder: (id, folderId) => {
    get().updateItem(id, { folderId });
  },

  toggleFavorite: (id) => {
    const item = get().items.find((it) => it.id === id);
    if (item) get().updateItem(id, { favorite: !item.favorite });
  },

  togglePin: (id) => {
    const item = get().items.find((it) => it.id === id);
    if (item) get().updateItem(id, { pinned: !item.pinned });
  },

  bulkDelete: (ids) => {
    ids.forEach((id) => get().updateItem(id, { status: "trash" as LibraryItemStatus }));
  },

  bulkMove: (ids, folderId) => {
    ids.forEach((id) => get().updateItem(id, { folderId }));
  },

  bulkArchive: (ids) => {
    ids.forEach((id) => get().updateItem(id, { status: "archived" as LibraryItemStatus }));
  },

  clearTrash: () => {
    set((s) => {
      const items = s.items.filter((it) => it.status !== "trash");
      save(ITEMS_KEY, items);
      return { items };
    });
  },

  itemsInFolder: (folderId) => get().items.filter((it) => it.folderId === folderId && it.status !== "trash"),
  itemCount: (folderId) => get().items.filter((it) => it.folderId === folderId && it.status !== "trash").length,
}));

/* ---------- Helpers ---------- */

export const LIBRARY_TYPE_ICONS: Record<LibraryItemType, string> = {
  hook: "✦",
  title: "T",
  script: "📄",
  caption: "💬",
  thumbnail: "🖼",
  "ai-output": "🤖",
  repurposed: "🔄",
  invoice: "🧾",
  calendar: "📅",
  "brand-asset": "🎨",
  media: "🎬",
  template: "📋",
  prompt: "🔮",
  export: "📦",
  document: "📑",
};

export const LIBRARY_TYPE_LABELS: Record<LibraryItemType, string> = {
  hook: "Hook",
  title: "Title",
  script: "Script",
  caption: "Caption",
  thumbnail: "Thumbnail",
  "ai-output": "AI Output",
  repurposed: "Repurposed",
  invoice: "Invoice",
  calendar: "Calendar",
  "brand-asset": "Brand Asset",
  media: "Media",
  template: "Template",
  prompt: "Prompt",
  export: "Export",
  document: "Document",
};

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w ago`;
  return new Date(ts).toLocaleDateString();
}
