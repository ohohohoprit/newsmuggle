'use client';

import { motion } from 'framer-motion';
import {
  ALL_TOOLS,
  CATEGORIES,
  type ToolCategory,
} from '@/smuggler/data/tools';
import { useToolsStore } from '@/smuggler/store/useToolsStore';

export default function CategoryChips() {
  const activeCategories = useToolsStore((s) => s.activeCategories);
  const toggleCategory = useToolsStore((s) => s.toggleCategory);
  const clearCategories = useToolsStore((s) => s.clearCategories);

  const countFor = (cat: ToolCategory): number => {
    if (cat === 'All') return ALL_TOOLS.length;
    return ALL_TOOLS.filter((t) => t.category === cat).length;
  };

  const isActive = (cat: ToolCategory): boolean => {
    if (cat === 'All') return activeCategories.length === 0;
    return activeCategories.includes(cat as Exclude<ToolCategory, 'All'>);
  };

  const handleClick = (cat: ToolCategory) => {
    if (cat === 'All') {
      clearCategories();
    } else {
      toggleCategory(cat as Exclude<ToolCategory, 'All'>);
    }
  };

  return (
    <div className="smuggler-scroll-hide mb-8 flex gap-2 overflow-x-auto pb-2">
      {CATEGORIES.map((cat) => {
        const active = isActive(cat);
        const count = countFor(cat);
        return (
          <motion.button
            key={cat}
            type="button"
            onClick={() => handleClick(cat)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              active
                ? 'border-[#1A3620] bg-[#1A3620] text-white shadow-md'
                : 'border-black/10 bg-white text-[#555] hover:border-[#C09858]/40 hover:text-[#1A3620]'
            }`}
          >
            <span>{cat}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[0.7rem] font-bold ${
                active
                  ? 'bg-white/20 text-white'
                  : 'bg-black/5 text-[#888]'
              }`}
            >
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
