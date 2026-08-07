import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = locals.userId;
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const rating = String(form.get('rating') ?? '');

  if (!['up', 'down', 'neutral'].includes(rating)) {
    return new Response('Invalid rating', { status: 400 });
  }

  const db = env.DB;
  const vendorId = params.id!;

  const existing = await db
    .prepare('SELECT rating FROM ratings WHERE user_id = ? AND vendor_id = ?')
    .bind(userId, vendorId)
    .first<{ rating: string }>();

  if (existing && existing.rating === rating) {
    await db
      .prepare('DELETE FROM ratings WHERE user_id = ? AND vendor_id = ?')
      .bind(userId, vendorId)
      .run();
  } else if (existing) {
    await db
      .prepare("UPDATE ratings SET rating = ?, updated_at = datetime('now') WHERE user_id = ? AND vendor_id = ?")
      .bind(rating, userId, vendorId)
      .run();
  } else {
    await db
      .prepare('INSERT INTO ratings (user_id, vendor_id, rating) VALUES (?, ?, ?)')
      .bind(userId, vendorId, rating)
      .run();
  }

  const referer = request.headers.get('referer') || `/vendors/${vendorId}`;
  return new Response(null, { status: 302, headers: { Location: referer } });
};
