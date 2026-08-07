import { webcrypto } from 'node:crypto';

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function toHex(buf) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const tempPw = Array.from(
  webcrypto.getRandomValues(new Uint8Array(16)),
  (b) => CHARSET[b % CHARSET.length]
).join('');

const saltBytes = webcrypto.getRandomValues(new Uint8Array(SALT_LENGTH));
const keyMat = await webcrypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(tempPw),
  'PBKDF2',
  false,
  ['deriveBits']
);
const derived = await webcrypto.subtle.deriveBits(
  { name: 'PBKDF2', salt: saltBytes, iterations: ITERATIONS, hash: 'SHA-256' },
  keyMat,
  KEY_LENGTH * 8
);

const hash = toHex(derived);
const salt = toHex(saltBytes.buffer);
const userId = webcrypto.randomUUID();

const sql = [
  `INSERT OR IGNORE INTO users (id, email, name, role, status) VALUES ('${userId}', 'rich@texasbankers.com', 'Rich', 'super_admin', 'active')`,
  `INSERT OR REPLACE INTO passwords (email, hash, salt, is_temp) VALUES ('rich@texasbankers.com', '${hash}', '${salt}', 1)`,
].join(';\n');

console.log(sql);
console.error(`\nTemp password: ${tempPw}\n`);
