'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ChevronDown,
  SlidersHorizontal,
  Paperclip,
  ArrowRight,
} from 'lucide-react';
import {
  ALL_TOOLS,
  TOOL_COUNT,
  type ToolCategory,
} from '@/smuggler/data/tools';
import {
  useToolsStore,
  parseUses,
  type SortOption,
} from '@/smuggler/store/useToolsStore';
import ToolCard from './ToolCard';
import CategoryChips from './CategoryChips';
import ToolsSidebarFilter from './ToolsSidebarFilter';
import TypewriterTip from './TypewriterTip';

export interface AllToolsSectionProps {
  onSelectTool: (toolId: string) => void;
}

const SORT_OPTIONS: SortOption[] = [
  'Most Popular',
  'Most Used',
  'Newest',
  'Alphabetical A-Z',
  'Alphabetical Z-A',
];

export default function AllToolsSection({
  onSelectTool,
}: AllToolsSectionProps) {
  const searchQuery = useToolsStore((s) => s.searchQuery);
  const setSearchQuery = useToolsStore((s) => s.setSearchQuery);
  const activeCategories = useToolsStore((s) => s.activeCategories);
  const popularityFilter = useToolsStore((s) => s.popularityFilter);
  const sortBy = useToolsStore((s) => s.sortBy);
  const setSortBy = useToolsStore((s) => s.setSortBy);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [...ALL_TOOLS].filter((tool) => {
      if (q) {
        if (
          !tool.name.toLowerCase().includes(q) &&
          !tool.desc.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (activeCategories.length > 0) {
        if (!activeCategories.includes(tool.category)) return false;
      }
      if (popularityFilter === 'Most Popular') {
        if (!tool.isPopular) return false;
      } else if (popularityFilter === 'Newest') {
        if (!tool.isNew) return false;
      } else if (popularityFilter === 'Most Used') {
        if (parseUses(tool.uses) < 500000) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'Alphabetical A-Z') return a.name.localeCompare(b.name);
      if (sortBy === 'Alphabetical Z-A') return b.name.localeCompare(a.name);
      if (sortBy === 'Most Used')
        return parseUses(b.uses) - parseUses(a.uses);
      if (sortBy === 'Newest')
        return (b.isNew === true ? 1 : 0) - (a.isNew === true ? 1 : 0);
      // Default: Most Popular — isPopular first, then uses desc
      if (a.isPopular && !b.isPopular) return -1;
      if (!a.isPopular && b.isPopular) return 1;
      return parseUses(b.uses) - parseUses(a.uses);
    });

    return list;
  }, [searchQuery, activeCategories, popularityFilter, sortBy]);

  const activeFilterCount =
    activeCategories.length + (popularityFilter !== 'All' ? 1 : 0);

  return (
    <section
      className="relative bg-[#FDFBF7] text-[#1A120D]"
      aria-labelledby="all-tools-heading"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 lg:px-16">
        {/* Hero Mission Brief */}
        <div className="mb-16 flex flex-col gap-8 md:flex-row md:justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="z-10"
          >
            <h1
              id="all-tools-heading"
              className="mb-2 font-serif text-[2.5rem] font-bold tracking-tight sm:text-[3.2rem]"
            >
              All Tools
            </h1>
            <p className="m-0 max-w-[400px] text-base leading-[1.5] text-[#4A4A4A]">
              {TOOL_COUNT}+ AI-powered tools to ideate, create, optimize, and
              grow your content. Everything you need. One top-secret location.
            </p>
          </motion.div>

          <motion.div
            className="relative h-[180px] w-full md:w-[400px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            {/* Mascot polaroid */}
            <motion.div
              className="absolute right-[250px] top-[10px] z-20 h-[110px] w-[100px] rounded bg-white p-1 shadow-[2px_4px_15px_rgba(0,0,0,0.2)]"
              initial={{ rotate: -15, opacity: 0, y: -20 }}
              animate={{ rotate: -5, opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.6,
              }}
              whileHover={{ scale: 1.1, rotate: -2, zIndex: 30 }}
            >
              <div className="relative h-full w-full border border-[#DDD] bg-[#EAE6D7]">
                <img
                  src="/smuggler/assets/mascot-2.png"
                  alt="Smuggler mascot peeking out of a polaroid"
                  className="h-full w-full object-contain p-1"
                />
              </div>
            </motion.div>

            {/* Remember note */}
            <motion.div
              className="absolute right-0 top-0 w-[250px] origin-top-right rounded p-5 text-[0.85rem] text-[#333] shadow-[2px_4px_15px_rgba(0,0,0,0.15)]"
              style={{
                backgroundImage:
                  "url('/smuggler/assets/aged-paper-texture.jpg')",
                backgroundSize: 'cover',
                rotate: 3,
              }}
              whileHover={{ scale: 1.02 }}
            >
              <Paperclip
                size={32}
                strokeWidth={1.5}
                className="absolute -top-3.5 left-5 rotate-12 text-[#555]"
              />
              <p className="mb-1 font-semibold">Remember:</p>
              <p className="mb-2 font-medium leading-relaxed text-[#444]">
                The best content doesn&rsquo;t get lucky. It gets created with
                intention.
              </p>
              <p className="mt-2.5 text-right font-serif text-[1.1rem] italic">
                - Agent Smith
              </p>

              {/* TOP SECRET stamp */}
              <motion.div
                className="pointer-events-none absolute -right-8 top-8 z-20 rounded-md border-4 border-[#C0392B] bg-transparent px-3 py-1 text-center font-mono font-black text-[#C0392B] shadow-[0_0_15px_rgba(192,57,43,0.15)]"
                initial={{ rotate: -50, scale: 2, opacity: 0 }}
                animate={{ rotate: -20, scale: 1.1, opacity: 0.85 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.8,
                }}
              >
                <span className="block text-[1.4rem] tracking-[2px]">
                  TOP SECRET
                </span>
                <span className="block text-[0.7rem] tracking-[1px]">
                  HANDLE WITH CARE
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Toolbar: Search + Sort + Filters */}
        <div className="relative z-40 mb-12 flex flex-col justify-between gap-4 md:flex-row">
          {/* Search */}
          <div className="group flex flex-1 items-center rounded-2xl border-2 border-black/5 bg-white/70 px-6 py-4 shadow-sm backdrop-blur-md transition-all hover:bg-white/90 focus-within:border-[#C09858]/60 focus-within:bg-white">
            <Search
              size={24}
              strokeWidth={1.5}
              className="text-[#888] transition-colors duration-300 group-focus-within:text-[#C09858]"
            />
            <input
              type="text"
              placeholder="Search tools (e.g., script writer, hook generator...)"
              aria-label="Search tools"
              className="ml-4 w-full bg-transparent font-sans text-[1.05rem] font-medium outline-none placeholder:text-[#888]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative flex">
            <button
              type="button"
              onClick={() => setIsDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              className="flex min-w-[200px] cursor-pointer items-center justify-between rounded-2xl border-2 border-black/5 bg-white/70 px-6 py-4 text-[0.95rem] shadow-sm backdrop-blur-md transition-all hover:bg-white focus:border-[#C09858]/60 focus:outline-none"
            >
              <span>
                Sort by: <strong>{sortBy}</strong>
              </span>
              <motion.div
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown
                  size={18}
                  strokeWidth={2}
                  className="text-[#555]"
                />
              </motion.div>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full z-50 mt-2 w-48 origin-top rounded-xl border border-black/5 bg-white py-2 shadow-xl"
                  role="listbox"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="option"
                      aria-selected={sortBy === opt}
                      onClick={() => {
                        setSortBy(opt);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full cursor-pointer px-5 py-2.5 text-left text-sm font-medium transition-colors hover:bg-black/5 ${
                        sortBy === opt
                          ? 'bg-black/5 font-bold text-[#1A3620]'
                          : 'text-[#555]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter popover */}
          <div className="relative flex">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              aria-haspopup="dialog"
              aria-expanded={isFilterOpen}
              className="relative flex min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-black/5 bg-white/70 px-6 py-4 text-[0.95rem] font-bold shadow-sm backdrop-blur-md transition-all hover:bg-white focus:border-[#C09858]/60 focus:outline-none"
            >
              <SlidersHorizontal size={18} strokeWidth={2} className="text-[#555]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1A3620] px-1.5 text-[0.7rem] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full z-50 mt-4 w-[360px] origin-top-right rounded-2xl border border-black/10 bg-[#FDFBF7] p-6 shadow-2xl"
                  role="dialog"
                  aria-modal="true"
                >
                  <ToolsSidebarFilter onClose={() => setIsFilterOpen(false)} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Typewriter tip */}
        <TypewriterTip />

        {/* Layout breathing room */}
        <div className="h-12 w-full sm:h-20" aria-hidden />

        {/* Category chips */}
        <CategoryChips />

        {/* Tools Grid */}
        <div className="relative z-20 mb-16 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onSelect={onSelectTool}
              />
            ))}
          </AnimatePresence>

          {filteredTools.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-[#888]" strokeWidth={1.5} />
              <h3 className="mb-2 font-serif text-2xl font-bold text-[#1A120D]">
                No tools found
              </h3>
              <p className="text-[#666]">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </div>

        {/* Request Tool CTA */}
        <div className="mb-20 mt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A3620] to-[#213A28] p-12 text-center text-[#F4EEDF] md:p-16"
          >
            {/* paper grain overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-10 mix-blend-overlay"
              style={{
                backgroundImage:
                  "url('/smuggler/assets/paper-grain-noise.jpg')",
                backgroundSize: 'cover',
              }}
            />
            {/* wax seal */}
            <div
              className="smuggler-wax-seal absolute right-6 top-6 z-20 flex h-[60px] w-[60px] text-2xl"
              aria-hidden
            >
              S
            </div>

            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C09858]/40 bg-[#C09858]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[2px] text-[#C09858]">
                📡 Request a Tool
              </span>
              <h2 className="mb-4 font-serif text-3xl font-bold sm:text-[3rem]">
                Need a tool we haven&rsquo;t built yet?
              </h2>
              <p className="mb-8 max-w-2xl text-[#9A9386]">
                Our agents are always listening. Drop your request and
                we&rsquo;ll smuggle it into the next release.
              </p>
              <button
                type="button"
                onClick={() => onSelectTool('request-tool')}
                className="group inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#C09858] px-8 py-4 font-bold text-[#1A120D] shadow-lg transition-all hover:bg-[#D4AB6A] hover:shadow-[0_8px_30px_rgba(192,152,88,0.35)]"
              >
                Request a Tool
                <ArrowRight
                  size={18}
                  strokeWidth={2.5}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Re-export for external use (optional helper)
export type { ToolCategory };
