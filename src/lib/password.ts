export interface PasswordEntry {
  hash: string;
  salt: string;
  is_temp: number;
}

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(
  password: string,
  existingSalt?: string
): Promise<{ hash: string; salt: string }> {
  const saltBytes = existingSalt
    ? fromHex(existingSalt)
    : crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  );

  return { hash: toHex(derived), salt: existingSalt ?? toHex(saltBytes.buffer) };
}

export async function verifyPassword(
  password: string,
  stored: PasswordEntry
): Promise<boolean> {
  const { hash } = await hashPassword(password, stored.salt);
  if (hash.length !== stored.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) {
    diff |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  }
  return diff === 0;
}

export function generateTempPassword(): string {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr, (b) => CHARSET[b % CHARSET.length]).join('');
}

export async function getPasswordEntry(
  db: D1Database,
  email: string
): Promise<PasswordEntry | null> {
  return db
    .prepare('SELECT hash, salt, is_temp FROM passwords WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first<PasswordEntry>();
}

export async function setPasswordEntry(
  db: D1Database,
  email: string,
  entry: PasswordEntry
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO passwords (email, hash, salt, is_temp) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET hash = ?, salt = ?, is_temp = ?'
    )
    .bind(
      email.toLowerCase().trim(),
      entry.hash,
      entry.salt,
      entry.is_temp,
      entry.hash,
      entry.salt,
      entry.is_temp
    )
    .run();
}

export async function deletePasswordEntry(
  db: D1Database,
  email: string
): Promise<void> {
  await db
    .prepare('DELETE FROM passwords WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .run();
}

export async function checkRateLimit(
  db: D1Database,
  email: string
): Promise<{ locked: boolean; remaining: number }> {
  const row = await db
    .prepare('SELECT fail_count, locked_until FROM login_attempts WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .first<{ fail_count: number; locked_until: string | null }>();

  if (!row) return { locked: false, remaining: LOCKOUT_THRESHOLD };

  if (row.locked_until && new Date(row.locked_until + 'Z') > new Date()) {
    return { locked: true, remaining: 0 };
  }

  if (row.locked_until && new Date(row.locked_until + 'Z') <= new Date()) {
    await db
      .prepare('DELETE FROM login_attempts WHERE email = ?')
      .bind(email.toLowerCase().trim())
      .run();
    return { locked: false, remaining: LOCKOUT_THRESHOLD };
  }

  return {
    locked: false,
    remaining: Math.max(0, LOCKOUT_THRESHOLD - row.fail_count),
  };
}

export async function recordFailedAttempt(
  db: D1Database,
  email: string
): Promise<{ locked: boolean }> {
  const normalized = email.toLowerCase().trim();
  const row = await db
    .prepare('SELECT fail_count FROM login_attempts WHERE email = ?')
    .bind(normalized)
    .first<{ fail_count: number }>();

  const count = row ? row.fail_count + 1 : 1;
  const locked = count >= LOCKOUT_THRESHOLD;
  const lockedUntil = locked
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString().replace('Z', '')
    : null;

  await db
    .prepare(
      'INSERT INTO login_attempts (email, fail_count, locked_until) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET fail_count = ?, locked_until = ?'
    )
    .bind(normalized, count, lockedUntil, count, lockedUntil)
    .run();

  return { locked };
}

export async function clearFailedAttempts(
  db: D1Database,
  email: string
): Promise<void> {
  await db
    .prepare('DELETE FROM login_attempts WHERE email = ?')
    .bind(email.toLowerCase().trim())
    .run();
}
