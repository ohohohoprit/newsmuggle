"use client";

import { create } from "zustand";
import type { ToolCategory } from "../data/tools";

export type SortOption =
  | "Most Popular"
  | "Most Used"
  | "Newest"
  | "Alphabetical A-Z"
  | "Alphabetical Z-A";

export type PopularityFilter = "All" | "Most Popular" | "Newest" | "Most Used";

interface ToolsState {
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  activeCategories: Exclude<ToolCategory, "All">[];
  toggleCategory: (cat: Exclude<ToolCategory, "All">) => void;
  clearCategories: () => void;

  popularityFilter: PopularityFilter;
  setPopularityFilter: (p: PopularityFilter) => void;

  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  activeCategories: [],
  toggleCategory: (cat) =>
    set((s) => ({
      activeCategories: s.activeCategories.includes(cat)
        ? s.activeCategories.filter((c) => c !== cat)
        : [...s.activeCategories, cat],
    })),
  clearCategories: () => set({ activeCategories: [] }),

  popularityFilter: "All",
  setPopularityFilter: (p) => set({ popularityFilter: p }),

  sortBy: "Most Popular",
  setSortBy: (s) => set({ sortBy: s }),

  favorites: [],
  toggleFavorite: (id) =>
    set((s) => ({
      favorites: s.favorites.includes(id)
        ? s.favorites.filter((f) => f !== id)
        : [...s.favorites, id],
    })),
}));

// Helper to parse uses strings like "1.2M", "850K" into numbers
export const parseUses = (useString: string): number => {
  if (!useString) return 0;
  const numMatch = useString.match(/[\d.]+/);
  const suffixMatch = useString.match(/[KM]/);
  if (!numMatch) return 0;
  let num = parseFloat(numMatch[0]);
  if (suffixMatch && suffixMatch[0] === "M") num *= 1_000_000;
  else if (suffixMatch && suffixMatch[0] === "K") num *= 1_000;
  return num;
};
