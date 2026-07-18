'use client';

import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useCallback } from 'react';

interface BackButtonProps {
  onBack: () => void;
  label?: string;
  className?: string;
}

/**
 * Universal Back button — uses a callback to return to the previous view.
 * Placed at the top-left of internal pages (Studio, Library, Settings, Tools, Tool pages).
 * Hidden when no previous page exists (the callback handles that).
 */
export function BackButton({ onBack, label = 'Back', className = '' }: BackButtonProps) {
  const handleClick = useCallback(() => {
    onBack();
  }, [onBack]);

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ x: -3 }}
      whileTap={{ scale: 0.96 }}
      className={`group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.8rem] font-semibold transition-colors ${className}`}
      style={{
        color: 'var(--smuggler-text-muted)',
        border: '1px solid var(--smuggler-border)',
        backgroundColor: 'var(--smuggler-bg-panel)',
      }}
      aria-label={`Go back — ${label}`}
    >
      <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
      <span className="hidden sm:inline">{label}</span>
    </motion.button>
  );
}

export default BackButton;
