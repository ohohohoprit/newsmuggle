'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  CornerDownLeft,
  ArrowRight,
  LayoutDashboard,
  Wand2,
  Home,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ALL_TOOLS, type SmugglerTool, type ToolCategory } from '@/smuggler/data/tools';
import type { NavView } from './Navbar';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTool: (toolId: string) => void;
  onNavigate: (view: NavView) => void;
}

interface PaletteItem {
  type: 'tool' | 'view';
  label: string;
  sublabel: string;
  tool?: SmugglerTool;
  view?: NavView;
  keywords: string;
}

const VIEW_ITEMS: PaletteItem[] = [
  {
    type: 'view',
    label: 'Go to Home',
    sublabel: 'Landing page',
    view: 'home',
    keywords: 'home landing hero',
  },
  {
    type: 'view',
    label: 'Go to Library',
    sublabel: 'Your creator workspace & vault',
    view: 'library',
    keywords: 'library vault workspace dashboard agent mission stats content saved',
  },
  {
    type: 'view',
    label: 'Go to All Tools',
    sublabel: 'Browse the full arsenal',
    view: 'tools',
    keywords: 'tools all browse arsenal',
  },
];

export function CommandPalette({
  open,
  onOpenChange,
  onSelectTool,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build the full item list
  const allItems: PaletteItem[] = useMemo(() => {
    const toolItems: PaletteItem[] = ALL_TOOLS.map((t) => ({
      type: 'tool' as const,
      label: t.name,
      sublabel: t.desc,
      tool: t,
      keywords: `${t.name} ${t.desc} ${t.category} ${t.id}`,
    }));
    return [...VIEW_ITEMS, ...toolItems];
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) => item.keywords.toLowerCase().includes(q));
  }, [query, allItems]);

  // Reset query when the palette transitions from closed to open (render-time pattern)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }

  // Focus input after the dialog opens (effect reads ref safely, no setState)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Reset active index when filter length changes (render-time pattern)
  const [prevFilteredLen, setPrevFilteredLen] = useState(filtered.length);
  if (filtered.length !== prevFilteredLen) {
    setPrevFilteredLen(filtered.length);
    if (activeIndex > 0) setActiveIndex(0);
  }

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) executeItem(item);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const executeItem = (item: PaletteItem) => {
    onOpenChange(false);
    if (item.type === 'view' && item.view) {
      onNavigate(item.view);
    } else if (item.type === 'tool' && item.tool) {
      onSelectTool(item.tool.id);
    }
  };

  // Group filtered items: views first, then tools by category
  const viewItems = filtered.filter((i) => i.type === 'view');
  const toolItems = filtered.filter((i) => i.type === 'tool');

  // Compute flat index mapping for keyboard nav
  let flatIndex = -1;
  const indexMap = new Map<number, PaletteItem>();
  for (const item of viewItems) {
    flatIndex++;
    indexMap.set(flatIndex, item);
  }
  for (const item of toolItems) {
    flatIndex++;
    indexMap.set(flatIndex, item);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[640px] w-[92vw] p-0 overflow-hidden gap-0 bg-[#13110E] border border-[#C09858]/30 rounded-2xl text-[#F4EEDF]"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[#24211D] px-5 py-4">
          <Search size={20} className="text-[#C09858]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools, commands... (e.g., hook, title, dashboard)"
            className="flex-1 bg-transparent text-[0.95rem] text-[#F4EEDF] outline-none placeholder:text-[#6B655E]"
          />
          <kbd className="hidden items-center gap-1 rounded border border-[#24211D] bg-black/30 px-2 py-0.5 text-[0.65rem] font-mono text-[#9A9386] sm:flex">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[420px] overflow-y-auto smuggler-scroll py-2"
        >
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} className="mb-3 text-[#6B655E]" />
              <p className="text-[0.9rem] font-semibold text-[#9A9386]">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-[0.75rem] text-[#6B655E]">
                Try a different keyword or browse all tools.
              </p>
            </div>
          )}

          {/* Views section */}
          {viewItems.length > 0 && (
            <div className="mb-1">
              <div className="px-5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[2px] text-[#6B655E]">
                Navigate
              </div>
              {viewItems.map((item) => {
                const idx = [...indexMap.entries()].find(([, v]) => v === item)?.[0] ?? 0;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`view-${item.label}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-[#C09858]/10' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-[#C09858]/20 text-[#C09858]' : 'bg-white/5 text-[#9A9386]'
                      }`}
                    >
                      {item.view === 'home' && <Home size={16} />}
                      {item.view === 'library' && <LayoutDashboard size={16} />}
                      {item.view === 'tools' && <Wand2 size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[0.9rem] font-semibold ${isActive ? 'text-[#C09858]' : 'text-[#F4EEDF]'}`}>
                        {item.label}
                      </div>
                      <div className="text-[0.75rem] text-[#9A9386]">{item.sublabel}</div>
                    </div>
                    {isActive && <CornerDownLeft size={14} className="text-[#9A9386]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tools section */}
          {toolItems.length > 0 && (
            <div>
              <div className="px-5 py-1.5 text-[0.6rem] font-bold uppercase tracking-[2px] text-[#6B655E]">
                Tools ({toolItems.length})
              </div>
              {toolItems.map((item) => {
                const idx = [...indexMap.entries()].find(([, v]) => v === item)?.[0] ?? 0;
                const isActive = idx === activeIndex;
                const Icon = item.tool!.icon;
                return (
                  <button
                    key={`tool-${item.tool!.id}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => executeItem(item)}
                    className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-[#C09858]/10' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: item.tool!.bgColor, color: item.tool!.color }}
                    >
                      <Icon size={16} className="fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[0.9rem] font-semibold ${isActive ? 'text-[#C09858]' : 'text-[#F4EEDF]'}`}>
                        {item.label}
                      </div>
                      <div className="truncate text-[0.75rem] text-[#9A9386]">
                        {item.sublabel}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[0.65rem] font-semibold text-[#9A9386]">
                      {item.tool!.category}
                    </span>
                    {isActive && <ArrowRight size={14} className="shrink-0 text-[#C09858]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-[#24211D] px-5 py-2.5 text-[0.7rem] text-[#6B655E]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#24211D] bg-black/30 px-1.5 py-0.5 font-mono text-[0.65rem]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[#24211D] bg-black/30 px-1.5 py-0.5 font-mono text-[0.65rem]">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Wand2 size={11} />
            Content Smuggler
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
