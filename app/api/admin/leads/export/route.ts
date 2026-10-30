import { currentAdmin } from '../../../../../lib/auth';
import { filtersFrom, listLeads, exportLeadsCsv } from '../../../../../lib/leads';
export async function GET(request: Request) {
  if (!(await currentAdmin()))
    return Response.json({ error: 'Autentificare necesară.' }, { status: 401 });
  const { leads } = listLeads(filtersFrom(new URL(request.url).searchParams), true);
  return new Response(exportLeadsCsv(leads), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="merita-sau-nu-leads.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
}
