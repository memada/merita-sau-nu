import { NextResponse } from 'next/server';
import { currentAdmin } from '../../../../../lib/auth';
import { getLead, statusHistory, updateLead } from '../../../../../lib/leads';
import { adminUpdateSchema } from '../../../../../lib/validation';
import { readJson, sameOrigin } from '../../../../../lib/security';
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  if (!(await currentAdmin()))
    return NextResponse.json({ error: 'Autentificare necesară.' }, { status: 401 });
  const { id } = await context.params;
  const lead = getLead(id);
  return lead
    ? NextResponse.json({ lead, history: statusHistory(id) })
    : NextResponse.json({ error: 'Cererea nu există.' }, { status: 404 });
}
export async function PATCH(request: Request, context: Context) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: 'Autentificare necesară.' }, { status: 401 });
  if (!sameOrigin(request))
    return NextResponse.json({ error: 'Cerere nepermisă.' }, { status: 403 });
  let body;
  try {
    body = await readJson(request, 45000);
  } catch {
    return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
  }
  const data = adminUpdateSchema.safeParse(body);
  if (!data.success)
    return NextResponse.json({ error: 'Status sau note invalide.' }, { status: 400 });
  const lead = updateLead(
    (await context.params).id,
    data.data.status,
    data.data.internalNotes,
    admin,
  );
  return lead
    ? NextResponse.json({ lead })
    : NextResponse.json({ error: 'Cererea nu există.' }, { status: 404 });
}
