import type { AstroGlobal } from 'astro';

export const SUPER_ADMIN_EMAIL = 'rich@texasbankers.com';

export function isLocalDev(request: Request): boolean {
  try {
    const url = new URL(request.url);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isSuperAdmin(email: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL;
}

export function isAdmin(locals: Record<string, any>): boolean {
  return locals.userRole === 'super_admin';
}

export function requireAdmin(astro: AstroGlobal): Response | null {
  if (isAdmin(astro.locals)) return null;
  return new Response('Forbidden', { status: 403 });
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  title: string | null;
  role: string;
  status: string;
  association_id: string | null;
  association_name: string | null;
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<UserRecord | null> {
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.title, u.role, u.status,
              u.association_id, a.name AS association_name
       FROM users u
       LEFT JOIN associations a ON u.association_id = a.id
       WHERE u.email = ?`
    )
    .bind(email.toLowerCase().trim())
    .first<UserRecord>();
}
