'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar, { type AuthMode, type NavView } from '@/smuggler/components/Navbar';
import Homepage from '@/smuggler/components/Homepage';
import ToolsSection from '@/smuggler/components/ToolsSection';
import AllToolsSection from '@/smuggler/components/AllToolsSection';
import HookGeneratorPage from '@/smuggler/components/HookGeneratorPage';
import ToolPageEngine from '@/smuggler/components/ToolPageEngine';
import LibraryView from '@/smuggler/components/LibraryView';
import StudioView from '@/smuggler/components/StudioView';
import CommandPalette from '@/smuggler/components/CommandPalette';
import Footer from '@/smuggler/components/Footer';
import AuthModal from '@/smuggler/components/AuthModal';
import ToolModal from '@/smuggler/components/ToolModal';
import { useToolsStore } from '@/smuggler/store/useToolsStore';

export default function Home() {
  const [view, setView] = useState<NavView>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Hydrate favorites from localStorage on mount
  const hydrateFavorites = useToolsStore((s) => s.hydrateFavorites);
  useEffect(() => {
    hydrateFavorites();
  }, [hydrateFavorites]);

  // Cmd/Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Scroll to top whenever the view changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  const handleNavigate = useCallback((next: NavView) => {
    setView(next);
  }, []);

  const handleOpenAuth = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const handleSwitchAuthMode = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
  }, []);

  const handleCloseAuth = useCallback(() => {
    setAuthOpen(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthOpen(false);
    setToast('Welcome, Agent. Your mission awaits. 🕵️‍♂️');
    setView('library');
  }, []);

  const handleSelectTool = useCallback((toolId: string) => {
    if (toolId === 'request-tool') {
      setToast('📡 Request logged. Our agents are on it.');
      return;
    }
    // Hook Generator keeps its dedicated page
    if (toolId === 'hook-generator') {
      setView('hook-generator');
      return;
    }
    // All other tools use the generic ToolPageEngine
    setActiveToolId(toolId);
    setView('tool-page');
  }, []);

  const handleCloseTool = useCallback(() => {
    setSelectedToolId(null);
  }, []);

  const handleExploreTools = useCallback(() => {
    setView('tools');
  }, []);

  // Scroll-direction-aware navbar: hide on scroll down, show on scroll up
  const [navbarHidden, setNavbarHidden] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const threshold = 120; // ignore tiny scrolls near the top
    const update = () => {
      const y = window.scrollY;
      if (y < threshold) {
        setNavbarHidden(false);
      } else if (y > lastY + 8) {
        setNavbarHidden(true);
      } else if (y < lastY - 8) {
        setNavbarHidden(false);
      }
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="smuggler-app flex min-h-screen flex-col">
      <Navbar
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
        onOpenPalette={() => setPaletteOpen(true)}
        currentView={view}
        hidden={navbarHidden}
      />

      <main className="flex-1 pt-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <Homepage
                onExploreTools={handleExploreTools}
                onSelectTool={handleSelectTool}
                onOpenAuth={handleOpenAuth}
              />
            </motion.div>
          )}

          {view === 'tools' && (
            <motion.div
              key="tools-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <AllToolsSection onSelectTool={handleSelectTool} />
            </motion.div>
          )}

          {view === 'hook-generator' && (
            <motion.div
              key="hook-generator-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <HookGeneratorPage onBack={() => setView('tools')} />
            </motion.div>
          )}

          {view === 'tool-page' && activeToolId && (
            <motion.div
              key={`tool-page-${activeToolId}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <ToolPageEngine toolId={activeToolId} onBack={() => setView('tools')} />
            </motion.div>
          )}

          {view === 'library' && (
            <motion.div
              key="library-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <LibraryView onNavigate={handleNavigate} onSelectTool={handleSelectTool} />
            </motion.div>
          )}

          {view === 'studio' && (
            <motion.div
              key="studio-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <StudioView onNavigate={handleNavigate} onSelectTool={handleSelectTool} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {view !== 'home' && view !== 'tool-page' && view !== 'hook-generator' && view !== 'library' && view !== 'studio' && (
        <div className="mt-auto">
          <Footer onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        </div>
      )}

      {/* Modals */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={handleCloseAuth}
        onSwitchMode={handleSwitchAuthMode}
        onAuthSuccess={handleAuthSuccess}
      />

      <ToolModal toolId={selectedToolId} onClose={handleCloseTool} />

      {/* Command Palette (Cmd/Ctrl+K) */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSelectTool={handleSelectTool}
        onNavigate={handleNavigate}
      />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 40, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 40, x: '-50%' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed bottom-6 left-1/2 z-[100] flex max-w-[90vw] items-center gap-3 rounded-xl border border-[var(--smuggler-gold)]/40 bg-[var(--smuggler-bg-panel)] px-5 py-3 text-sm font-medium text-[var(--smuggler-text)] shadow-2xl backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <span className="text-base">{toast.split(' ').slice(0, 2).join(' ')}</span>
            <span className="text-[var(--smuggler-text-secondary)]">
              {toast.split(' ').slice(2).join(' ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
