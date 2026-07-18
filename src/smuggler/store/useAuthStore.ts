'use client';

import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
  plan: string;
  onboardingCompleted: boolean;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  refresh: async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        set({ status: 'authenticated', user: data.user });
      } else {
        set({ status: 'unauthenticated', user: null });
      }
    } catch {
      set({ status: 'unauthenticated', user: null });
    }
  },

  setUser: (user) => {
    set({ status: user ? 'authenticated' : 'unauthenticated', user });
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    set({ status: 'unauthenticated', user: null });
  },
}));
