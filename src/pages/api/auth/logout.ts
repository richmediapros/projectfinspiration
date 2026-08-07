import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getTokenFromRequest, deleteSession, clearSessionCookie } from '../../../lib/session';
import { logActivity } from '../../../lib/activity';

export const POST: APIRoute = async ({ request }) => {
  const db = env.DB;
  const token = getTokenFromRequest(request);

  if (token) {
    const cookie = request.headers.get('cookie') || '';
    const match = cookie.match(/fin_session=([^;]+)/);
    if (match) {
      try {
        const { email } = await db
          .prepare("SELECT email FROM sessions WHERE token = ? AND expires_at > datetime('now')")
          .bind(token)
          .first<{ email: string }>() ?? { email: '' };
        if (email) {
          await logActivity(db, request, 'logout', email);
        }
      } catch {}
    }
    await deleteSession(db, token);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': clearSessionCookie(),
    },
  });
};
