import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '../../../../lib/auth';
import { sameOrigin } from '../../../../lib/security';
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: 'Cerere nepermisă.' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
