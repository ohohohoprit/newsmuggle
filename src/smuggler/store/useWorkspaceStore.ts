'use client';

import { create } from 'zustand';

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: string;
  avatar: string | null;
  role: string;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BillingUsage {
  generationsUsed: number;
  generationsLimit: number;
  generationsRemaining: number;
  tokensUsed: number;
  costUsd: number;
  periodStart: string;
  periodEnd: string;
}

export interface BillingPlan {
  slug: string;
  name: string;
  description: string | null;
  priceMonthly: number | null;
  priceYearly: number | null;
  maxGenerations: number;
  maxTools: number;
  maxStorage: number;
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  features: Record<string, unknown> | null;
}

export interface BillingEntitlements {
  plan: string;
  maxGenerations: number;
  maxTools: number;
  maxStorage: number;
  teamSeats: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  features: Record<string, unknown> | null;
}

export interface BillingStatus {
  workspaceId: string;
  plan: BillingPlan | null;
  usage: BillingUsage;
  entitlements: BillingEntitlements;
  isTrialing: boolean;
  isActive: boolean;
  isPastDue: boolean;
  isCanceled: boolean;
  daysUntilRenewal: number | null;
}

interface WorkspaceState {
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
  billingStatus: BillingStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspace: null,
  billingStatus: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [workspacesRes, billingRes] = await Promise.all([
        fetch('/api/workspaces'),
        fetch('/api/billing/status'),
      ]);

      if (!workspacesRes.ok) {
        set({ loading: false, error: 'Failed to load workspaces.', workspaces: [], activeWorkspace: null });
        return;
      }

      const workspacesData = await workspacesRes.json();
      const active = workspacesData.active as WorkspaceSummary | null;
      const workspaces = workspacesData.workspaces as WorkspaceSummary[];

      let billingStatus: BillingStatus | null = null;
      if (billingRes.ok) {
        billingStatus = await billingRes.json() as BillingStatus;
      }

      set({
        workspaces,
        activeWorkspace: active,
        billingStatus,
        loading: false,
        error: null,
      });
    } catch {
      set({ loading: false, error: 'Network error loading workspace data.' });
    }
  },
}));
