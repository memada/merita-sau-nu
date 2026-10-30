import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  signSession,
  verifyCredentials,
  sessionCookieOptions,
} from '../../../../lib/auth';
import { clientKey, readJson, sameOrigin, takeRateLimit } from '../../../../lib/security';
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: 'Cerere nepermisă.' }, { status: 403 });
  try {
    if (!takeRateLimit('login', clientKey(request), 10, 15 * 60 * 1000))
      return NextResponse.json(
        { error: 'Prea multe încercări. Revino peste 15 minute.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    const body = (await readJson(request, 2000)) as Record<string, unknown>;
    if (
      typeof body.username !== 'string' ||
      typeof body.password !== 'string' ||
      body.password.length > 200 ||
      !verifyCredentials(body.username, body.password)
    )
      return NextResponse.json({ error: 'Date de autentificare incorecte.' }, { status: 401 });
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, signSession(body.username), sessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Autentificarea nu este disponibilă. Verifică setările serverului.' },
      { status: 503 },
    );
  }
}
