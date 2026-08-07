/**
 * Seed the super admin user into the local D1 database.
 * Run after creating the D1 database and applying migrations:
 *
 *   npx wrangler d1 execute finspiration --local --file=migrations/0001_schema.sql
 *   node scripts/seed-admin.mjs
 */

import { webcrypto } from 'node:crypto';
import { execSync } from 'node:child_process';

const SUPER_ADMIN_EMAIL = 'rich@texasbankers.com';
const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function toHex(buf) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password) {
  const saltBytes = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await webcrypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return { hash: toHex(derived), salt: toHex(saltBytes.buffer) };
}

function generateTempPassword() {
  const arr = webcrypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr, (b) => CHARSET[b % CHARSET.length]).join('');
}

async function main() {
  const tempPassword = generateTempPassword();
  const { hash, salt } = await hashPassword(tempPassword);
  const userId = webcrypto.randomUUID();

  const sql = `
INSERT OR IGNORE INTO users (id, email, name, role, status)
VALUES ('${userId}', '${SUPER_ADMIN_EMAIL}', 'Rich', 'super_admin', 'active');

INSERT OR REPLACE INTO passwords (email, hash, salt, is_temp)
VALUES ('${SUPER_ADMIN_EMAIL}', '${hash}', '${salt}', 1);
`.trim();

  execSync(`npx wrangler d1 execute finspiration --local --command="${sql.replace(/"/g, '\\"')}"`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  console.log('\n=== Super Admin Seeded ===');
  console.log(`Email:    ${SUPER_ADMIN_EMAIL}`);
  console.log(`Password: ${tempPassword}`);
  console.log('\nYou will be prompted to set a permanent password on first login.\n');
}

main().catch(console.error);
