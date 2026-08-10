import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = locals.userId;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const content = String(form.get('content') ?? '').trim();

  if (!content) {
    return new Response('Note content is required', { status: 400 });
  }

  const db = env.DB;
  const vendorId = params.id!;
  const id = crypto.randomUUID();

  await db
    .prepare('INSERT INTO notes (id, vendor_id, user_id, content) VALUES (?, ?, ?, ?)')
    .bind(id, vendorId, userId, content)
    .run();

  let redirect = `/vendors/${vendorId}`;
  const ref = request.headers.get('referer');
  if (ref) try { redirect = new URL(ref).pathname; } catch {}
  return new Response(null, { status: 302, headers: { Location: redirect } });
};
