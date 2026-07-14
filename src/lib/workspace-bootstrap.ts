/**
 * Workspace bootstrap — creates a default personal workspace for a user
 * on first login. Lives in a standalone module (only depends on db) so
 * it can be safely called from `src/lib/auth.ts` `createSession()` without
 * creating a circular import with the main workspace service.
 */
import { db } from '@/lib/db';

const PERSONAL_DEFAULT_NAME = 'My Workspace';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Ensure the user has at least one workspace. If they have none, create a
 * default personal workspace, add them as `owner`, and set it as active.
 * Returns the active workspace id (existing or newly created).
 *
 * Idempotent and safe to call on every login.
 */
export async function ensurePersonalWorkspace(userId: string): Promise<string> {
  // Find any existing membership (personal or team)
  const existing = await db.workspaceMember.findFirst({
    where: { userId, status: 'active' },
    orderBy: { joinedAt: 'asc' },
  });

  if (existing) {
    // Make sure an activeWorkspaceId is set; if not, default to first workspace
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { activeWorkspaceId: true },
    });
    if (!user?.activeWorkspaceId) {
      await db.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: existing.workspaceId },
      });
    }
    return (user?.activeWorkspaceId ?? existing.workspaceId) as string;
  }

  // No workspace yet — create a personal one
  const slug = slugify(PERSONAL_DEFAULT_NAME);
  const workspace = await db.workspace.create({
    data: {
      name: PERSONAL_DEFAULT_NAME,
      slug,
      type: 'personal',
      ownerId: userId,
      settings: JSON.stringify({ defaultPlan: 'starter' }),
      members: {
        create: {
          userId,
          role: 'owner',
          status: 'active',
        },
      },
    },
  });

  await db.user.update({
    where: { id: userId },
    data: { activeWorkspaceId: workspace.id },
  });

  return workspace.id;
}
