import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../../lib/auth';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!isAdmin(locals)) return new Response('Forbidden', { status: 403 });

  const db = env.DB;
  const { id } = params;

  const suggestion = await db
    .prepare('SELECT id FROM suggestions WHERE id = ? AND status = ?')
    .bind(id, 'pending')
    .first();

  if (!suggestion) return new Response('Not found', { status: 404 });

  await db
    .prepare("UPDATE suggestions SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
    .bind(locals.userId, id)
    .run();

  let redirect = '/admin/suggestions';
  const ref = request.headers.get('referer');
  if (ref) try { redirect = new URL(ref).pathname; } catch {}
  return new Response(null, { status: 302, headers: { Location: redirect } });
};
