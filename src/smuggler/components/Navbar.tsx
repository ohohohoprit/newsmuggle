'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  Star,
  ChevronDown,
  Search,
  Sun,
  Moon,
  UserCog,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/smuggler/store/useAuthStore';

export type NavView = 'home' | 'tools' | 'hook-generator' | 'tool-page' | 'library' | 'studio' | 'pricing' | 'auth' | 'settings' | 'onboarding';
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

/* ── Icon button shared style ────────────────────────────────── */
const ICON_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--smuggler-border)]/60 bg-[var(--smuggler-bg-panel)]/40 text-[var(--smuggler-text-secondary)] transition-all duration-200 hover:border-[var(--smuggler-gold)]/50 hover:text-[var(--smuggler-gold)] hover:bg-[var(--smuggler-gold)]/[0.06]';

/* ── Typewriter tooltip for unauthenticated account settings ── */
function TypewriterTooltip({ show, onDone }: { show: boolean; onDone: () => void }) {
  const [text, setText] = useState('');
  const fullText = 'Login or Sign up first';
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!show) {
      setText('');
      return;
    }
    let i = 0;
    const tick = () => {
      i++;
      setText(fullText.slice(0, i));
      if (i < fullText.length) {
        timerRef.current = setTimeout(tick, 38);
      } else {
        // Hold for 2s then dismiss
        timerRef.current = setTimeout(onDone, 2000);
      }
    };
    timerRef.current = setTimeout(tick, 100);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-medium shadow-lg"
          style={{
            backgroundColor: 'var(--smuggler-bg-panel)',
            borderColor: 'var(--smuggler-gold)',
            color: 'var(--smuggler-gold)',
            boxShadow: '0 4px 20px rgba(192,152,88,0.15)',
          }}
        >
          {text}
          <span className="inline-block w-[1px] animate-pulse" style={{ color: 'var(--smuggler-gold)' }}>|</span>
          {/* Arrow pointer */}
          <div
            className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 border-l border-t"
            style={{
              backgroundColor: 'var(--smuggler-bg-panel)',
              borderColor: 'var(--smuggler-gold)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      className={ICON_BTN}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </motion.button>
  );
}

