/**
 * Workspace Service Layer — all business logic for workspaces, members,
 * invites, role enforcement, and audit logging.
 *
 * Route handlers call these functions; they never touch Prisma directly
 * and never bypass the membership/role checks enforced here.
 *
 * Workspace isolation rule: EVERY read/write that targets a workspace
 * must go through `requireMembership()` (or `requireRole()`), which
 * verifies the caller belongs to the workspace with sufficient role.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/auth';
import crypto from 'crypto';
import {
  type WorkspaceRole,
  type WorkspaceType,
  type MemberStatus,
  ROLE_RANK,
  ASSIGNABLE_ROLES,
  canManageRole,
  isAtLeast,
} from '@/lib/workspace-types';

export { ensurePersonalWorkspace } from '@/lib/workspace-bootstrap';

// ===== Constants =====

const INVITE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ACTIVE_INVITES_PER_WORKSPACE = 50;

// ===== Errors =====

export class WorkspaceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'WorkspaceError';
  }
}

// ===== Types (public API) =====

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: WorkspaceType;
  avatar: string | null;
  role: WorkspaceRole;
  isActive: boolean;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  avatar: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  isOwner: boolean;
  joinedAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: WorkspaceType;
  avatar: string | null;
  role: WorkspaceRole;
  isActive: boolean;
  settings: Record<string, unknown> | null;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    avatar: string | null;
  };
  members: WorkspaceMemberInfo[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InviteInfo {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: { id: string; name: string | null; email: string | null };
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: string;
  /** Present only on the invite-creation response (the shareable link token). */
  token?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  slug?: string;
  type?: WorkspaceType;
  avatar?: string;
  settings?: Record<string, unknown>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Record<string, unknown>;
}

export interface InviteInput {
  email: string;
  role: WorkspaceRole;
}

// ===== Internal helpers =====

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

async function generateUniqueSlug(base: string): Promise<string> {
  // Try the provided slug first, then add suffixes until unique.
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    const clash = await db.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  // Fallback: append timestamp
  return `${base}-${Date.now().toString(36)}`;
}

function parseSettings(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toMemberRole(role: string): WorkspaceRole {
  if ((['owner', 'admin', 'editor', 'viewer'] as const).includes(role as WorkspaceRole)) {
    return role as WorkspaceRole;
  }
  return 'viewer';
}

function toWorkspaceType(type: string): WorkspaceType {
  return type === 'personal' ? 'personal' : 'team';
}

/**
 * Verify the user is an active member of the workspace and return both
 * the workspace and membership row. Throws WorkspaceError otherwise.
 *
 * This is the single chokepoint that enforces workspace isolation.
 */
export async function requireMembership(workspaceId: string, userId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });

  if (!membership || membership.status !== 'active') {
    throw new WorkspaceError('NOT_WORKSPACE_MEMBER', 'You do not have access to this workspace.', 403);
  }
  if (!membership.workspace) {
    throw new WorkspaceError('WORKSPACE_NOT_FOUND', 'Workspace not found.', 404);
  }

  return {
    workspace: membership.workspace,
    membership,
    role: toMemberRole(membership.role),
  };
}

/**
 * Like requireMembership but also enforces a minimum role.
 */
export async function requireRole(workspaceId: string, userId: string, minRole: WorkspaceRole) {
  const ctx = await requireMembership(workspaceId, userId);
  if (!isAtLeast(ctx.role, minRole)) {
    throw new WorkspaceError(
      'INSUFFICIENT_ROLE',
      `This action requires at least ${minRole} role in the workspace.`,
      403,
    );
  }
  return ctx;
}

