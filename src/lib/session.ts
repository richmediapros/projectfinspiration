const SESSION_COOKIE = 'fin_session';
const SESSION_TTL = 604800; // 7 days in seconds

export async function createSession(
  db: D1Database,
  email: string
): Promise<string> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const token = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + SESSION_TTL * 1000)
    .toISOString()
    .replace('Z', '');

  await db
    .prepare('INSERT INTO sessions (token, email, expires_at) VALUES (?, ?, ?)')
    .bind(token, email.toLowerCase().trim(), expiresAt)
    .run();

  return token;
}

export async function getSessionEmail(
  db: D1Database,
  token: string
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT email FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    )
    .bind(token)
    .first<{ email: string }>();

  return row?.email ?? null;
}

export async function deleteSession(
  db: D1Database,
  token: string
): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function deleteSessionsForEmail(
  db: D1Database,
  email: string
): Promise<void> {
  await db
    .prepare('DELETE FROM sessions WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .run();
}

export function makeSessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getTokenFromRequest(request: Request): string | null {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}
