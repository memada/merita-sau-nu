import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { validateProductionConfig } from '../lib/productionConfig';
import { clientKey, hashIdentifier } from '../lib/security';
import { GET } from '../app/api/health/route';
import { POST } from '../app/api/leads/route';
import { getDb } from '../lib/db';
const dir = mkdtempSync(join(tmpdir(), 'merita-readiness-'));
const valid: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  APP_URL: 'https://merita.example',
  SESSION_SECRET: 's'.repeat(64),
  ADMIN_USERNAME: 'test-admin',
  ADMIN_PASSWORD_HASH: `scrypt:${'a'.repeat(32)}:${'b'.repeat(128)}`,
  OPERATOR_NAME: 'Test operator',
  OPERATOR_ADDRESS: 'Test address',
  PRIVACY_EMAIL: 'test@example.invalid',
  SUPPLIER_DISCLOSURE: 'Test recipients',
  TRUST_CF_HEADERS: 'true',
};
const saved = { ...process.env };
before(() => {
  Object.assign(process.env, valid, { DATABASE_URL: `file:${dir}/leads.sqlite` });
  execFileSync(process.execPath, ['scripts/migrate.mjs']);
});
after(() => {
  getDb().close();
  process.env = saved;
  rmSync(dir, { recursive: true, force: true });
});
test('all required fields fail closed, without including ENV values', () => {
  assert.equal(validateProductionConfig(valid).configured, true);
  for (const key of Object.keys(valid).filter((k) => k !== 'NODE_ENV')) {
    const config = validateProductionConfig({ ...valid, [key]: '' });
    assert.equal(config.configured, false, key);
    assert.ok(config.issues.includes(key));
    assert.ok(!JSON.stringify(config).includes(valid.SESSION_SECRET!));
  }
  for (const url of ['http://merita.example', 'garbage', 'https://a.example/?token=secret'])
    assert.ok(validateProductionConfig({ ...valid, APP_URL: url }).issues.includes('APP_URL'));
  assert.ok(
    validateProductionConfig({ ...valid, OPERATOR_NAME: '   ' }).issues.includes('OPERATOR_NAME'),
  );
  assert.ok(
    validateProductionConfig({ ...valid, PRIVACY_EMAIL: 'invalid' }).issues.includes(
      'PRIVACY_EMAIL',
    ),
  );
  assert.equal(validateProductionConfig({ NODE_ENV: 'development' }).configured, true);
});
test('health reports configuration and database status; no rows or secrets', async () => {
  assert.equal(GET().status, 200);
  process.env.TRUST_CF_HEADERS = 'false';
  const response = GET();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    configured: false,
    database: true,
    configurationIssues: ['TRUST_CF_HEADERS'],
  });
  process.env.TRUST_CF_HEADERS = 'true';
});
test('lead creation stays blocked when legal configuration is missing', async () => {
  process.env.OPERATOR_NAME = ' ';
  assert.equal(
    (await POST(new Request('https://merita.example/api/leads', { method: 'POST' }))).status,
    503,
  );
  process.env.OPERATOR_NAME = valid.OPERATOR_NAME;
});
test('CF addresses separate users, X-Forwarded-For is ignored, invalid CF values share fallback', () => {
  const req = (cf: string, xff = '203.0.113.10') =>
    new Request('https://merita.example', {
      headers: { 'cf-connecting-ip': cf, 'x-forwarded-for': xff },
    });
  assert.notEqual(clientKey(req('192.0.2.1')), clientKey(req('192.0.2.2')));
  assert.equal(clientKey(req('192.0.2.1', '1.1.1.1')), clientKey(req('192.0.2.1', '2.2.2.2')));
  assert.equal(clientKey(req('arbitrary')), hashIdentifier('unknown'));
  assert.equal(clientKey(req('2001:0db8::1')), clientKey(req('2001:db8::1')));
  process.env.TRUST_CF_HEADERS = 'false';
  assert.equal(clientKey(req('192.0.2.1')), clientKey(req('192.0.2.2')));
  process.env.TRUST_CF_HEADERS = 'true';
});
test('real process restart + repeated migrations retain leads; backup can restore a separate DB', () => {
  const env = { ...process.env, DATABASE_URL: `file:${dir}/restart.sqlite` };
  const run = (code: string) =>
    execFileSync(process.execPath, ['--import', 'tsx', '-e', code], { env, encoding: 'utf8' });
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { env });
  const id = run(
    `const {createLead}=require('./lib/leads.ts'); const {submission}=require('./tests/fixtures.ts'); console.log(createLead(submission()).id);`,
  ).trim();
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { env });
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { env });
  const result = JSON.parse(
    run(
      `const {getDb}=require('./lib/db.ts'); const {getLead}=require('./lib/leads.ts'); const db=getDb(); console.log(JSON.stringify({lead:getLead(${JSON.stringify(id)}), journal:db.prepare('PRAGMA journal_mode').get().journal_mode, timeout:db.prepare('PRAGMA busy_timeout').get().timeout, fk:db.prepare('PRAGMA foreign_keys').get().foreign_keys, migrations:db.prepare('SELECT count(*) n FROM schema_migrations').get().n}));`,
    ),
  );
  assert.equal(result.lead.phone, '+40700000000');
  assert.equal(result.journal, 'wal');
  assert.equal(result.timeout, 5000);
  assert.equal(result.fk, 1);
  assert.equal(
    result.migrations,
    readdirSync('db/migrations').filter((f) => f.endsWith('.sql')).length,
  );
  const output = execFileSync(process.execPath, ['scripts/backup.mjs', '--json'], {
    env: { ...env, BACKUP_DIR: join(dir, 'copies') },
    encoding: 'utf8',
  });
  const copy = new DatabaseSync(join(dir, 'copies', JSON.parse(output).filename), {
    readOnly: true,
  });
  try {
    assert.equal(copy.prepare('SELECT count(*) n FROM leads WHERE id = ?').get(id)?.n, 1);
    assert.equal(copy.prepare('PRAGMA integrity_check').get()?.integrity_check, 'ok');
  } finally {
    copy.close();
  }
});