function toSummary(params: {
  workspace: { id: string; name: string; slug: string; description: string | null; type: string; avatar: string | null; createdAt: Date; updatedAt: Date };
  role: WorkspaceRole;
  isActive: boolean;
  memberCount: number;
}): WorkspaceSummary {
  const { workspace, role, isActive, memberCount } = params;
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    type: toWorkspaceType(workspace.type),
    avatar: workspace.avatar,
    role,
    isActive,
    memberCount,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

// ===== Public service functions =====

/**
 * List all workspaces the user belongs to (active memberships only).
 * Marks the active one and includes member counts.
 */
export async function listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  const memberships = await db.workspaceMember.findMany({
    where: { userId, status: 'active' },
    include: {
      workspace: {
        include: { _count: { select: { members: { where: { status: 'active' } } } } },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return memberships.map((m) =>
    toSummary({
      workspace: m.workspace,
      role: toMemberRole(m.role),
      isActive: m.workspaceId === user?.activeWorkspaceId,
      memberCount: m.workspace._count.members,
    }),
  );
}

/**
 * Get the user's currently active workspace (or null if none).
 */
export async function getActiveWorkspace(userId: string): Promise<WorkspaceSummary | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      activeWorkspace: {
        include: { _count: { select: { members: { where: { status: 'active' } } } } },
      },
    },
  });

  if (!user?.activeWorkspace) {
    // Fall back to first membership
    const list = await listWorkspaces(userId);
    return list[0] ?? null;
  }

  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: user.activeWorkspace.id, userId } },
  });

  return toSummary({
    workspace: user.activeWorkspace,
    role: membership ? toMemberRole(membership.role) : 'viewer',
    isActive: true,
    memberCount: user.activeWorkspace._count.members,
  });
}

/**
 * Get full workspace detail (members, owner, settings) — requires membership.
 */
export async function getWorkspaceDetail(workspaceId: string, userId: string): Promise<WorkspaceDetail> {
  const { workspace, role } = await requireMembership(workspaceId, userId);

  const [owner, members, userActive] = await Promise.all([
    db.user.findUnique({
      where: { id: workspace.ownerId },
      select: { id: true, name: true, email: true, avatar: true },
    }),
    db.workspaceMember.findMany({
      where: { workspaceId, status: 'active' },
      include: {
        user: { select: { id: true, name: true, email: true, username: true, avatar: true } },
      },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    }),
    db.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } }),
  ]);

  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    type: toWorkspaceType(workspace.type),
    avatar: workspace.avatar,
    role,
    isActive: userActive?.activeWorkspaceId === workspace.id,
    settings: parseSettings(workspace.settings),
    owner: owner ?? { id: workspace.ownerId, name: null, email: null, avatar: null },
    members: members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      username: m.user.username,
      avatar: m.user.avatar,
      role: toMemberRole(m.role),
      status: m.status as MemberStatus,
      isOwner: m.role === 'owner',
      joinedAt: m.joinedAt.toISOString(),
    })),
    memberCount: members.length,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

/**
 * Create a new team workspace. The creator becomes the owner.
 * Personal workspaces are auto-created via ensurePersonalWorkspace; this
 * function is for explicit team workspace creation by the user.
 */
export async function createTeamWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
  req: Request,
): Promise<WorkspaceDetail> {
  const type: WorkspaceType = input.type === 'personal' ? 'personal' : 'team';

  const slug = await generateUniqueSlug(input.slug || slugify(input.name));

  const workspace = await db.workspace.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      type,
      avatar: input.avatar ?? null,
      ownerId: userId,
      settings: input.settings ? JSON.stringify(input.settings) : null,
      members: {
        create: {
          userId,
          role: 'owner',
          status: 'active',
        },
      },
    },
  });

  // Switch active workspace to the newly created one
  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspace.id },
  });

  await auditLog('workspace_create', userId, req, 'success', {
    workspaceId: workspace.id,
    name: workspace.name,
    type: workspace.type,
  });

  return getWorkspaceDetail(workspace.id, userId);
}

/**
 * Update workspace metadata (name, description, avatar, settings).
 * Requires admin or owner.
 */
