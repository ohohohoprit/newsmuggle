'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Star,
  ChevronDown,
  Search,
  Sun,
  Moon,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavView = 'home' | 'tools' | 'hook-generator' | 'tool-page' | 'library' | 'studio' | 'pricing' | 'auth' | 'settings';
export type AuthMode = 'login' | 'signup';

export interface NavbarProps {
  onOpenAuth: (mode: AuthMode) => void;
  onNavigate: (view: NavView) => void;
  onOpenPalette: () => void;
  currentView: NavView;
  hidden?: boolean;
}

interface NavLinkConfig {
  label: string;
  view?: NavView;
  hasCaret?: boolean;
  icon?: LucideIcon;
}

const NAV_LINKS: NavLinkConfig[] = [
  { label: 'Studio', view: 'studio' },
  { label: 'Library', view: 'library' },
  { label: 'Tools', view: 'tools', hasCaret: true },
  { label: 'Pricing', view: 'pricing' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/50 text-[var(--smuggler-text-secondary)] transition-all hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-gold)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Navbar({ onOpenAuth, onNavigate, onOpenPalette, currentView, hidden }: NavbarProps) {
  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-[var(--smuggler-border)]/50 backdrop-blur-md transition-transform duration-300"
      style={{
        backgroundColor: 'var(--smuggler-navbar-bg)',
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-3.5 sm:px-8 lg:px-16"
        aria-label="Primary"
      >
        {/* Left: Home Icon (hidden on homepage) + Logo + Nav Links */}
        <div className="flex items-center gap-3 md:gap-6 lg:gap-10">
          {/* Home icon — clean, no background, hidden on homepage */}
          {currentView !== 'home' && currentView !== 'auth' && (
            <motion.button
              type="button"
              onClick={() => onNavigate('home')}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.25 }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.92 }}
              className="flex shrink-0 items-center justify-center transition-all"
              style={{ filter: 'drop-shadow(0 0 0 transparent)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(192,152,88,0.4))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 0 transparent)';
              }}
              aria-label="Return to homepage"
            >
              <img
                src="/smuggler/assets/home-icon.png"
                alt="Home"
                className="h-8 w-8 object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </motion.button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left"
            aria-label="Content Smuggler home"
          >
            {/* Logo image */}
            <div
              className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full"
              style={{
                backgroundColor: 'rgba(192,152,88,0.08)',
                border: '1px solid rgba(192,152,88,0.25)',
              }}
            >
              <img
                src="/smuggler/assets/logo-hq.png"
                alt="Content Smuggler logo"
                className="h-full w-full scale-110 object-contain p-0.5"
              />
            </div>

            {/* Logo text */}
            <div className="hidden flex-col leading-none sm:flex">
              <span
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  letterSpacing: '1px',
                  color: 'var(--smuggler-text)',
                  lineHeight: 1.1,
                }}
              >
                <Star
                  size={10}
                  className="fill-current"
                  style={{ color: 'var(--smuggler-gold)' }}
                  aria-hidden="true"
                />
                CONTENT
                <Star
                  size={10}
                  className="fill-current"
                  style={{ color: 'var(--smuggler-gold)' }}
                  aria-hidden="true"
                />
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  letterSpacing: '1px',
                  color: 'var(--smuggler-text)',
                  lineHeight: 1.1,
                }}
              >
                SMUGGLER
              </span>
              <span
                className="mt-1"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.55rem',
                  letterSpacing: '3px',
                  color: 'var(--smuggler-text-muted)',
                  fontWeight: 600,
                }}
              >
                — CREATOR TOOLKIT —
              </span>
            </div>
          </button>

          {/* Nav Links - desktop only */}
          <ul className="hidden items-center gap-8 md:flex lg:gap-10">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.view !== undefined && link.view === currentView;
              return (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (link.view) onNavigate(link.view);
                    }}
                    className="group flex items-center gap-1.5 text-sm font-medium transition-colors"
                    style={{
                      color: isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text)',
                      letterSpacing: '0.5px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--smuggler-gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text)';
                    }}
                  >
                    {link.label}
                    {link.hasCaret && (
                      <ChevronDown
                        size={12}
                        className="text-[var(--smuggler-text-muted)] transition-transform group-hover:translate-y-0.5"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: Search + Theme Toggle + Settings + Auth Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/50 text-[var(--smuggler-text-secondary)] transition-all hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-gold)]"
            aria-label="Account settings"
          >
            <Settings size={16} />
          </button>
          {/* Search tools input — wider, replaces both desktop + mobile search */}
          <button
            type="button"
            onClick={onOpenPalette}
            className="group flex items-center gap-2 rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/30 px-3 py-2 text-[0.8rem] text-[var(--smuggler-text-muted)] transition-colors hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-text)]"
            aria-label="Open command palette"
            style={{ minWidth: '140px' }}
          >
            <Search size={14} className="shrink-0" />
            <span className="hidden sm:inline truncate">Search tools...</span>
            <kbd className="ml-auto hidden rounded border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/50 px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--smuggler-text-muted)] sm:inline">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="smuggler-btn smuggler-btn-secondary hidden sm:inline-flex whitespace-nowrap"
            style={{ minWidth: '80px', justifyContent: 'center' }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('signup')}
            className="smuggler-btn smuggler-btn-primary whitespace-nowrap"
            style={{ minWidth: '90px', justifyContent: 'center' }}
          >
            Sign up
          </button>
        </div>
      </motion.nav>
    </div>
  );
}

export default Navbar;
