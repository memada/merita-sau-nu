import { NextResponse } from 'next/server';
import { leadSchema } from '../../../lib/validation';
import { createLead } from '../../../lib/leads';
import { clientKey, readJson, sameOrigin, takeRateLimit } from '../../../lib/security';
import { validateProductionConfig } from '../../../lib/productionConfig';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!validateProductionConfig().configured)
    return NextResponse.json(
      { error: 'Cererile de ofertă nu sunt încă disponibile. Revino în curând.' },
      { status: 503 },
    );
  if (!sameOrigin(request))
    return NextResponse.json({ error: 'Originea cererii nu este permisă.' }, { status: 403 });
  try {
    const key = clientKey(request);
    if (!takeRateLimit('lead', key, 5, 15 * 60 * 1000))
      return NextResponse.json(
        { error: 'Ai trimis prea multe cereri. Încearcă din nou peste 15 minute.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    let body;
    try {
      body = await readJson(request);
    } catch {
      return NextResponse.json({ error: 'Datele trimise nu sunt valide.' }, { status: 400 });
    }
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0].message, fields: parsed.error.flatten() },
        { status: 400 },
      );
    if (parsed.data.website)
      return NextResponse.json({ error: 'Cererea nu a putut fi validată.' }, { status: 400 });
    const lead = createLead(parsed.data, {
      ipHash: key,
      userAgent: request.headers.get('user-agent') || '',
    });
    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch {
    console.error('Lead submission failed (no personal data logged).');
    return NextResponse.json(
      { error: 'Cererea nu a putut fi salvată. Încearcă din nou.' },
      { status: 500 },
    );
  }
}
