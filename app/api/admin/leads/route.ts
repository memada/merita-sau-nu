import { adminSearch } from '../../../../lib/adminSearch';
import { NextResponse } from 'next/server';
import { currentAdmin } from '../../../../lib/auth';
import { filtersFrom, listLeads } from '../../../../lib/leads';
export async function GET(request: Request) {
  if (!(await currentAdmin()))
    return NextResponse.json({ error: 'Autentificare necesară.' }, { status: 401 });
  return NextResponse.json(
    listLeads({ ...filtersFrom(new URL(request.url).searchParams), q: await adminSearch() }),
  );
}
