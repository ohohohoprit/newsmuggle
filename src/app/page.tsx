'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar, { type AuthMode, type NavView } from '@/smuggler/components/Navbar';
import Hero from '@/smuggler/components/Hero';
import ToolsSection from '@/smuggler/components/ToolsSection';
import AllToolsSection from '@/smuggler/components/AllToolsSection';
import DashboardView from '@/smuggler/components/DashboardView';
import HookGeneratorPage from '@/smuggler/components/HookGeneratorPage';
import Footer from '@/smuggler/components/Footer';
import AuthModal from '@/smuggler/components/AuthModal';
import ToolModal from '@/smuggler/components/ToolModal';

export default function Home() {
  const [view, setView] = useState<NavView>('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Scroll to top whenever the view changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [view]);

  // Auto-dismiss toast after 3.5s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

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
    setView('dashboard');
  }, []);

  const handleSelectTool = useCallback((toolId: string) => {
    if (toolId === 'request-tool') {
      setToast('📡 Request logged. Our agents are on it.');
      return;
    }
    // Hook Generator gets its own dedicated full page
    if (toolId === 'hook-generator') {
      setView('hook-generator');
      return;
    }
    setSelectedToolId(toolId);
  }, []);

  const handleCloseTool = useCallback(() => {
    setSelectedToolId(null);
  }, []);

  const handleExploreTools = useCallback(() => {
    setView('tools');
  }, []);

  return (
    <div className="smuggler-app flex min-h-screen flex-col">
      <Navbar
        onOpenAuth={handleOpenAuth}
        onNavigate={handleNavigate}
        currentView={view}
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
              <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-8 lg:px-16">
                <Hero onExploreTools={handleExploreTools} />
              </div>
              <ToolsSection
                onSelectTool={handleSelectTool}
                onExploreTools={handleExploreTools}
              />
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <DashboardView
                onSelectTool={handleSelectTool}
                onExploreTools={handleExploreTools}
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
        </AnimatePresence>
      </main>

      <div className="mt-auto">
        <Footer onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
      </div>

      {/* Modals */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={handleCloseAuth}
        onSwitchMode={handleSwitchAuthMode}
        onAuthSuccess={handleAuthSuccess}
      />

      <ToolModal toolId={selectedToolId} onClose={handleCloseTool} />

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
