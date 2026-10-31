import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { trackEvent } from '../lib/analytics';

test('analytics strips arbitrary PII parameters, query/referrer, and requires consent outside admin', () => {
  const calls: unknown[][] = [];
  let consent = 'yes';
  const win = {
    location: {
      pathname: '/calculator-baterie',
      origin: 'https://merita.example',
      search: '?phone=private',
    },
    gtag: (...args: unknown[]) => calls.push(args),
  };
  Object.assign(globalThis, { window: win, localStorage: { getItem: () => consent } });
  try {
    trackEvent('calculator_step_completed', {
      step: 2,
      phone: 'private',
      email: 'private@example.invalid',
    });
    assert.deepEqual(calls[0], [
      'event',
      'calculator_step_completed',
      {
        step: 2,
        page_location: 'https://merita.example/calculator-baterie',
        page_referrer: '',
        page_title: 'Merită sau Nu',
      },
    ]);
    consent = 'no';
    trackEvent('lead_submitted');
    assert.equal(calls.length, 1);
    consent = 'yes';
    win.location.pathname = '/admin/leads/private-id';
    trackEvent('lead_submitted');
    assert.equal(calls.length, 1);
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('source packaging excludes ENV, real DB patterns, generated dirs and symlinks even if tracked', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merita-package-'));
  try {
    execFileSync('git', ['init', '-q', dir]);
    for (const name of [
      '.env',
      '.env.local',
      '.env.example',
      'sample.sqlite',
      'sample.sqlite-wal',
      'sample.sqlite-shm',
      '.DS_Store',
      'app.ts',
    ])
      writeFileSync(
        join(dir, name),
        name === 'app.ts' ? 'export const source = true;' : 'excluded',
      );
    for (const name of [
      'data',
      'backups',
      '.next',
      'node_modules',
      'playwright-report',
      'test-results',
      'artifacts',
    ]) {
      mkdirSync(join(dir, name));
      writeFileSync(join(dir, name, 'private.txt'), 'excluded');
    }
    symlinkSync('/etc/passwd', join(dir, 'symlink'));
    execFileSync('git', ['add', '-A'], { cwd: dir });
    const script = resolve('scripts/package.py');
    execFileSync('python3', [
      '-c',
      'import runpy,sys; runpy.run_path(sys.argv[1])["package"](sys.argv[2])',
      script,
      dir,
    ]);
    const list = execFileSync(
      'python3',
      [
        '-c',
        'import zipfile,sys,json; print(json.dumps(zipfile.ZipFile(sys.argv[1]).namelist()))',
        join(dir, 'dist/merita-sau-nu-source.zip'),
      ],
      { encoding: 'utf8' },
    );
    assert.deepEqual(JSON.parse(list), ['app.ts']);
    writeFileSync(join(dir, 'secret.txt'), '-----BEGIN OPENSSH PRIVATE KEY-----');
    execFileSync('git', ['add', 'secret.txt'], { cwd: dir });
    const result = spawnSync('python3', [
      '-c',
      'import runpy,sys; runpy.run_path(sys.argv[1])["package"](sys.argv[2])',
      script,
      dir,
    ]);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(dir, 'dist/merita-sau-nu-source.zip')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('daily backup uploads only generated copy; failed/missing upload skips retention and keeps copy', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merita-daily-'));
  try {
    const bin = join(dir, 'bin');
    mkdirSync(bin);
    const docker = `#!${process.execPath}
const fs=require('fs'); const args=process.argv.slice(2);
if(args.includes('--json')) console.log(JSON.stringify({filename:'leads-2026-10-31T00-00-00-000Z.sqlite'}));
else if(args.includes('cp')) fs.writeFileSync(args.at(-1),'backup-test-copy');
else if(args.includes('--prune-only')) fs.writeFileSync(process.env.MOCK_PRUNE,'yes');
else process.exit(2);
`;
    writeFileSync(join(bin, 'docker'), docker, { mode: 0o700 });
    writeFileSync(join(bin, 'flock'), '#!/bin/sh\nexit 0\n', { mode: 0o700 });
    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      APP_DIR: dir,
      BACKUP_EXPORT_DIR: join(dir, 'exports'),
      MOCK_PRUNE: join(dir, 'pruned'),
      BACKUP_UPLOAD_COMMAND: 'cp "$BACKUP_FILE" "$APP_DIR/uploaded.sqlite"',
    };
    const script = resolve('scripts/backup-production.sh');
    const run = (command: string) =>
      spawnSync('bash', [script], {
        env: { ...env, BACKUP_UPLOAD_COMMAND: command },
        encoding: 'utf8',
      });
    assert.equal(run(env.BACKUP_UPLOAD_COMMAND).status, 0);
    assert.equal(readFileSync(join(dir, 'uploaded.sqlite'), 'utf8'), 'backup-test-copy');
    assert.ok(existsSync(env.MOCK_PRUNE));
    rmSync(env.MOCK_PRUNE);
    assert.notEqual(run('echo secret-token; exit 1').status, 0);
    assert.ok(!run('echo secret-token; exit 1').stderr.includes('secret-token'));
    assert.equal(existsSync(env.MOCK_PRUNE), false);
    assert.notEqual(run('').status, 0);
    assert.ok(existsSync(join(dir, 'exports/leads-2026-10-31T00-00-00-000Z.sqlite')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
