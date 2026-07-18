'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/smuggler/store/useAuthStore';
import { Loader2, ArrowRight, SkipForward } from 'lucide-react';

const USER_TYPES = [
  { value: 'creator', label: 'Creator' },
  { value: 'marketer', label: 'Marketer' },
  { value: 'entrepreneur', label: 'Entrepreneur' },
  { value: 'educator', label: 'Educator' },
  { value: 'other', label: 'Other' },
] as const;

export interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const authUser = useAuthStore((s) => s.user);
  const [name, setName] = useState(authUser?.name || '');
  const [username, setUsername] = useState(authUser?.username || '');
  const [bio, setBio] = useState('');
  const [creatorCategory, setCreatorCategory] = useState('creator');
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/onboarding/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          username: username || undefined,
          bio: bio || undefined,
          creatorCategory,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to save profile.');
        setSaving(false);
        return;
      }
      const completeRes = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });
      if (!completeRes.ok) {
        setError('Failed to complete onboarding.');
        setSaving(false);
        return;
      }
      await useAuthStore.getState().refresh();
      onComplete();
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setError('');
    setSkipping(true);
    try {
      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
      });
      if (!res.ok) {
        setError('Failed to skip onboarding.');
        setSkipping(false);
        return;
      }
      await useAuthStore.getState().refresh();
      onComplete();
    } catch {
      setError('Network error. Please try again.');
      setSkipping(false);
    }
  };

  const displayName = authUser?.name || authUser?.username || authUser?.email || 'Agent';

  return (
    <section
      className="relative min-h-screen"
      style={{ backgroundColor: 'var(--smuggler-bg)' }}
    >
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="mb-10 text-center">
            <h1
              className="mb-3 font-serif text-3xl font-bold"
              style={{ color: 'var(--smuggler-text)' }}
            >
              Welcome, {displayName}.
            </h1>
            <p
              className="text-lg"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              Let&apos;s set up your creator profile.
            </p>
          </div>

          <form onSubmit={handleComplete} className="flex flex-col gap-6">
            <div
              className="rounded-2xl p-6 sm:p-8"
              style={{
                backgroundColor: 'var(--smuggler-bg-panel)',
                border: '1px solid var(--smuggler-border)',
              }}
            >
              <h2
                className="mb-5 font-serif text-xl font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                Profile Basics
              </h2>

              <div className="mb-4">
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="smuggler-input-premium h-12 w-full rounded-lg px-4 text-sm outline-none"
                  style={{ color: 'var(--smuggler-text)' }}
                />
              </div>

              <div className="mb-4">
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="yourusername"
                  className="smuggler-input-premium h-12 w-full rounded-lg px-4 text-sm outline-none"
                  style={{ color: 'var(--smuggler-text)' }}
                />
              </div>

              <div className="mb-4">
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the world about yourself..."
                  rows={3}
                  className="smuggler-input-premium w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={{ color: 'var(--smuggler-text)' }}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--smuggler-text-secondary)' }}
                >
                  I am a...
                </label>
                <div className="relative">
                  <select
                    value={creatorCategory}
                    onChange={(e) => setCreatorCategory(e.target.value)}
                    className="smuggler-input-premium h-12 w-full appearance-none rounded-lg px-4 pr-10 text-sm outline-none"
                    style={{ color: 'var(--smuggler-text)', backgroundColor: 'var(--smuggler-bg-panel)' }}
                  >
                    {USER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium"
                style={{
                  color: 'var(--smuggler-red)',
                  backgroundColor: 'rgba(192,57,43,0.08)',
                  border: '1px solid rgba(192,57,43,0.2)',
                }}
                role="alert"
              >
                <span>{error}</span>
              </motion.div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={saving || skipping}
                className="smuggler-cta-premium flex-1 justify-center disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                disabled={saving || skipping}
                onClick={handleSkip}
                className="smuggler-btn smuggler-btn-secondary flex-1 justify-center disabled:opacity-70"
              >
                {skipping ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Skipping...
                  </>
                ) : (
                  <>
                    <SkipForward size={16} />
                    Skip for now
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}

export default OnboardingView;