export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceInput,
  req: Request,
): Promise<WorkspaceDetail> {
  await requireRole(workspaceId, userId, 'admin');

  const updateData: Record<string, string | null> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description || null;
  if (input.avatar !== undefined) updateData.avatar = input.avatar || null;
  if (input.settings !== undefined) updateData.settings = JSON.stringify(input.settings);

  if (Object.keys(updateData).length > 0) {
    await db.workspace.update({
      where: { id: workspaceId },
      data: updateData,
    });
  }

  await auditLog('workspace_update', userId, req, 'success', {
    workspaceId,
    fields: Object.keys(updateData),
  });

  return getWorkspaceDetail(workspaceId, userId);
}

/**
 * Switch the user's active workspace. User must be a member.
 */
export async function switchActiveWorkspace(
  userId: string,
  workspaceId: string,
  req: Request,
): Promise<WorkspaceSummary> {
  const { workspace, role } = await requireMembership(workspaceId, userId);

  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspaceId },
  });

  await auditLog('workspace_switch', userId, req, 'success', { workspaceId });

  const count = await db.workspaceMember.count({ where: { workspaceId, status: 'active' } });
  return toSummary({ workspace, role, isActive: true, memberCount: count });
}

/**
 * Invite a user to a workspace by email. Generates a secure token with expiry.
 * Requires admin or owner. Role cannot be owner.
 */
export async function inviteMember(
  workspaceId: string,
  inviterId: string,
  input: InviteInput,
  req: Request,
): Promise<InviteInfo> {
  const { workspace } = await requireRole(workspaceId, inviterId, 'admin');

  if (input.role === 'owner') {
    throw new WorkspaceError('CANNOT_INVITE_OWNER', 'Cannot invite a user as owner. Ownership transfer is not supported via invite.', 400);
  }
  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    throw new WorkspaceError('INVALID_INVITE_ROLE', 'Invite role must be admin, editor, or viewer.', 400);
  }

  // Check if email is already an active member
  const existingUser = await db.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const existingMembership = await db.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
    });
    if (existingMembership && existingMembership.status === 'active') {
      throw new WorkspaceError('ALREADY_MEMBER', 'This user is already a member of the workspace.', 409);
    }
  }

  // Limit pending invites
  const pendingCount = await db.workspaceInvite.count({
    where: {
      workspaceId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (pendingCount >= MAX_ACTIVE_INVITES_PER_WORKSPACE) {
    throw new WorkspaceError('TOO_MANY_INVITES', 'This workspace has too many pending invites.', 429);
  }

  // Revoke any previous pending invite for the same email in this workspace
  await db.workspaceInvite.updateMany({
    where: {
      workspaceId,
      email: input.email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date(), revokedBy: inviterId },
  });

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + INVITE_DURATION_MS);

  const invite = await db.workspaceInvite.create({
    data: {
      workspaceId,
      email: input.email,
      token,
      role: input.role,
      invitedBy: inviterId,
      expiresAt,
    },
  });

  await auditLog('workspace_invite_create', inviterId, req, 'success', {
    workspaceId,
    inviteId: invite.id,
    email: input.email,
    role: input.role,
  });

  // Return the token only on creation so the inviter can build the shareable link.
  return toInviteInfo(invite, workspace.name, { id: inviterId, name: null, email: null }, true);
}

/**
 * List pending/all invites for a workspace. Requires admin or owner.
 */
export async function listInvites(workspaceId: string, userId: string): Promise<InviteInfo[]> {
  await requireRole(workspaceId, userId, 'admin');

  const invites = await db.workspaceInvite.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  if (invites.length === 0) return [];

  const inviterIds = [...new Set(invites.map((i) => i.invitedBy))];
  const inviters = await db.user.findMany({
    where: { id: { in: inviterIds } },
    select: { id: true, name: true, email: true },
  });
  const inviterMap = new Map(inviters.map((u) => [u.id, u]));

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });

  return invites.map((i) =>
    toInviteInfo(i, workspace?.name ?? 'Workspace', inviterMap.get(i.invitedBy) ?? { id: i.invitedBy, name: null, email: null }),
  );
}

/**
 * Revoke a pending invite. Requires admin or owner.
 */
