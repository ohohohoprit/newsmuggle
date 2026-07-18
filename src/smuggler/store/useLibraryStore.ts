"use client";

import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

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



/* ---------- API helpers ---------- */

async function apiGet(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

async function apiPut(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`);
  return res.json();
}

async function apiDelete(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`);
  return res.json();
}

/* ---------- Store ---------- */

interface LibraryState {
  items: LibraryItem[];
  folders: LibraryFolder[];
  activity: LibraryActivity[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  rehydrate: () => Promise<void>;

  /* Folder CRUD */
  createFolder: (name: string, color?: string, parentId?: string | null) => Promise<string>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFolder: (id: string, parentId: string | null) => Promise<void>;

  /* Item CRUD */
  addItem: (item: Omit<LibraryItem, "id" | "createdAt" | "updatedAt">) => Promise<string>;
  updateItem: (id: string, updates: Partial<LibraryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  duplicateItem: (id: string) => Promise<void>;
  moveItemToFolder: (id: string, folderId: string | null) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;

  /* Bulk */
  bulkDelete: (ids: string[]) => Promise<void>;
  bulkMove: (ids: string[], folderId: string | null) => Promise<void>;
  bulkArchive: (ids: string[]) => Promise<void>;
  clearTrash: () => Promise<void>;

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
  loading: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated) return;
    set({ loading: true, error: null });

    const isAuthenticated = useAuthStore.getState().status === 'authenticated';

    if (isAuthenticated) {
      try {
        const items = await apiGet("/api/library/items");
        save(ITEMS_KEY, items);
        set({ items });
      } catch {
        set({ items: load<LibraryItem[]>(ITEMS_KEY, []) });
      }

      try {
        const folders = await apiGet("/api/library/folders");
        save(FOLDERS_KEY, folders);
        set({ folders });
      } catch {
        set({ folders: load<LibraryFolder[]>(FOLDERS_KEY, []) });
      }

      try {
        const activity = await apiGet("/api/library/activity");
        save(ACTIVITY_KEY, activity);
        set({ activity });
      } catch {
        set({ activity: load<LibraryActivity[]>(ACTIVITY_KEY, []) });
      }
    } else {
      set({
        items: load<LibraryItem[]>(ITEMS_KEY, []),
        folders: load<LibraryFolder[]>(FOLDERS_KEY, []),
        activity: load<LibraryActivity[]>(ACTIVITY_KEY, []),
      });
    }

    set({ hydrated: true, loading: false });
  },

  rehydrate: async () => {
    set({ hydrated: false });
    await get().hydrate();
  },

