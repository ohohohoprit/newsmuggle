'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  CATEGORIES,
  type ToolCategory,
} from '@/smuggler/data/tools';
import {
  useToolsStore,
  type PopularityFilter,
} from '@/smuggler/store/useToolsStore';

export interface ToolsSidebarFilterProps {
  onClose: () => void;
}

const POPULARITY_OPTIONS: PopularityFilter[] = [
  'All',
  'Most Popular',
  'Newest',
  'Most Used',
];

export default function ToolsSidebarFilter({ onClose }: ToolsSidebarFilterProps) {
  const activeCategories = useToolsStore((s) => s.activeCategories);
  const toggleCategory = useToolsStore((s) => s.toggleCategory);
  const clearCategories = useToolsStore((s) => s.clearCategories);
  const popularityFilter = useToolsStore((s) => s.popularityFilter);
  const setPopularityFilter = useToolsStore((s) => s.setPopularityFilter);

  const handleClearAll = () => {
    clearCategories();
    setPopularityFilter('All');
  };

  const nonAllCategories = CATEGORIES.filter(
    (c): c is Exclude<ToolCategory, 'All'> => c !== 'All',
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4">
        <h3 className="m-0 font-serif text-xl font-bold tracking-tight text-[#1A3620]">
          Filter Tools
        </h3>
        <button
          type="button"
          onClick={handleClearAll}
          className="border-none bg-transparent text-sm font-bold text-[#888] underline decoration-[#CCC] underline-offset-4 transition-all cursor-pointer hover:text-[#1A3620] hover:decoration-[#1A3620]"
        >
          Clear all
        </button>
      </div>

      {/* Categories */}
      <div>
        <h4 className="mb-2 text-[0.7rem] font-black uppercase tracking-[1px] text-[#888]">
          Categories
        </h4>
        <div className="flex flex-wrap gap-2">
          {nonAllCategories.map((cat) => {
            const isActive = activeCategories.includes(cat);
            return (
              <motion.button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`relative rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-[#1A3620] bg-[#1A3620] text-white shadow-md'
                    : 'border-black/10 bg-white text-[#555] hover:border-[#C09858]/40 hover:text-[#1A3620]'
                }`}
              >
                {cat}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Popularity */}
      <div>
        <h4 className="mb-3 text-[0.7rem] font-black uppercase tracking-[1px] text-[#888]">
          Popularity
        </h4>
        <div className="flex flex-col gap-3">
          {POPULARITY_OPTIONS.map((opt) => {
            const isActive = popularityFilter === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setPopularityFilter(opt)}
                className="group flex cursor-pointer items-center gap-3 text-[0.95rem] font-medium text-[#444] transition-colors hover:text-[#111]"
              >
                <span
                  className={`relative flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-[#C09858]'
                      : 'border-[#CCC] group-hover:border-[#1A3620]'
                  }`}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="block h-2 w-2 rounded-full bg-[#C09858]"
                      />
                    )}
                  </AnimatePresence>
                </span>
                <span
                  className={
                    isActive
                      ? 'text-[#111] font-bold'
                      : 'text-[#444] group-hover:text-[#111]'
                  }
                >
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-xl bg-[#1A3620] py-3 font-bold text-white transition-colors hover:bg-[#112415] cursor-pointer"
      >
        Apply Filters
      </button>
    </div>
  );
}
