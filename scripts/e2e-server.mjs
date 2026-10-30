import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'merita-e2e-'));
const salt = 'e'.repeat(32);
const env = {
  ...process.env,
  NODE_ENV: 'production',
  APP_URL: 'http://127.0.0.1:3102',
  HOSTNAME: '127.0.0.1',
  PORT: '3102',
  DATABASE_URL: `file:${dir}/leads.sqlite`,
  ADMIN_USERNAME: 'e2e-admin',
  ADMIN_PASSWORD_HASH: `scrypt:${salt}:${scryptSync('e2e-password-local-only', salt, 64).toString('hex')}`,
  SESSION_SECRET: 'e2e-only-'.repeat(8),
  TRUST_CF_HEADERS: 'true',
  OPERATOR_NAME: 'DEMO test operator',
  OPERATOR_ADDRESS: 'DEMO test address',
  PRIVACY_EMAIL: 'demo@example.invalid',
  SUPPLIER_DISCLOSURE: 'Furnizori fictivi exclusiv pentru test. Fără transmitere.',
};
execFileSync(process.execPath, ['scripts/migrate.mjs'], { env });
const child = spawn(process.execPath, ['scripts/start.mjs'], { env, stdio: 'inherit' });
let stopping = false;
function stop() {
  if (!stopping) {
    stopping = true;
    child.kill('SIGTERM');
  }
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code || 0);
});