  createFolder: async (name, color, parentId) => {
    const folder: LibraryFolder = {
      id: uid(),
      name,
      color: color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
      parentId: parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const prevFolders = get().folders;
    set((s) => {
      const folders = [...s.folders, folder];
      return { folders };
    });
    try {
      await apiPost("/api/library/folders", { name: folder.name, color: folder.color, parentId: folder.parentId });
      save(FOLDERS_KEY, get().folders);
    } catch {
      set({ folders: prevFolders });
    }
    return folder.id;
  },

  renameFolder: async (id, name) => {
    const prevFolders = get().folders;
    set((s) => {
      const folders = s.folders.map((f) => (f.id === id ? { ...f, name, updatedAt: Date.now() } : f));
      return { folders };
    });
    try {
      await apiPut(`/api/library/folders/${id}`, { name });
      save(FOLDERS_KEY, get().folders);
    } catch {
      set({ folders: prevFolders });
    }
  },

  deleteFolder: async (id) => {
    const prevItems = get().items;
    const prevFolders = get().folders;
    set((s) => {
      const items = s.items.map((it) => (it.folderId === id ? { ...it, folderId: null } : it));
      const folders = s.folders.filter((f) => f.id !== id);
      return { items, folders };
    });
    try {
      await apiDelete(`/api/library/folders/${id}`);
      save(ITEMS_KEY, get().items);
      save(FOLDERS_KEY, get().folders);
    } catch {
      set({ items: prevItems, folders: prevFolders });
    }
  },

  moveFolder: async (id, parentId) => {
    const prevFolders = get().folders;
    set((s) => {
      const folders = s.folders.map((f) => (f.id === id ? { ...f, parentId, updatedAt: Date.now() } : f));
      return { folders };
    });
    try {
      await apiPut(`/api/library/folders/${id}`, { parentId });
      save(FOLDERS_KEY, get().folders);
    } catch {
      set({ folders: prevFolders });
    }
  },

  addItem: async (item) => {
    const id = uid();
    const now = Date.now();
    const newItem: LibraryItem = { ...item, id, createdAt: now, updatedAt: now };
    const prevItems = get().items;
    set((s) => {
      const items = [newItem, ...s.items];
      return { items };
    });
    try {
      await apiPost("/api/library/items", {
        title: newItem.title,
        content: newItem.content,
        type: newItem.type,
        toolName: newItem.toolName,
        category: newItem.category,
        folderId: newItem.folderId,
        tags: newItem.tags,
        favorite: newItem.favorite,
        pinned: newItem.pinned,
        status: newItem.status,
        score: newItem.score,
      });
      save(ITEMS_KEY, get().items);
    } catch (e) {
      set({ items: prevItems });
      throw e;
    }
    return id;
  },

  updateItem: async (id, updates) => {
    const prevItems = get().items;
    set((s) => {
      const items = s.items.map((it) => (it.id === id ? { ...it, ...updates, updatedAt: Date.now() } : it));
      return { items };
    });
    try {
      await apiPut(`/api/library/items/${id}`, updates);
      save(ITEMS_KEY, get().items);
    } catch {
      set({ items: prevItems });
    }
  },

  deleteItem: async (id) => {
    await get().updateItem(id, { status: "trash" as LibraryItemStatus });
  },

  permanentDelete: async (id) => {
    const prevItems = get().items;
    set((s) => {
      const items = s.items.filter((it) => it.id !== id);
      return { items };
    });
    try {
      await apiDelete(`/api/library/items/${id}`);
      save(ITEMS_KEY, get().items);
    } catch {
      set({ items: prevItems });
    }
  },

  restoreItem: async (id) => {
    await get().updateItem(id, { status: "active" as LibraryItemStatus });
  },

  duplicateItem: async (id) => {
    const item = get().items.find((it) => it.id === id);
    if (!item) return;
    try {
      await get().addItem({
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
    } catch {
      /* addItem already rolled back state */
    }
  },

  moveItemToFolder: async (id, folderId) => {
    await get().updateItem(id, { folderId });
  },

  toggleFavorite: async (id) => {
    const item = get().items.find((it) => it.id === id);
    if (item) await get().updateItem(id, { favorite: !item.favorite });
  },

  togglePin: async (id) => {
    const item = get().items.find((it) => it.id === id);
    if (item) await get().updateItem(id, { pinned: !item.pinned });
  },

  bulkDelete: async (ids) => {
    for (const id of ids) {
      await get().updateItem(id, { status: "trash" as LibraryItemStatus });
    }
  },

  bulkMove: async (ids, folderId) => {
    for (const id of ids) {
      await get().updateItem(id, { folderId });
    }
  },

  bulkArchive: async (ids) => {
    for (const id of ids) {
      await get().updateItem(id, { status: "archived" as LibraryItemStatus });
    }
  },

  clearTrash: async () => {
    const trashIds = get().items.filter((it) => it.status === "trash").map((it) => it.id);
    for (const id of trashIds) {
      const prevItems = get().items;
      set((s) => {
        const items = s.items.filter((it) => it.id !== id);
        return { items };
      });
      try {
        await apiDelete(`/api/library/items/${id}`);
        save(ITEMS_KEY, get().items);
      } catch {
        set({ items: prevItems });
      }
    }
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
