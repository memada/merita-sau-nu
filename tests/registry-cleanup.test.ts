import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const keep = `sha256:${'a'.repeat(64)}`;
const old = `sha256:${'b'.repeat(64)}`;
const mock = String.raw`#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2), mode = process.env.CLEANUP_TEST_MODE;
const dir = process.env.CLEANUP_TEST_DIR;
if (args[0] !== 'registry' || args[1] !== 'repository' || args[3] !== 'merita-sau-nu' || args[args.indexOf('--registry') + 1] !== 'test-registry') process.exit(99);
const keep = 'sha256:' + 'a'.repeat(64), old = 'sha256:' + 'b'.repeat(64);
if (args[2] === 'list-tags') {
  if (mode === 'api-error') process.exit(23);
  if (args[args.indexOf('--output') + 1] !== 'json') process.exit(98);
  const countFile = dir + '/count';
  const count = fs.existsSync(countFile) ? Number(fs.readFileSync(countFile, 'utf8')) + 1 : 1;
  fs.writeFileSync(countFile, String(count));
  let digest = mode === 'raw' ? keep.slice(7) : mode === 'moved' && count > 1 ? old : keep;
  let tags = [{compressed_size_bytes:123,tag:'latest',updated_at:'2026-10-30',manifest_digest:digest}];
  if (mode === 'missing') tags = [];
  if (mode === 'duplicate') tags.push(tags[0]);
  console.log(JSON.stringify(tags));
} else if (args[2] === 'list-manifests') {
  console.log(JSON.stringify([{digest: mode === 'raw' ? keep.slice(7) : keep}, {digest: mode === 'raw' ? old.slice(7) : old}, ...(mode === 'invalid' ? [{digest:'invalid'}] : [])]));
} else if (args[2] === 'delete-manifest') {
  fs.appendFileSync(dir + '/deleted', args[4] + '\n');
} else process.exit(97);
`;
for (const mode of [
  'normal',
  'raw',
  'missing',
  'duplicate',
  'invalid',
  'moved',
  'api-error',
  'wrong-repository',
]) {
  test(`registry cleanup: ${mode}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'merita-cleanup-'));
    try {
      writeFileSync(join(dir, 'doctl'), mock, { mode: 0o700 });
      const result = spawnSync('bash', [resolve('deploy/cleanup-registry.sh')], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          CLEANUP_TEST_MODE: mode,
          CLEANUP_TEST_DIR: dir,
          DOCR_IMAGE: `registry.digitalocean.com/test-registry/${mode === 'wrong-repository' ? 'custraini-frontend' : 'merita-sau-nu'}`,
        },
      });
      const deletes = existsSync(join(dir, 'deleted'))
        ? readFileSync(join(dir, 'deleted'), 'utf8').trim().split('\n')
        : [];
      if (mode === 'normal' || mode === 'raw') {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(deletes, [old]);
        assert.ok(result.stdout.includes(keep));
      } else {
        assert.notEqual(result.status, 0);
        assert.deepEqual(deletes, []);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
