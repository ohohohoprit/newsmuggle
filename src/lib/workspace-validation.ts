/**
 * Validation schemas for workspace inputs.
 * Pure functions — no external deps. Throw on invalid input.
 */
import type { WorkspaceRole } from '@/lib/workspace-types';

const VALID_ROLES: WorkspaceRole[] = ['owner', 'admin', 'editor', 'viewer'];
const VALID_INVITE_ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer'];

export function validateWorkspaceName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Workspace name is required.');
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error('Workspace name must be at least 2 characters.');
  }
  if (trimmed.length > 80) {
    throw new Error('Workspace name must be 80 characters or fewer.');
  }
  return trimmed;
}

export function validateWorkspaceDescription(desc: unknown): string | undefined {
  if (desc === undefined || desc === null) return undefined;
  if (typeof desc !== 'string') {
    throw new Error('Workspace description must be a string.');
  }
  const trimmed = desc.trim();
  if (trimmed.length > 500) {
    throw new Error('Workspace description must be 500 characters or fewer.');
  }
  return trimmed || undefined;
}

export function validateWorkspaceSlug(slug: unknown): string | undefined {
  if (slug === undefined || slug === null) return undefined;
  if (typeof slug !== 'string') {
    throw new Error('Workspace slug must be a string.');
  }
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return undefined;
  if (!/^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(trimmed)) {
    throw new Error('Slug must be 2-50 chars: lowercase letters, numbers, and hyphens only.');
  }
  return trimmed;
}

export function validateWorkspaceType(type: unknown): 'personal' | 'team' {
  if (type === undefined || type === null) return 'team';
  if (typeof type !== 'string') {
    throw new Error('Workspace type must be a string.');
  }
  const t = type.trim().toLowerCase();
  if (t !== 'personal' && t !== 'team') {
    throw new Error('Workspace type must be "personal" or "team".');
  }
  return t as 'personal' | 'team';
}

export function validateRole(role: unknown): WorkspaceRole {
  if (typeof role !== 'string' || !role.trim()) {
    throw new Error('Role is required.');
  }
  const r = role.trim().toLowerCase() as WorkspaceRole;
  if (!VALID_ROLES.includes(r)) {
    throw new Error(`Role must be one of: ${VALID_ROLES.join(', ')}.`);
  }
  return r;
}

export function validateInviteRole(role: unknown): WorkspaceRole {
  if (typeof role !== 'string' || !role.trim()) {
    throw new Error('Invite role is required.');
  }
  const r = role.trim().toLowerCase() as WorkspaceRole;
  if (!VALID_INVITE_ROLES.includes(r)) {
    throw new Error(`Invite role must be one of: ${VALID_INVITE_ROLES.join(', ')} (owner is not assignable via invite).`);
  }
  return r;
}

export function validateInviteEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('Invite email is required.');
  }
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invite email format is invalid.');
  }
  if (trimmed.length > 255) {
    throw new Error('Invite email is too long.');
  }
  return trimmed;
}

export function validateInviteToken(token: unknown): string {
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('Invite token is required.');
  }
  const trimmed = token.trim();
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(trimmed)) {
    throw new Error('Invite token format is invalid.');
  }
  return trimmed;
}

export function validateWorkspaceId(id: unknown): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Workspace id is required.');
  }
  return id.trim();
}

export function validateMemberId(id: unknown): string {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Member id is required.');
  }
  return id.trim();
}
