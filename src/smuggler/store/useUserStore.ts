"use client";

import { create } from "zustand";

/* ---------- Types ---------- */

export interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  mobile: string;
  bio: string;
  country: string;
  timezone: string;
  language: string;
  dateFormat: string;
  creatorCategory: string;
  avatar: string; // URL or empty for default
  socialLinks: Record<string, string>;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  activeSessions: number;
  loginHistory: Array<{ id: string; device: string; location: string; time: number }>;
}

export interface NotificationPrefs {
  emailNotifs: boolean;
  pushNotifs: boolean;
  marketingEmails: boolean;
  creatorInsights: boolean;
  growthAlerts: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  reminderPrefs: boolean;
}

export interface AppPreferences {
  theme: "light" | "dark";
  defaultPlatform: string;
  defaultTone: string;
  defaultExportFormat: string;
  measurementUnits: "metric" | "imperial";
  autoSave: boolean;
  animations: boolean;
  accessibility: boolean;
}

export interface BillingInfo {
  plan: "starter" | "creator" | "agency";
  renewsOn: string;
  usage: number;
  usageLimit: number;
  billingHistory: Array<{ id: string; date: string; amount: string; status: "paid" | "pending" }>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatar: string;
  status: "active" | "invited";
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: number;
  lastUsed: number | null;
}

/* ---------- Storage ---------- */

const SETTINGS_KEY = "smuggler:settings";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- Defaults ---------- */

const DEFAULT_PROFILE: UserProfile = {
  fullName: "",
  username: "",
  email: "",
  mobile: "",
  bio: "",
  country: "",
  timezone: "",
  language: "English",
  dateFormat: "DD/MM/YYYY",
  creatorCategory: "",
  avatar: "",
  socialLinks: {},
};

const DEFAULT_SECURITY: SecuritySettings = {
  twoFactorEnabled: true,
  activeSessions: 3,
  loginHistory: [
    { id: uid(), device: "MacBook Pro · Chrome", location: "Guwahati, India", time: Date.now() - 3600000 },
    { id: uid(), device: "iPhone 15 · Safari", location: "Guwahati, India", time: Date.now() - 7200000 },
    { id: uid(), device: "iPad · Safari", location: "Guwahati, India", time: Date.now() - 86400000 },
  ],
};

const DEFAULT_NOTIFS: NotificationPrefs = {
  emailNotifs: true,
  pushNotifs: true,
  marketingEmails: false,
  creatorInsights: true,
  growthAlerts: true,
  securityAlerts: true,
  productUpdates: true,
  reminderPrefs: true,
};

const DEFAULT_PREFS: AppPreferences = {
  theme: "light",
  defaultPlatform: "YouTube",
  defaultTone: "Conversational",
  defaultExportFormat: "TXT",
  measurementUnits: "metric",
  autoSave: true,
  animations: true,
  accessibility: false,
};

const DEFAULT_BILLING: BillingInfo = {
  plan: "creator",
  renewsOn: "Jul 25, 2025",
  usage: 28,
  usageLimit: 100,
  billingHistory: [
    { id: uid(), date: "Jun 25, 2025", amount: "$19.00", status: "paid" },
    { id: uid(), date: "May 25, 2025", amount: "$19.00", status: "paid" },
    { id: uid(), date: "Apr 25, 2025", amount: "$19.00", status: "paid" },
  ],
};

const DEFAULT_TEAM: TeamMember[] = [];

const DEFAULT_API_KEYS: ApiKey[] = [
  { id: uid(), name: "Production API", key: "cs_live_a1b2c3d4e5f6g7h8i9j0", created: Date.now() - 86400000 * 30, lastUsed: Date.now() - 3600000 },
  { id: uid(), name: "Development API", key: "cs_test_k9l8m7n6o5p4q3r2s1t0", created: Date.now() - 86400000 * 10, lastUsed: null },
];

/* ---------- Store ---------- */

interface UserState {
  profile: UserProfile;
  security: SecuritySettings;
  notifications: NotificationPrefs;
  preferences: AppPreferences;
  billing: BillingInfo;
  team: TeamMember[];
  apiKeys: ApiKey[];
  hydrated: boolean;

  hydrate: () => void;

  /* Profile */
  updateProfile: (updates: Partial<UserProfile>) => void;
  uploadAvatar: (dataUrl: string) => void;

  /* Security */
  toggle2FA: () => void;
  logoutOtherDevices: () => void;
  changePassword: (oldPw: string, newPw: string) => boolean;

  /* Notifications */
  updateNotification: (key: keyof NotificationPrefs, value: boolean) => void;

  /* Preferences */
  updatePreference: (key: keyof AppPreferences, value: string | boolean) => void;

  /* Billing */
  upgradePlan: (plan: "starter" | "creator" | "agency") => void;
  cancelSubscription: () => void;
  reactivateSubscription: () => void;
  updateBilling: (data: Partial<BillingInfo>) => void;

  /* Team */
  inviteMember: (email: string, role: TeamMember["role"]) => void;
  removeMember: (id: string) => void;
  updateMemberRole: (id: string, role: TeamMember["role"]) => void;

  /* API */
  generateApiKey: (name: string) => void;
  revokeApiKey: (id: string) => void;

  /* Data */
  deleteAccount: () => void;
  resetPreferences: () => void;

  /* Computed */
  getDisplayName: () => string;
  getAvatar: () => string;
}