export async function revokeInvite(
  workspaceId: string,
  inviteId: string,
  userId: string,
  req: Request,
): Promise<void> {
  await requireRole(workspaceId, userId, 'admin');

  const invite = await db.workspaceInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.workspaceId !== workspaceId) {
    throw new WorkspaceError('INVITE_NOT_FOUND', 'Invite not found in this workspace.', 404);
  }
  if (invite.acceptedAt || invite.revokedAt) {
    throw new WorkspaceError('INVITE_ALREADY_USED', 'This invite has already been accepted or revoked.', 400);
  }

  await db.workspaceInvite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date(), revokedBy: userId },
  });

  await auditLog('workspace_invite_revoke', userId, req, 'success', {
    workspaceId,
    inviteId,
    email: invite.email,
  });
}

/**
 * Look up an invite by its token (for the accept flow).
 * Public — does not require auth, but accepting requires an authenticated user.
 */
export async function getInviteByToken(token: string): Promise<InviteInfo> {
  const invite = await db.workspaceInvite.findUnique({ where: { token } });
  if (!invite) {
    throw new WorkspaceError('INVITE_NOT_FOUND', 'Invite not found.', 404);
  }

  const workspace = await db.workspace.findUnique({
    where: { id: invite.workspaceId },
    select: { name: true },
  });
  const inviter = await db.user.findUnique({
    where: { id: invite.invitedBy },
    select: { id: true, name: true, email: true },
  });

  return toInviteInfo(
    invite,
    workspace?.name ?? 'Workspace',
    inviter ?? { id: invite.invitedBy, name: null, email: null },
  );
}

/**
 * Accept an invite as the currently authenticated user.
 * The user's email must match the invite email. Creates an active membership
 * and marks the invite as accepted.
 */
export async function acceptInvite(
  token: string,
  userId: string,
  req: Request,
): Promise<WorkspaceSummary> {
  const invite = await db.workspaceInvite.findUnique({ where: { token } });
  if (!invite) {
    throw new WorkspaceError('INVITE_NOT_FOUND', 'Invite not found.', 404);
  }
  if (invite.acceptedAt) {
    throw new WorkspaceError('INVITE_ALREADY_ACCEPTED', 'This invite has already been accepted.', 400);
  }
  if (invite.revokedAt) {
    throw new WorkspaceError('INVITE_REVOKED', 'This invite has been revoked.', 400);
  }
  if (invite.expiresAt < new Date()) {
    throw new WorkspaceError('INVITE_EXPIRED', 'This invite has expired.', 410);
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) {
    throw new WorkspaceError('USER_NOT_FOUND', 'User not found.', 404);
  }
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    throw new WorkspaceError(
      'INVITE_EMAIL_MISMATCH',
      'This invite was sent to a different email address. You must be signed in with the invited email to accept.',
      403,
    );
  }

  // Upsert membership (reactivate if previously removed)
  const existing = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
  });
  if (existing) {
    await db.workspaceMember.update({
      where: { id: existing.id },
      data: { role: invite.role as WorkspaceRole, status: 'active', joinedAt: new Date() },
    });
  } else {
    await db.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role as WorkspaceRole,
        status: 'active',
        invitedBy: invite.invitedBy,
      },
    });
  }

  await db.workspaceInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date(), acceptedBy: userId },
  });

  await auditLog('workspace_invite_accept', userId, req, 'success', {
    workspaceId: invite.workspaceId,
    inviteId: invite.id,
    role: invite.role,
  });

  const workspace = await db.workspace.findUnique({ where: { id: invite.workspaceId } });
  if (!workspace) {
    throw new WorkspaceError('WORKSPACE_NOT_FOUND', 'Workspace no longer exists.', 404);
  }

  const count = await db.workspaceMember.count({ where: { workspaceId: workspace.id, status: 'active' } });
  return toSummary({
    workspace,
    role: invite.role as WorkspaceRole,
    isActive: false,
    memberCount: count,
  });
}

/**
 * List members of a workspace. Requires any active membership.
 */
