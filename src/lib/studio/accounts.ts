/**
 * Studio accounts service — manages connected social accounts.
 *
 * Handles:
 *   - listing connected accounts (workspace-scoped)
 *   - initiating OAuth flow (returns auth URL)
 *   - processing OAuth callback (exchanges code, stores account)
 *   - disconnecting accounts (soft delete)
 *   - resolving account by provider
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import { requireMembership } from '@/lib/workspace';
import { getProvider } from '@/lib/studio/providers';
import type {
  SocialProviderSlug,
  ConnectedAccountDTO,
  OAuthInitResult,
} from '@/lib/studio/types';
import {
  AccountNotFoundError,
  AccountAlreadyConnectedError,
  ProviderNotAvailableError,
  StudioError,
} from '@/lib/studio/errors';
import { canConnectAccount } from '@/lib/studio/entitlements';

// ===== Helpers =====

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toDTO(account: {
  id: string;
  workspaceId: string;
  provider: string;
  providerAccountId: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  description: string | null;
  accountType: string;
  followerCount: number;
  followingCount: number;
  totalViews: number;
  totalPosts: number;
  isVerified: boolean;
  isConnected: boolean;
  lastSyncedAt: Date | null;
  syncStatus: string;
  createdAt: Date;
  updatedAt: Date;
}): ConnectedAccountDTO {
  return {
    id: account.id,
    workspaceId: account.workspaceId,
    provider: account.provider as SocialProviderSlug,
    providerAccountId: account.providerAccountId,
    handle: account.handle,
    displayName: account.displayName,
    avatar: account.avatar,
    description: account.description,
    accountType: account.accountType as ConnectedAccountDTO['accountType'],
    followerCount: account.followerCount,
    followingCount: account.followingCount,
    totalViews: account.totalViews,
    totalPosts: account.totalPosts,
    isVerified: account.isVerified,
    isConnected: account.isConnected,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
    syncStatus: account.syncStatus as ConnectedAccountDTO['syncStatus'],
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

// ===== Public API =====

/** List all connected accounts for a workspace. */
export async function listAccounts(workspaceId: string, userId: string): Promise<ConnectedAccountDTO[]> {
  await requireMembership(workspaceId, userId);
  const accounts = await db.connectedAccount.findMany({
    where: { workspaceId, isConnected: true },
    orderBy: [{ provider: 'asc' }, { createdAt: 'asc' }],
  });
  return accounts.map(toDTO);
}

/** Get a specific connected account by provider. */
export async function getAccountByProvider(
  workspaceId: string,
  userId: string,
  provider: SocialProviderSlug,
): Promise<ConnectedAccountDTO> {
  await requireMembership(workspaceId, userId);
  const account = await db.connectedAccount.findFirst({
    where: { workspaceId, provider, isConnected: true },
  });
  if (!account) {
    throw new AccountNotFoundError(provider, workspaceId);
  }
  return toDTO(account);
}

/** Initiate OAuth flow for a provider. Returns the auth URL + state. */
export async function initiateConnect(
  workspaceId: string,
  userId: string,
  providerSlug: SocialProviderSlug,
): Promise<OAuthInitResult> {
  await requireMembership(workspaceId, userId);

  const provider = getProvider(providerSlug);
  if (!provider.isAvailable()) {
    throw new ProviderNotAvailableError(providerSlug);
  }

  // Check billing entitlements + account limits
  const canConnect = await canConnectAccount(workspaceId);
  if (!canConnect.allowed) {
    throw new StudioError('ACCOUNT_LIMIT_REACHED', canConnect.reason ?? 'Account limit reached.', 403, {
      current: canConnect.current,
      max: canConnect.max,
    });
  }

  return provider.buildAuthUrl(workspaceId, userId);
}