interface PersistData {
  profile: UserProfile;
  security: SecuritySettings;
  notifications: NotificationPrefs;
  preferences: AppPreferences;
  billing: BillingInfo;
  team: TeamMember[];
  apiKeys: ApiKey[];
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: DEFAULT_PROFILE,
  security: DEFAULT_SECURITY,
  notifications: DEFAULT_NOTIFS,
  preferences: DEFAULT_PREFS,
  billing: DEFAULT_BILLING,
  team: DEFAULT_TEAM,
  apiKeys: DEFAULT_API_KEYS,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const data = load<PersistData>(SETTINGS_KEY, {
      profile: DEFAULT_PROFILE,
      security: DEFAULT_SECURITY,
      notifications: DEFAULT_NOTIFS,
      preferences: DEFAULT_PREFS,
      billing: DEFAULT_BILLING,
      team: DEFAULT_TEAM,
      apiKeys: DEFAULT_API_KEYS,
    });
    set({ ...data, hydrated: true });
  },

  updateProfile: (updates) => {
    set((s) => {
      const profile = { ...s.profile, ...updates };
      const data: PersistData = {
        profile, security: s.security, notifications: s.notifications,
        preferences: s.preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys,
      };
      save(SETTINGS_KEY, data);
      return { profile };
    });
  },

  uploadAvatar: (dataUrl) => {
    get().updateProfile({ avatar: dataUrl });
  },

  toggle2FA: () => {
    set((s) => {
      const security = { ...s.security, twoFactorEnabled: !s.security.twoFactorEnabled };
      const data: PersistData = {
        profile: s.profile, security, notifications: s.notifications,
        preferences: s.preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys,
      };
      save(SETTINGS_KEY, data);
      return { security };
    });
  },

  logoutOtherDevices: () => {
    set((s) => {
      const security = { ...s.security, activeSessions: 1, loginHistory: s.security.loginHistory.slice(0, 1) };
      save(SETTINGS_KEY, { profile: s.profile, security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys });
      return { security };
    });
  },

  changePassword: () => {
    // In a real app this would verify old password and update
    return true;
  },

  updateNotification: (key, value) => {
    set((s) => {
      const notifications = { ...s.notifications, [key]: value };
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications, preferences: s.preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys });
      return { notifications };
    });
  },

  updatePreference: (key, value) => {
    set((s) => {
      const preferences = { ...s.preferences, [key]: value };
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys });
      return { preferences };
    });
  },

  upgradePlan: (plan) => {
    set((s) => {
      const billing = { ...s.billing, plan, usage: 0, usageLimit: plan === "agency" ? 1000 : plan === "creator" ? 100 : 10 };
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing, team: s.team, apiKeys: s.apiKeys });
      return { billing };
    });
  },

  cancelSubscription: () => {
    set((s) => {
      const billing = { ...s.billing, plan: "starter" as const, usageLimit: 10 };
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing, team: s.team, apiKeys: s.apiKeys });
      return { billing };
    });
  },

  reactivateSubscription: () => {
    get().upgradePlan("creator");
  },

  updateBilling: (data) => {
    set((s) => {
      const billing = { ...s.billing, ...data };
      const persist: PersistData = {
        profile: s.profile, security: s.security, notifications: s.notifications,
        preferences: s.preferences, billing, team: s.team, apiKeys: s.apiKeys,
      };
      save(SETTINGS_KEY, persist);
      return { billing };
    });
  },

  inviteMember: (email, role) => {
    set((s) => {
      const member: TeamMember = { id: uid(), name: email.split("@")[0], email, role, avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70) + 1}`, status: "invited" };
      const team = [...s.team, member];
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team, apiKeys: s.apiKeys });
      return { team };
    });
  },

  removeMember: (id) => {
    set((s) => {
      const team = s.team.filter((m) => m.id !== id);
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team, apiKeys: s.apiKeys });
      return { team };
    });
  },

  updateMemberRole: (id, role) => {
    set((s) => {
      const team = s.team.map((m) => (m.id === id ? { ...m, role } : m));
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team, apiKeys: s.apiKeys });
      return { team };
    });
  },

  generateApiKey: (name) => {
    set((s) => {
      const newKey: ApiKey = { id: uid(), name, key: "cs_live_" + Math.random().toString(36).slice(2, 22), created: Date.now(), lastUsed: null };
      const apiKeys = [...s.apiKeys, newKey];
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team: s.team, apiKeys });
      return { apiKeys };
    });
  },

  revokeApiKey: (id) => {
    set((s) => {
      const apiKeys = s.apiKeys.filter((k) => k.id !== id);
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences: s.preferences, billing: s.billing, team: s.team, apiKeys });
      return { apiKeys };
    });
  },

  deleteAccount: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
    set({
      profile: DEFAULT_PROFILE,
      security: DEFAULT_SECURITY,
      notifications: DEFAULT_NOTIFS,
      preferences: DEFAULT_PREFS,
      billing: DEFAULT_BILLING,
      team: DEFAULT_TEAM,
      apiKeys: DEFAULT_API_KEYS,
    });
  },

  resetPreferences: () => {
    set((s) => {
      const preferences = DEFAULT_PREFS;
      save(SETTINGS_KEY, { profile: s.profile, security: s.security, notifications: s.notifications, preferences, billing: s.billing, team: s.team, apiKeys: s.apiKeys });
      return { preferences };
    });
  },

  getDisplayName: () => {
    const name = get().profile.fullName || "Agent";
    // If name already starts with "Agent ", return as-is; otherwise prefix
    if (name.toLowerCase().startsWith("agent ")) return name;
    return `Agent ${name}`;
  },

  getAvatar: () => {
    return get().profile.avatar || "/smuggler/assets/logo-hq.png";
  },
}));

/* ---------- Hook for components to get display name ---------- */

export function useDisplayName(): string {
  return useUserStore((s) => {
    const name = s.profile.fullName || "Agent";
    if (name.toLowerCase().startsWith("agent ")) return name;
    return `Agent ${name}`;
  });
}

export function useAvatar(): string {
  return useUserStore((s) => s.profile.avatar || "/smuggler/assets/logo-hq.png");
}
