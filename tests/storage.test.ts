import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  createLead,
  deleteLead,
  findDuplicate,
  getLead,
  listLeads,
  updateLead,
  statusHistory,
  exportLeadsCsv,
  csvCell,
} from '../lib/leads';
import { takeRateLimit, sameOrigin } from '../lib/security';
import { getDb } from '../lib/db';
import { submission } from './fixtures';
const dir = mkdtempSync(join(tmpdir(), 'merita-test-'));
before(() => {
  process.env.DATABASE_URL = `file:${dir}/test.sqlite`;
  process.env.SESSION_SECRET = 't'.repeat(64);
  process.env.APP_URL = 'http://localhost:3002';
  execFileSync(process.execPath, ['scripts/migrate.mjs'], { env: process.env });
});
after(() => {
  getDb().close();
  rmSync(dir, { recursive: true, force: true });
});
test('persists full lead, consent, attribution, calculator, score', () => {
  const lead = createLead(submission());
  const stored = getLead(lead.id)!;
  assert.equal(stored.status, 'NEW');
  assert.equal(stored.consentGiven, true);
  assert.ok(stored.consentText.includes('maximum 3'));
  assert.ok(stored.consentTimestamp);
  assert.ok(stored.privacyPolicyVersion);
  assert.equal(stored.utmSource, 'test');
  assert.equal(stored.leadScore, 100);
  assert.equal(stored.calculatorInput.monthlyConsumptionKwh, 500);
  assert.equal(stored.calculatorResult.recommendationLabel, '5–10 kWh');
  assert.equal(stored.phone, '+40700000000');
});
test('duplicate within 30 days is retained and linked, older request excluded', () => {
  const now = new Date('2026-10-30T12:00:00Z');
  const first = createLead(submission('0700000001'), {}, new Date(now.getTime() - 29 * 86400000));
  const second = createLead(submission('0700000001'), {}, now);
  assert.equal(second.possibleDuplicate, true);
  assert.equal(second.duplicateOfLeadId, first.id);
  assert.ok(getLead(first.id));
  assert.ok(getLead(second.id));
  createLead(submission('0700000002'), {}, new Date(now.getTime() - 31 * 86400000));
  assert.equal(findDuplicate('+40700000002', now), undefined);
});
test('filters and CSV use same scope; status history and internal notes persist', () => {
  const created = createLead(submission('0700000003'));
  updateLead(created.id, 'VERIFIED', 'Verificat telefonic', 'test-admin');
  const stored = getLead(created.id)!;
  assert.equal(stored.verificationStatus, 'VERIFIED');
  assert.equal(stored.internalNotes, 'Verificat telefonic');
  assert.equal(statusHistory(created.id)[0].newStatus, 'VERIFIED');
  const list = listLeads({
    status: 'VERIFIED',
    county: 'Cluj',
    category: 'HOT',
    timeline: 'asap',
    q: '0700000003',
  });
  assert.equal(list.total, 1);
  const exported = listLeads({ status: 'VERIFIED' }, true);
  assert.equal(exported.total, 1);
  const csv = exportLeadsCsv(exported.leads);
  assert.ok(csv.includes(created.id));
  assert.ok(csv.includes('Versiune politică'));
  assert.ok(csv.includes("'+40700000003"));
  assert.ok(csvCell('=1+1').startsWith(`"'=`));
  assert.equal(listLeads({ q: '% OR 1=1' }).total, 0);
});
test('pagination returns 20 per page and total remains accurate', () => {
  for (let i = 10; i < 32; i++) createLead(submission(`07000000${i}`));
  const result = listLeads({ page: '1' });
  assert.equal(result.leads.length, 20);
  assert.ok(result.pages >= 2);
  assert.ok(listLeads({ page: '2' }).leads.length > 0);
});
test('rate limit survives repeated requests and resets at expiry', () => {
  assert.equal(takeRateLimit('test', 'ip', 2, 1000, 100), true);
  assert.equal(takeRateLimit('test', 'ip', 2, 1000, 101), true);
  assert.equal(takeRateLimit('test', 'ip', 2, 1000, 102), false);
  assert.equal(takeRateLimit('test', 'ip', 2, 1000, 1100), true);
});
test('Origin check rejects missing and foreign origins', () => {
  assert.equal(
    sameOrigin(
      new Request('http://localhost:3002', { headers: { Origin: 'https://evil.example' } }),
    ),
    false,
  );
  assert.equal(sameOrigin(new Request('http://localhost:3002')), false);
  assert.equal(
    sameOrigin(
      new Request('http://localhost:3002', { headers: { Origin: 'http://localhost:3002' } }),
    ),
    true,
  );
});

test('Romanian date filters respect the 25-hour DST transition and malformed dates', () => {
  const phone = '0700000042';
  const a = createLead(submission(phone), {}, new Date('2026-10-24T21:15:00Z'));
  const b = createLead(submission(phone), {}, new Date('2026-10-25T21:45:00Z'));
  const c = createLead(submission(phone), {}, new Date('2026-10-25T22:15:00Z'));
  const rows = listLeads({ from: '2026-10-25', to: '2026-10-25', q: phone }, true).leads;
  assert.deepEqual(new Set(rows.map((l) => l.id)), new Set([a.id, b.id]));
  assert.equal(
    rows.some((l) => l.id === c.id),
    false,
  );
  assert.doesNotThrow(() => listLeads({ from: '2026-99-99' }));
});

test('failed createLead rolls back the transaction and a later valid lead still saves', () => {
  const count = () => getDb().prepare('SELECT count(*) n FROM leads').get()!.n;
  const before = count();
  const invalid = submission();
  invalid.contact.city = null as unknown as string;
  assert.throws(() => createLead(invalid));
  assert.equal(count(), before);
  assert.ok(getLead(createLead(submission('0700000099')).id));
});

test('delete removes only selected lead and history, unlinks duplicates, and is idempotent', () => {
  const parent = createLead(submission('0700000098'));
  const duplicate = createLead(submission('0700000098'));
  updateLead(parent.id, 'VERIFIED', 'Test-only history', 'test-admin');
  assert.equal(statusHistory(parent.id).length, 1);
  assert.equal(getLead(duplicate.id)!.duplicateOfLeadId, parent.id);
  assert.equal(deleteLead(parent.id), true);
  assert.equal(getLead(parent.id), null);
  assert.equal(statusHistory(parent.id).length, 0);
  assert.ok(getLead(duplicate.id));
  assert.equal(getLead(duplicate.id)!.duplicateOfLeadId, null);
  assert.equal(deleteLead(parent.id), false);
  assert.equal(deleteLead("' OR 1=1 --"), false);
  assert.ok(getLead(duplicate.id));
});
