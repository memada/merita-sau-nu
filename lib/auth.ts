import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { sessionSecret } from './security';
export const SESSION_COOKIE = 'merita_admin';
const TTL = 8 * 3600;
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function verifyCredentials(username: string, password: string) {
  const configuredUser = process.env.ADMIN_USERNAME;
  const parts = process.env.ADMIN_PASSWORD_HASH?.split(':');
  if (
    !configuredUser ||
    parts?.length !== 3 ||
    parts[0] !== 'scrypt' ||
    !/^[a-f0-9]{32}$/.test(parts[1]) ||
    !/^[a-f0-9]{128}$/.test(parts[2])
  )
    return false;
  const hash = scryptSync(password, parts[1], 64).toString('hex');
  return safeEqual(hash, parts[2]) && safeEqual(username, configuredUser);
}
export function signSession(username: string, now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ username, exp: Math.floor(now / 1000) + TTL }),
  ).toString('base64url');
  const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifySession(token: string | undefined, now = Date.now()): string | null {
  if (!token || token.length > 2000 || !process.env.ADMIN_USERNAME) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (extra || !payload || !signature) return null;
    const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
    if (!safeEqual(signature, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.username === process.env.ADMIN_USERNAME &&
      Number.isFinite(data.exp) &&
      data.exp > Math.floor(now / 1000) &&
      data.exp <= Math.floor(now / 1000) + TTL
      ? data.username
      : null;
  } catch {
    return null;
  }
}
export async function currentAdmin() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(process.env.APP_URL || 'http://localhost:3002').protocol === 'https:',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: TTL,
  };
}
