'use client';

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Crosshair,
  UserRoundSearch,
  Star,
  ChevronDown,
  Search,
  Sun,
  Moon,
  type LucideIcon,
} from 'lucide-react';

export type NavView = 'home' | 'tools' | 'dashboard' | 'hook-generator' | 'tool-page';
export type AuthMode = 'login' | 'signup';

export interface NavbarProps {
  onOpenAuth: (mode: AuthMode) => void;
  onNavigate: (view: NavView) => void;
  onOpenPalette: () => void;
  currentView: NavView;
}

interface NavLinkConfig {
  label: string;
  view?: NavView;
  hasCaret?: boolean;
  icon?: LucideIcon;
}

const NAV_LINKS: NavLinkConfig[] = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Tools', view: 'tools', hasCaret: true },
  { label: 'Studio' },
  { label: 'Library' },
  { label: 'Pricing' },
  { label: 'Resources', hasCaret: true },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/50 text-[var(--smuggler-text-secondary)] transition-all hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-gold)]"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function Navbar({ onOpenAuth, onNavigate, onOpenPalette, currentView }: NavbarProps) {
  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-[var(--smuggler-border)]/50 backdrop-blur-md"
      style={{ backgroundColor: 'var(--smuggler-navbar-bg)' }}
    >
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8 lg:px-16"
        aria-label="Primary"
      >
        {/* Left: Logo + Nav Links */}
        <div className="flex items-center gap-6 md:gap-10 lg:gap-16">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 text-left"
            aria-label="Content Smuggler home"
          >
            {/* Logo badge */}
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'rgba(192,152,88,0.08)',
                border: '1px solid rgba(192,152,88,0.25)',
              }}
            >
              <Crosshair
                className="absolute"
                size={44}
                strokeWidth={1}
                style={{ color: 'var(--smuggler-gold)' }}
                aria-hidden="true"
              />
              <UserRoundSearch
                className="relative"
                size={18}
                strokeWidth={2.5}
                style={{ color: 'var(--smuggler-cream)' }}
                aria-hidden="true"
              />
            </div>

            {/* Logo text */}
            <div className="flex flex-col leading-none">
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
          <ul className="hidden items-center gap-10 md:flex">
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

        {/* Right: Search trigger + Theme Toggle + Auth Buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={onOpenPalette}
            className="group hidden items-center gap-2 rounded-lg border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/30 px-3 py-2 text-[0.8rem] text-[var(--smuggler-text-muted)] transition-colors hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-text)] md:flex"
            aria-label="Open command palette"
          >
            <Search size={14} />
            <span>Search tools...</span>
            <kbd className="ml-2 rounded border border-[var(--smuggler-border)] bg-[var(--smuggler-bg-panel)]/50 px-1.5 py-0.5 font-mono text-[0.6rem] text-[var(--smuggler-text-muted)]">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={onOpenPalette}
            className="smuggler-btn smuggler-btn-secondary md:hidden"
            aria-label="Search tools"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="smuggler-btn smuggler-btn-secondary hidden sm:inline-flex"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth('signup')}
            className="smuggler-btn smuggler-btn-primary"
          >
            Sign up
          </button>
        </div>
      </motion.nav>
    </div>
  );
}

export default Navbar;
