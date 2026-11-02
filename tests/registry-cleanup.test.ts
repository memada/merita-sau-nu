import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const keep = `sha256:${'a'.repeat(64)}`;
const old = `sha256:${'b'.repeat(64)}`;
const obsolete = `sha256:${'d'.repeat(64)}`;
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
  const listCountFile=dir+'/list-count';
  const listCount=fs.existsSync(listCountFile)?Number(fs.readFileSync(listCountFile,'utf8'))+1:1;
  fs.writeFileSync(listCountFile,String(listCount));
  const stale=mode==='never-converges'||(mode==='stale-list' && listCount===2)||(mode==='slow-list' && listCount<=9);
  console.log(JSON.stringify([{digest: mode === 'raw' ? keep.slice(7) : keep}, {digest: mode === 'raw' ? old.slice(7) : old}, ...(['index','nested','child-error','referenced'].includes(mode) ? [{digest:'sha256:'+'c'.repeat(64)}, {digest:'sha256:'+'d'.repeat(64)}] : []), ...(mode === 'invalid' ? [{digest:'invalid'}] : [])].filter(item => mode !== 'referenced' || item.digest !== 'sha256:'+'c'.repeat(64)).filter(item => stale || !fs.existsSync(dir + '/deleted') || !fs.readFileSync(dir + '/deleted','utf8').includes(item.digest))));
} else if (args[2] === 'delete-manifest') {
  const parent='sha256:'+'d'.repeat(64);
  const removed=fs.existsSync(dir+'/deleted') ? fs.readFileSync(dir+'/deleted','utf8') : '';
  if(mode==='delete-error'){console.error('403 Forbidden');process.exit(1);}
  if(mode==='blocked' || (mode==='referenced' && args[4]===old && !removed.includes(parent))){
    console.error('412 manifest is referenced by one or more other manifests');process.exit(1);
  }
  fs.appendFileSync(dir + '/deleted', args[4] + '\n');
} else process.exit(97);
`;
const dockerMock = String.raw`#!/usr/bin/env node
const args=process.argv.slice(2), mode=process.env.CLEANUP_TEST_MODE;
if(args.slice(0,4).join(' ')!=='buildx imagetools inspect --raw')process.exit(99);
if(mode==='inspect-error')process.exit(1);
const digest=args[4].split('@')[1];
const indexModes=['index','nested','child-error'];
const root='sha256:'+'a'.repeat(64), child='sha256:'+'b'.repeat(64), leaf='sha256:'+'c'.repeat(64);
if(mode==='child-error' && digest===child)process.exit(1);
if(indexModes.includes(mode) && digest===root)console.log(JSON.stringify({mediaType:'application/vnd.oci.image.index.v1+json',schemaVersion:2,manifests:[{digest:child},{digest:leaf}]}));
else if(mode==='nested' && digest===child)console.log(JSON.stringify({mediaType:'application/vnd.docker.distribution.manifest.list.v2+json',schemaVersion:2,manifests:[{digest:leaf}]}));
else console.log(JSON.stringify({mediaType:'application/vnd.oci.image.manifest.v1+json',schemaVersion:2,config:{digest:'sha256:'+'f'.repeat(64)},layers:[]}));
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
  'index',
  'nested',
  'inspect-error',
  'child-error',
  'referenced',
  'blocked',
  'delete-error',
  'stale-list',
  'never-converges',
  'slow-list',
  'invalid-attempts',
  'invalid-delay',
]) {
  test(`registry cleanup: ${mode}`, () => {
    const dir = mkdtempSync(join(tmpdir(), 'merita-cleanup-'));
    try {
      writeFileSync(join(dir, 'doctl'), mock, { mode: 0o700 });
      writeFileSync(join(dir, 'docker'), dockerMock, { mode: 0o700 });
      const result = spawnSync('bash', [resolve('deploy/cleanup-registry.sh')], {
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          PATH: `${dir}:${process.env.PATH}`,
          CLEANUP_TEST_MODE: mode,
          REGISTRY_VERIFY_DELAY_SECONDS: mode === 'invalid-delay' ? '31' : '0',
          REGISTRY_VERIFY_ATTEMPTS: mode === 'invalid-attempts' ? '0' : '12',
          CLEANUP_TEST_DIR: dir,
          DOCR_IMAGE: `registry.digitalocean.com/test-registry/${mode === 'wrong-repository' ? 'custraini-frontend' : 'merita-sau-nu'}`,
        },
      });
      const deletes = existsSync(join(dir, 'deleted'))
        ? readFileSync(join(dir, 'deleted'), 'utf8').trim().split('\n')
        : [];
      if (mode === 'normal' || mode === 'raw' || mode === 'stale-list' || mode === 'slow-list') {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(deletes, [old]);
        assert.ok(result.stdout.includes(keep));
        if (mode === 'slow-list')
          assert.ok(Number(readFileSync(join(dir, 'list-count'), 'utf8')) > 7);
      } else if (mode === 'index' || mode === 'nested') {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(deletes, [obsolete]);
      } else if (mode === 'referenced') {
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(deletes, [obsolete, old]);
        assert.match(result.stdout, /Cleanup verified: 1 current manifest/);
      } else if (mode === 'never-converges') {
        assert.notEqual(result.status, 0);
        assert.deepEqual(deletes, [old]);
        assert.match(result.stderr, /did not converge/);
      } else {
        assert.notEqual(result.status, 0);
        assert.deepEqual(deletes, []);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