export async function listMembers(workspaceId: string, userId: string): Promise<WorkspaceMemberInfo[]> {
  await requireMembership(workspaceId, userId);

  // Only return active members — removed members are kept in the DB for audit
  // history but hidden from the member list.
  const members = await db.workspaceMember.findMany({
    where: { workspaceId, status: 'active' },
    include: {
      user: { select: { id: true, name: true, email: true, username: true, avatar: true } },
    },
    orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    username: m.user.username,
    avatar: m.user.avatar,
    role: toMemberRole(m.role),
    status: m.status as MemberStatus,
    isOwner: m.role === 'owner',
    joinedAt: m.joinedAt.toISOString(),
  }));
}

/**
 * Change a member's role. Requires owner or admin.
 * Rules:
 *  - The owner's role cannot be changed by anyone (ownership transfer is a separate flow).
 *  - Only the owner can promote to admin or change an admin's role.
 *  - Cannot assign the owner role.
 */
export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  userId: string,
  newRole: WorkspaceRole,
  req: Request,
): Promise<WorkspaceMemberInfo> {
  const { role: actorRole } = await requireRole(workspaceId, userId, 'admin');

  if (newRole === 'owner') {
    throw new WorkspaceError('CANNOT_ASSIGN_OWNER', 'The owner role cannot be assigned. Use ownership transfer instead.', 400);
  }
  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    throw new WorkspaceError('INVALID_ROLE', 'Role must be admin, editor, or viewer.', 400);
  }

  const target = await db.workspaceMember.findUnique({
    where: { id: memberId },
    include: { workspace: true },
  });
  if (!target || target.workspaceId !== workspaceId) {
    throw new WorkspaceError('MEMBER_NOT_FOUND', 'Member not found in this workspace.', 404);
  }
  if (target.status !== 'active') {
    throw new WorkspaceError('MEMBER_NOT_ACTIVE', 'This member is not active.', 400);
  }
  if (target.role === 'owner') {
    throw new WorkspaceError('CANNOT_MODIFY_OWNER', 'The workspace owner\'s role cannot be changed.', 403);
  }

  const targetRole = toMemberRole(target.role);
  // Admins cannot manage other admins (only owner can)
  if (actorRole === 'admin' && targetRole === 'admin') {
    throw new WorkspaceError('CANNOT_MANAGE_ADMIN', 'Only the workspace owner can manage admins.', 403);
  }
  // Admins cannot promote a viewer/editor to admin (only owner can)
  if (actorRole === 'admin' && newRole === 'admin') {
    throw new WorkspaceError('CANNOT_PROMOTE_ADMIN', 'Only the workspace owner can promote members to admin.', 403);
  }
  // General rank check
  if (!canManageRole(actorRole, targetRole)) {
    throw new WorkspaceError('INSUFFICIENT_ROLE', 'You cannot manage a member with an equal or higher role.', 403);
  }

  await db.workspaceMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  await auditLog('workspace_member_role_update', userId, req, 'success', {
    workspaceId,
    memberId,
    targetUserId: target.userId,
    oldRole: target.role,
    newRole,
  });

  const updated = await db.workspaceMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, name: true, email: true, username: true, avatar: true } } },
  });
  if (!updated) {
    throw new WorkspaceError('MEMBER_NOT_FOUND', 'Member not found after update.', 404);
  }
  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.user.name,
    email: updated.user.email,
    username: updated.user.username,
    avatar: updated.user.avatar,
    role: toMemberRole(updated.role),
    status: updated.status as MemberStatus,
    isOwner: updated.role === 'owner',
    joinedAt: updated.joinedAt.toISOString(),
  };
}

/**
 * Remove a member from the workspace. Requires owner or admin.
 * Rules:
 *  - The owner cannot be removed.
 *  - Admins cannot remove other admins (only owner can).
 */
