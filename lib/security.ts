import { isIP } from 'node:net';
import { createHmac } from 'node:crypto';
import { getDb } from './db';
import { appUrl } from './config';
export function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32)
    throw new Error('Configurează SESSION_SECRET cu minimum 32 de caractere.');
  return value;
}
export function hashIdentifier(value: string) {
  return createHmac('sha256', sessionSecret()).update(value).digest('hex');
}
export function clientKey(request: Request) {
  // Never trust arbitrary X-Forwarded-For from the public Internet.
  const cfIp = request.headers.get('cf-connecting-ip') || '';
  const ip =
    process.env.TRUST_CF_HEADERS === 'true'
      ? isIP(cfIp)
        ? isIP(cfIp) === 6
          ? new URL(`http://[${cfIp}]`).hostname
          : cfIp
        : 'unknown'
      : 'shared-origin';
  return hashIdentifier(ip);
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === appUrl();
}
export function takeRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO rate_limits (key, count, expiresAt) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expiresAt <= ? THEN 1 ELSE count + 1 END,
    expiresAt = CASE WHEN expiresAt <= ? THEN excluded.expiresAt ELSE expiresAt END RETURNING count`,
    )
    .get(`${scope}:${key}`, now + windowMs, now, now) as { count: number };
  db.prepare('DELETE FROM rate_limits WHERE expiresAt < ?').run(now - 86400000);
  return result.count <= limit;
}
export async function readJson(request: Request, maxBytes = 20000): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new Error('Format JSON necesar.');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Cerere goală.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Cerere prea mare.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
