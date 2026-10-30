import { randomUUID } from 'node:crypto';
import type { SQLInputValue } from 'node:sqlite';
import { getDb } from './db';
import { calculateBattery } from './batteryCalculator';
import { scoreLead } from './leadScoring';
import { CONSENT_TEXT, PRIVACY_POLICY_VERSION } from './privacy';
import type { LeadSubmission, CalculatorInput } from './validation';
import { statusLabels, type LeadStatus } from './options';
export type Lead = ReturnType<typeof buildLead>;
export function buildLead(
  submission: LeadSubmission,
  meta: { ipHash?: string; userAgent?: string } = {},
  now = new Date(),
) {
  const { calculator, contact, attribution } = submission;
  const result = calculateBattery(calculator);
  return {
    id: randomUUID(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: 'NEW' as LeadStatus,
    ...attribution,
    ...contact,
    ...calculator,
    pvPowerKw: calculator.hasSolar === 'yes' ? (calculator.pvPowerKw ?? null) : null,
    ...result,
    calculatorInput: calculator,
    calculatorResult: result,
    ...scoreLead({ ...calculator, ...contact, phoneValid: true, calculatorCompleted: true }),
    consentText: CONSENT_TEXT,
    consentTimestamp: now.toISOString(),
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    internalNotes: '',
    verificationStatus: 'PENDING',
    possibleDuplicate: false,
    duplicateOfLeadId: null as string | null,
    ipHash: meta.ipHash ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? '',
  };
}
export function findDuplicate(phone: string, now = new Date()): { id: string } | undefined {
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString();
  return getDb()
    .prepare(
      'SELECT id FROM leads WHERE phone = ? AND createdAt >= ? AND createdAt <= ? ORDER BY createdAt DESC, rowid DESC LIMIT 1',
    )
    .get(phone, cutoff, now.toISOString()) as { id: string } | undefined;
}
const omitted = new Set(['warnings', 'nightConsumptionEstimated']);
export function createLead(
  submission: LeadSubmission,
  meta: { ipHash?: string; userAgent?: string } = {},
  now = new Date(),
) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const lead = buildLead(submission, meta, now);
    const duplicate = findDuplicate(lead.phone, now);
    lead.possibleDuplicate = !!duplicate;
    lead.duplicateOfLeadId = duplicate?.id ?? null;
    const entries = Object.entries(lead).filter(([key]) => !omitted.has(key));
    const values = entries.map(
      ([, value]): SQLInputValue =>
        value == null
          ? null
          : typeof value === 'object'
            ? JSON.stringify(value)
            : typeof value === 'boolean'
              ? Number(value)
              : value,
    );
    db.prepare(
      `INSERT INTO leads (${entries.map(([key]) => key).join(',')}) VALUES (${entries.map(() => '?').join(',')})`,
    ).run(...values);
    db.exec('COMMIT');
    return lead;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
function decode(row: Record<string, unknown>): Lead {
  return {
    ...row,
    homeOwner: !!row.homeOwner,
    consentGiven: !!row.consentGiven,
    possibleDuplicate: !!row.possibleDuplicate,
    backupLoads: JSON.parse(row.backupLoads as string),
    calculatorInput: JSON.parse(row.calculatorInput as string),
    calculatorResult: JSON.parse(row.calculatorResult as string),
  } as Lead;
}
export function getLead(id: string) {
  const row = getDb().prepare('SELECT * FROM leads WHERE id = ?').get(id);
  return row ? decode(row) : null;
}
export type LeadFilters = {
  status?: string;
  county?: string;
  category?: string;
  from?: string;
  to?: string;
  timeline?: string;
  q?: string;
  page?: string;
};
export function filtersFrom(params: URLSearchParams): LeadFilters {
  return Object.fromEntries(
    ['status', 'county', 'category', 'from', 'to', 'timeline', 'q', 'page'].map((key) => [
      key,
      params.get(key)?.slice(0, 200) || '',
    ]),
  );
}
export function listLeads(filters: LeadFilters = {}, exportAll = false) {
  const where: string[] = [];
  const values: SQLInputValue[] = [];
  for (const [column, value] of [
    ['status', filters.status],
    ['county', filters.county],
    ['leadCategory', filters.category],
    ['purchaseTimeline', filters.timeline],
  ]) {
    if (value) {
      where.push(`${column} = ?`);
      values.push(value);
    }
  }
  // Date filters represent calendar dates in Romania; SQLite stores UTC timestamps.
  for (const [value, operator, end] of [
    [filters.from, '>=', false],
    [filters.to, '<', true],
  ] as const) {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const boundary = new Date(`${value}T00:00:00Z`);
      if (!Number.isFinite(boundary.getTime()) || boundary.toISOString().slice(0, 10) !== value)
        continue;
      if (end) boundary.setUTCDate(boundary.getUTCDate() + 1);
      // Resolve each boundary independently, including 23/25-hour DST days.
      const offset = new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/Bucharest',
        timeZoneName: 'shortOffset',
      })
        .formatToParts(new Date(boundary.getTime() - 3 * 3600000))
        .find((part) => part.type === 'timeZoneName')?.value;
      const hours = Number(offset?.replace('GMT', '') || 2);
      boundary.setUTCHours(boundary.getUTCHours() - hours);
      if (Number.isFinite(boundary.getTime())) {
        where.push(`createdAt ${operator} ?`);
        values.push(boundary.toISOString());
      }
    }
  }
  if (filters.q) {
    where.push(`(name LIKE ? ESCAPE '!' OR phone LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!')`);
    const q = `%${filters.q.replace(/[!%_]/g, (c) => `!${c}`)}%`;
    values.push(q, q, q);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (
    getDb()
      .prepare(`SELECT COUNT(*) AS count FROM leads ${sqlWhere}`)
      .get(...values) as { count: number }
  ).count;
  const pages = Math.max(1, Math.ceil(total / 20));
  const page = Math.max(1, Math.min(pages, Math.floor(Number(filters.page) || 1)));
  const rows = getDb()
    .prepare(
      `SELECT * FROM leads ${sqlWhere} ORDER BY createdAt DESC, rowid DESC ${exportAll ? '' : 'LIMIT 20 OFFSET ?'}`,
    )
    .all(...values, ...(exportAll ? [] : [(page - 1) * 20]));
  return { leads: rows.map(decode), total, page, pages };
}
export function updateLead(
  id: string,
  status: LeadStatus,
  internalNotes: string,
  changedBy: string,
) {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const old = getLead(id);
    if (!old) {
      db.exec('ROLLBACK');
      return null;
    }
    const time = new Date().toISOString();
    const verificationStatus =
      status === 'INVALID'
        ? 'INVALID'
        : ['VERIFIED', 'SENT_TO_SUPPLIERS', 'CONTACTED', 'QUOTE_RECEIVED', 'WON', 'LOST'].includes(
              status,
            )
          ? 'VERIFIED'
          : 'PENDING';
    db.prepare(
      'UPDATE leads SET status = ?, internalNotes = ?, verificationStatus = ?, updatedAt = ? WHERE id = ?',
    ).run(status, internalNotes, verificationStatus, time, id);
    if (old.status !== status)
      db.prepare(
        'INSERT INTO lead_status_history (leadId, oldStatus, newStatus, changedAt, changedBy) VALUES (?, ?, ?, ?, ?)',
      ).run(id, old.status, status, time, changedBy);
    db.exec('COMMIT');
    return getLead(id);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function statusHistory(id: string) {
  return getDb()
    .prepare('SELECT * FROM lead_status_history WHERE leadId = ? ORDER BY changedAt DESC, id DESC')
    .all(id) as {
    id: number;
    oldStatus: LeadStatus;
    newStatus: LeadStatus;
    changedAt: string;
    changedBy: string;
  }[];
}
export function dashboardStats() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const today = listLeads({ from: date, to: date }).total;
  const seven = new Date(Date.now() - 7 * 86400000).toISOString();
  const db = getDb();
  const count = (sql: string, ...args: SQLInputValue[]) =>
    (db.prepare(sql).get(...args) as { n: number }).n;
  return {
    today,
    week: count('SELECT COUNT(*) n FROM leads WHERE createdAt >= ?', seven),
    total: count('SELECT COUNT(*) n FROM leads'),
    verified: count("SELECT COUNT(*) n FROM leads WHERE verificationStatus = 'VERIFIED'"),
    hot: count("SELECT COUNT(*) n FROM leads WHERE leadCategory = 'HOT'"),
  };
}
export function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function exportLeadsCsv(leads: Lead[]) {
  const header = [
    'ID',
    'Data',
    'Nume',
    'Telefon',
    'Email',
    'Județ',
    'Localitate',
    'PV kW',
    'Consum lunar kWh',
    'Estimare baterie',
    'Buget',
    'Termen',
    'Score',
    'Categorie',
    'Status',
    'Posibil duplicat',
    'Note interne',
    'Acord',
    'Versiune politică',
  ];
  return (
    '\uFEFF' +
    [
      header,
      ...leads.map((l) => [
        l.id,
        l.createdAt,
        l.name,
        l.phone,
        l.email,
        l.county,
        l.city,
        l.pvPowerKw,
        l.monthlyConsumptionKwh,
        l.recommendationLabel,
        l.budgetRange,
        l.purchaseTimeline,
        l.leadScore,
        l.leadCategory,
        statusLabels[l.status],
        l.possibleDuplicate ? 'Da' : 'Nu',
        l.internalNotes,
        l.consentTimestamp,
        l.privacyPolicyVersion,
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
