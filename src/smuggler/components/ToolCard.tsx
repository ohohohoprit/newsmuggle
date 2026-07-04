'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, Users, ArrowRight } from 'lucide-react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'framer-motion';
import type { SmugglerTool } from '@/smuggler/data/tools';
import { useToolsStore } from '@/smuggler/store/useToolsStore';

export interface ToolCardProps {
  tool: SmugglerTool;
  onSelect: (toolId: string) => void;
}

export default function ToolCard({ tool, onSelect }: ToolCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const favorites = useToolsStore((s) => s.favorites);
  const toggleFavorite = useToolsStore((s) => s.toggleFavorite);
  const isFavorite = favorites.includes(tool.id);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 300 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-8, 8]);

  const spotX = useTransform(smoothMouseX, (v) => (v + 0.5) * 100);
  const spotY = useTransform(smoothMouseY, (v) => (v + 0.5) * 100);
  const background = useMotionTemplate`radial-gradient(400px circle at ${spotX}% ${spotY}%, rgba(255,255,255,0.7), transparent 45%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Normalize to -0.5 to 0.5
    mouseX.set(x / rect.width - 0.5);
    mouseY.set(y / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleClick = () => {
    onSelect(tool.id);
  };

  const handleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    toggleFavorite(tool.id);
  };

  const Icon = tool.icon;

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{
        duration: 0.5,
        y: { type: 'spring', stiffness: 300, damping: 20 },
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1200,
      }}
      className="group relative flex h-full min-h-[320px] flex-col cursor-pointer rounded-2xl border border-black/5 bg-[#FFFDFC] p-8 shadow-sm transition-shadow duration-300 hover:shadow-[0_15px_45px_rgba(0,0,0,0.1)]"
    >
      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background }}
      />

      {/* Subtle border glow */}
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl border border-transparent transition-colors duration-300 group-hover:border-[#C09858]/40" />

      {/* Soft paper noise texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl opacity-20"
        style={{
          backgroundImage: "url('/smuggler/assets/paper-grain-noise.jpg')",
          mixBlendMode: 'multiply',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Top row: icon + badges + favorite */}
        <div className="mb-6 flex items-start justify-between">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:-translate-y-1"
            style={{ backgroundColor: tool.bgColor, color: tool.color }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <Icon size={26} className="fill-current" strokeWidth={1.5} />
          </motion.div>

          <div className="flex items-center gap-3">
            {tool.isPopular && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-md bg-[#EAE3D2] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#8C6A3B] shadow-sm transition-colors group-hover:bg-[#C09858] group-hover:text-white"
              >
                Popular
              </motion.span>
            )}
            {!tool.isPopular && tool.isNew && (
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-md bg-[#E3F2E1] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#2E7D32] shadow-sm transition-colors group-hover:bg-[#597F56] group-hover:text-white"
              >
                New
              </motion.span>
            )}
            <motion.button
              type="button"
              onClick={handleFavorite}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="flex cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none"
            >
              <Star
                size={22}
                strokeWidth={1.5}
                className={`transition-colors ${
                  isFavorite
                    ? 'text-[#F4D03F]'
                    : 'text-[#AAA] hover:text-[#F4D03F]'
                }`}
                fill={isFavorite ? '#F4D03F' : 'none'}
              />
            </motion.button>
          </div>
        </div>

        {/* Title + description */}
        <h3 className="mb-2 truncate text-[1.2rem] font-extrabold tracking-tight text-[#111]">
          {tool.name}
        </h3>
        <p className="mb-4 line-clamp-2 text-[0.9rem] leading-[1.6] text-[#555]">
          {tool.desc}
        </p>

        {/* Agent Tip */}
        {tool.agentTip && (
          <div className="relative mt-2 overflow-hidden rounded-lg border border-[#D5CFC4]/50 bg-[#FDFBF7] p-3 opacity-0 -translate-y-2 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-0 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-30"
              style={{
                backgroundImage: "url('/smuggler/assets/paper-grain-noise.jpg')",
              }}
            />
            <div className="relative z-10 flex flex-col">
              <span className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-[1px] text-[#8C6A3B]">
                <span aria-hidden>🕵️</span> Agent Tip
              </span>
              <p className="font-serif text-[0.85rem] italic leading-snug text-[#444]">
                &ldquo;{tool.agentTip}&rdquo;
              </p>
              <div className="mt-1.5 h-[1px] w-0 bg-[#C09858]/40 transition-all delay-100 duration-700 ease-out group-hover:w-full" />
            </div>
          </div>
        )}

        {/* Flex spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
          <div className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[#666]">
            <Users size={16} className="text-[#888]" strokeWidth={2} />
            <span>{tool.uses} uses</span>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-[#888] transition-colors duration-300 group-hover:bg-[#1A3620] group-hover:text-white">
            <ArrowRight
              size={14}
              strokeWidth={2.5}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