/** Process the OAuth callback and store the connected account. */
export async function completeConnect(
  workspaceId: string,
  userId: string,
  providerSlug: SocialProviderSlug,
  code: string,
  state: string,
  req?: Request,
): Promise<ConnectedAccountDTO> {
  await requireMembership(workspaceId, userId);

  const provider = getProvider(providerSlug);
  if (!provider.isAvailable()) {
    throw new ProviderNotAvailableError(providerSlug);
  }

  // Exchange code for tokens + fetch profile
  const { profile } = await provider.exchangeCodeForTokens(code, state);

  // Check if this account is already connected to this workspace
  const existing = await db.connectedAccount.findUnique({
    where: {
      workspaceId_provider_providerAccountId: {
        workspaceId,
        provider: providerSlug,
        providerAccountId: profile.providerAccountId,
      },
    },
  });

  if (existing && existing.isConnected) {
    throw new AccountAlreadyConnectedError(providerSlug, profile.providerAccountId);
  }

  // Upsert the connected account
  const account = await db.connectedAccount.upsert({
    where: {
      workspaceId_provider_providerAccountId: {
        workspaceId,
        provider: providerSlug,
        providerAccountId: profile.providerAccountId,
      },
    },
    update: {
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      description: profile.description,
      accountType: profile.accountType,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      totalViews: profile.totalViews,
      totalPosts: profile.totalPosts,
      isVerified: profile.isVerified,
      isConnected: true,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      tokenExpiresAt: profile.tokenExpiresAt,
      tokenScope: JSON.stringify(profile.tokenScope),
      providerMetadata: JSON.stringify(profile.metadata),
      connectedById: userId,
      syncStatus: 'pending',
    },
    create: {
      workspaceId,
      provider: providerSlug,
      providerAccountId: profile.providerAccountId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatar: profile.avatar,
      description: profile.description,
      accountType: profile.accountType,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
      totalViews: profile.totalViews,
      totalPosts: profile.totalPosts,
      isVerified: profile.isVerified,
      isConnected: true,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      tokenExpiresAt: profile.tokenExpiresAt,
      tokenScope: JSON.stringify(profile.tokenScope),
      providerMetadata: JSON.stringify(profile.metadata),
      connectedById: userId,
      syncStatus: 'pending',
    },
  });

  if (req) {
    await auditLog('studio_account_connect', userId, req, 'success', {
      workspaceId,
      provider: providerSlug,
      providerAccountId: profile.providerAccountId,
      handle: profile.handle,
    });
  }

  return toDTO(account);
}

/** Disconnect a social account (soft delete). */
export async function disconnectAccount(
  workspaceId: string,
  userId: string,
  providerSlug: SocialProviderSlug,
  req?: Request,
): Promise<void> {
  await requireMembership(workspaceId, userId);

  const account = await db.connectedAccount.findFirst({
    where: { workspaceId, provider: providerSlug, isConnected: true },
  });
  if (!account) {
    throw new AccountNotFoundError(providerSlug, workspaceId);
  }

  await db.connectedAccount.update({
    where: { id: account.id },
    data: {
      isConnected: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      syncStatus: 'stale',
    },
  });

  if (req) {
    await auditLog('studio_account_disconnect', userId, req, 'success', {
      workspaceId,
      provider: providerSlug,
      providerAccountId: account.providerAccountId,
    });
  }

  // Emit notification event (non-blocking)
  try {
    const { emitNotificationEvent } = await import('@/lib/notifications/events');
    await emitNotificationEvent({
      workspaceId,
      userId,
      eventType: 'studio.account_disconnected',
      source: 'studio',
      payload: {
        workspaceId,
        provider: providerSlug,
        displayName: account.displayName,
        handle: account.handle,
      },
    });
  } catch {
    // notification failure shouldn't affect disconnect
  }
}

/**
 * Get the raw connected account row (for the sync service — includes tokens).
 */
export async function getRawAccount(workspaceId: string, providerSlug: SocialProviderSlug) {
  const account = await db.connectedAccount.findFirst({
    where: { workspaceId, provider: providerSlug, isConnected: true },
  });
  if (!account) {
    throw new AccountNotFoundError(providerSlug, workspaceId);
  }
  return account;
}
