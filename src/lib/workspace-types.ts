/**
 * Shared workspace types and constants.
 * Kept in a standalone module so it can be imported by both
 * `src/lib/auth.ts` (bootstrap) and `src/lib/workspace.ts` (service)
 * without creating a circular dependency.
 */

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type WorkspaceType = 'personal' | 'team';
export type MemberStatus = 'active' | 'invited' | 'removed';

export const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  owner: 3,
};

export const ALL_ROLES: WorkspaceRole[] = ['owner', 'admin', 'editor', 'viewer'];
export const ASSIGNABLE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

/** A role can manage another role if its rank is strictly higher. */
export function canManageRole(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

export function isAtLeast(role: WorkspaceRole, min: WorkspaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
