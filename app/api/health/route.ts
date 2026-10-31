import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { validateProductionConfig } from '../../../lib/productionConfig';
export const dynamic = 'force-dynamic';
export function GET() {
  const config = validateProductionConfig();
  let database = false;
  try {
    getDb().prepare('SELECT 1 FROM leads LIMIT 1').get();
    database = true;
  } catch {
    /* No SQL errors, rows, paths or credentials in the public response. */
  }
  const ok = database && config.configured;
  return NextResponse.json(
    { ok, configured: config.configured, database, configurationIssues: config.issues },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