export function Navbar({ onOpenAuth, onNavigate, onOpenPalette, currentView, hidden }: NavbarProps) {
  const authStatus = useAuthStore((s) => s.status);
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);

  const isLoggedIn = authStatus === 'authenticated' && authUser;
  const displayName = authUser?.name || authUser?.username || authUser?.email || '';
  const avatarSrc = authUser?.avatar || '';

  const dismissTooltip = useCallback(() => setShowSettingsTooltip(false), []);

  const handleSettingsClick = () => {
    if (isLoggedIn) {
      onNavigate('settings');
    } else {
      setShowSettingsTooltip(true);
    }
  };

  return (
    <div
      className="sticky top-0 z-50 w-full border-b border-[var(--smuggler-border)]/40 backdrop-blur-xl transition-transform duration-300"
      style={{
        backgroundColor: 'var(--smuggler-navbar-bg)',
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      {/* Subtle bottom glow line */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(192,152,88,0.15) 25%, rgba(192,152,88,0.25) 50%, rgba(192,152,88,0.15) 75%, transparent 100%)',
        }}
      />

      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-12"
        aria-label="Primary"
      >
        {/* ── Logo area (fixed, doesn't stretch) ── */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Home icon — hidden on homepage */}
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
                className="h-7 w-7 object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </motion.button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left"
            aria-label="Content Smuggler home"
          >
            {/* Logo image */}
            <div
              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full"
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
        </div>

        {/* Subtle vertical divider */}
        <div
          className="hidden h-5 shrink-0 md:block"
          style={{
            width: '1px',
            background: 'linear-gradient(180deg, transparent, var(--smuggler-border), transparent)',
          }}
        />

        {/* ── Center: Nav Links + Search (flex-1 fills the space evenly) ── */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {/* Nav Links - desktop only */}
          <ul className="hidden items-center gap-0.5 md:flex">
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
                    className="nav-link-btn group relative flex items-center gap-1 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-200"
                    style={{
                      color: isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text-secondary)',
                      letterSpacing: '0.3px',
                      backgroundColor: isActive ? 'rgba(192,152,88,0.08)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = 'var(--smuggler-text)';
                        e.currentTarget.style.backgroundColor = 'var(--smuggler-panel-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = isActive
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text-secondary)';
                      e.currentTarget.style.backgroundColor = isActive
                        ? 'rgba(192,152,88,0.08)'
                        : 'transparent';
                    }}
                  >
                    {link.label}
                    {link.hasCaret && (
                      <ChevronDown
                        size={12}
                        className="text-[var(--smuggler-text-muted)] transition-transform duration-200 group-hover:translate-y-0.5"
                        aria-hidden="true"
                      />
                    )}
                    {/* Active indicator underline */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="absolute -bottom-[13px] left-1/2 h-[2px] w-4/5 -translate-x-1/2 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, var(--smuggler-gold), transparent)',
                          boxShadow: '0 0 8px rgba(192,152,88,0.35)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Spacer — pushes search to the right of nav links */}
          <div className="flex-1" />

          {/* Search tools — command palette trigger */}
          <button
            type="button"
            onClick={onOpenPalette}
            className="group flex items-center gap-2 rounded-lg border border-[var(--smuggler-border)]/60 bg-[var(--smuggler-bg-panel)]/30 px-2.5 py-1.5 text-[0.78rem] text-[var(--smuggler-text-muted)] transition-all duration-200 hover:border-[var(--smuggler-gold)]/40 hover:text-[var(--smuggler-text)]"
            aria-label="Open command palette"
            style={{ minWidth: '120px' }}
          >
            <Search size={13} className="shrink-0" />
            <span className="hidden sm:inline truncate">Search tools…</span>
            <kbd className="ml-auto hidden rounded border border-[var(--smuggler-border)]/60 bg-[var(--smuggler-bg-panel)]/50 px-1.5 py-0.5 font-mono text-[0.58rem] text-[var(--smuggler-text-muted)] sm:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Subtle separator */}
        <div
          className="hidden h-4 shrink-0 sm:block"
          style={{
            width: '1px',
            background: 'linear-gradient(180deg, transparent, var(--smuggler-border), transparent)',
          }}
        />

        {/* ── Right: Icons + Auth ── */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Account settings — UserCog icon with typewriter tooltip for unauthenticated */}
          <div className="relative">
            <motion.button
              type="button"
              onClick={handleSettingsClick}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className={ICON_BTN}
              aria-label="Account settings"
              title={isLoggedIn ? 'Account Settings' : undefined}
            >
              <UserCog size={15} />
            </motion.button>
            <TypewriterTooltip show={showSettingsTooltip} onDone={dismissTooltip} />
          </div>

          {/* Subtle separator before auth area */}
          <div
            className="hidden h-4 sm:block"
            style={{
              width: '1px',
              background: 'linear-gradient(180deg, transparent, var(--smuggler-border), transparent)',
              margin: '0 2px',
            }}
          />

          {/* Auth section */}
          {isLoggedIn ? (
            <div className="flex items-center gap-1.5">
              {/* Avatar */}
              <motion.div
                whileHover={{ scale: 1.08 }}
                className="flex h-8 w-8 cursor-default items-center justify-center overflow-hidden rounded-full border border-[var(--smuggler-gold)]/30 transition-all duration-200 hover:border-[var(--smuggler-gold)]/60 hover:shadow-[0_0_10px_rgba(192,152,88,0.2)]"
                style={{
                  backgroundColor: avatarSrc ? 'transparent' : 'var(--smuggler-gold)',
                  color: avatarSrc ? undefined : '#fff',
                }}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
                )}
              </motion.div>
              <span
                className="hidden max-w-[100px] truncate text-sm font-semibold sm:inline"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {displayName}
              </span>
              <motion.button
                type="button"
                onClick={logout}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--smuggler-text-muted)] transition-all duration-200 hover:bg-[var(--smuggler-red)]/10 hover:text-[var(--smuggler-red)]"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={14} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="smuggler-btn smuggler-btn-secondary hidden sm:inline-flex whitespace-nowrap"
                style={{ minWidth: '72px', justifyContent: 'center', padding: '0.5rem 1rem', fontSize: '13px' }}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="smuggler-btn smuggler-btn-primary whitespace-nowrap"
                style={{ minWidth: '80px', justifyContent: 'center', padding: '0.5rem 1rem', fontSize: '13px' }}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </motion.nav>
    </div>
  );
}

export default Navbar;
