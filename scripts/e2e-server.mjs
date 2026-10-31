import https from 'node:https';
import http from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scryptSync } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'merita-e2e-'));
const salt = 'e'.repeat(32);
const env = {
  ...process.env,
  NODE_ENV: 'production',
  APP_URL: 'https://127.0.0.1:3102',
  HOSTNAME: '127.0.0.1',
  PORT: '3103',
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
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    `${dir}/key.pem`,
    '-out',
    `${dir}/cert.pem`,
    '-days',
    '1',
    '-subj',
    '/CN=127.0.0.1',
  ],
  { stdio: 'ignore' },
);
const proxy = https.createServer(
  { key: readFileSync(`${dir}/key.pem`), cert: readFileSync(`${dir}/cert.pem`) },
  (req, res) => {
    const upstream = http.request(
      {
        hostname: '127.0.0.1',
        port: 3103,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          'x-forwarded-proto': 'https',
          'x-forwarded-host': req.headers.host,
        },
      },
      (response) => {
        res.writeHead(response.statusCode || 502, response.headers);
        response.pipe(res);
      },
    );
    upstream.on('error', () => {
      res.writeHead(503);
      res.end();
    });
    req.pipe(upstream);
  },
);
proxy.listen(3102, '127.0.0.1');
const child = spawn(process.execPath, ['scripts/start.mjs'], { env, stdio: 'inherit' });
let stopping = false;
function stop() {
  if (!stopping) {
    stopping = true;
    proxy.close();
    child.kill('SIGTERM');
  }
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
child.on('exit', (code) => {
  rmSync(dir, { recursive: true, force: true });
  process.exit(code || 0);
});