export async function removeMember(
  workspaceId: string,
  memberId: string,
  userId: string,
  req: Request,
): Promise<void> {
  const { role: actorRole } = await requireRole(workspaceId, userId, 'admin');

  const target = await db.workspaceMember.findUnique({
    where: { id: memberId },
    include: { workspace: true },
  });
  if (!target || target.workspaceId !== workspaceId) {
    throw new WorkspaceError('MEMBER_NOT_FOUND', 'Member not found in this workspace.', 404);
  }
  if (target.role === 'owner') {
    throw new WorkspaceError('CANNOT_REMOVE_OWNER', 'The workspace owner cannot be removed.', 403);
  }

  const targetRole = toMemberRole(target.role);
  if (actorRole === 'admin' && targetRole === 'admin') {
    throw new WorkspaceError('CANNOT_REMOVE_ADMIN', 'Only the workspace owner can remove admins.', 403);
  }
  if (!canManageRole(actorRole, targetRole)) {
    throw new WorkspaceError('INSUFFICIENT_ROLE', 'You cannot remove a member with an equal or higher role.', 403);
  }

  // Soft-delete: mark as removed so audit history is preserved.
  await db.workspaceMember.update({
    where: { id: memberId },
    data: { status: 'removed' },
  });

  // If the removed user had this workspace active, clear their active pointer
  await db.user.updateMany({
    where: { id: target.userId, activeWorkspaceId: workspaceId },
    data: { activeWorkspaceId: null },
  });

  await auditLog('workspace_member_remove', userId, req, 'success', {
    workspaceId,
    memberId,
    targetUserId: target.userId,
    targetRole: target.role,
  });
}

/**
 * A member leaves the workspace voluntarily.
 * The owner cannot leave (must transfer ownership or delete the workspace).
 */
export async function leaveWorkspace(workspaceId: string, userId: string, req: Request): Promise<void> {
  const { membership } = await requireMembership(workspaceId, userId);

  if (membership.role === 'owner') {
    throw new WorkspaceError(
      'OWNER_CANNOT_LEAVE',
      'The workspace owner cannot leave. Transfer ownership or delete the workspace instead.',
      400,
    );
  }

  await db.workspaceMember.update({
    where: { id: membership.id },
    data: { status: 'removed' },
  });

  // Clear active workspace pointer if it pointed here
  await db.user.updateMany({
    where: { id: userId, activeWorkspaceId: workspaceId },
    data: { activeWorkspaceId: null },
  });

  await auditLog('workspace_member_leave', userId, req, 'success', {
    workspaceId,
    memberId: membership.id,
  });
}

/**
 * Delete a workspace entirely. Owner only.
 * This cascades to members, invites, and clears activeWorkspaceId on users
 * (via the SetNull relation).
 */
export async function deleteWorkspace(workspaceId: string, userId: string, req: Request): Promise<void> {
  const { workspace } = await requireRole(workspaceId, userId, 'owner');

  // Clear activeWorkspaceId for all users pointing here (defensive — relation is SetNull but
  // we want to be sure across the SQLite driver)
  await db.user.updateMany({
    where: { activeWorkspaceId: workspaceId },
    data: { activeWorkspaceId: null },
  });

  await db.workspace.delete({ where: { id: workspaceId } });

  await auditLog('workspace_delete', userId, req, 'success', {
    workspaceId,
    name: workspace.name,
    slug: workspace.slug,
  });
}

// ===== Invite serialization helper =====

function toInviteInfo(
  invite: {
    id: string;
    workspaceId: string;
    email: string;
    role: string;
    invitedBy: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
    token?: string;
  },
  workspaceName: string,
  inviter: { id: string; name: string | null; email: string | null },
  includeToken = false,
): InviteInfo {
  const now = new Date();
  let status: InviteInfo['status'] = 'pending';
  if (invite.acceptedAt) status = 'accepted';
  else if (invite.revokedAt) status = 'revoked';
  else if (invite.expiresAt < now) status = 'expired';

  const info: InviteInfo = {
    id: invite.id,
    workspaceId: invite.workspaceId,
    workspaceName,
    email: invite.email,
    role: toMemberRole(invite.role),
    invitedBy: inviter,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() ?? null,
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    status,
    createdAt: invite.createdAt.toISOString(),
  };
  if (includeToken && invite.token) {
    info.token = invite.token;
  }
  return info;
}
