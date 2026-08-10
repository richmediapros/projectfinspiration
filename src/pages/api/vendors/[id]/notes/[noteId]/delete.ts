import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = locals.userId;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const db = env.DB;
  const { id: vendorId, noteId } = params;

  const note = await db
    .prepare('SELECT user_id FROM notes WHERE id = ? AND vendor_id = ?')
    .bind(noteId, vendorId)
    .first<{ user_id: string }>();

  if (!note) return new Response('Not found', { status: 404 });
  if (note.user_id !== userId) return new Response('Forbidden', { status: 403 });

  await db.prepare('DELETE FROM notes WHERE id = ?').bind(noteId).run();

  let redirect = `/vendors/${vendorId}`;
  const ref = request.headers.get('referer');
  if (ref) try { redirect = new URL(ref).pathname; } catch {}
  return new Response(null, { status: 302, headers: { Location: redirect } });
};
