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
  const speakerId = params.speakerId!;

  const existing = await db
    .prepare('SELECT rating FROM speaker_ratings WHERE user_id = ? AND speaker_id = ?')
    .bind(userId, speakerId)
    .first<{ rating: string }>();

  if (existing && existing.rating === rating) {
    await db
      .prepare('DELETE FROM speaker_ratings WHERE user_id = ? AND speaker_id = ?')
      .bind(userId, speakerId)
      .run();
  } else if (existing) {
    await db
      .prepare("UPDATE speaker_ratings SET rating = ?, updated_at = datetime('now') WHERE user_id = ? AND speaker_id = ?")
      .bind(rating, userId, speakerId)
      .run();
  } else {
    await db
      .prepare('INSERT INTO speaker_ratings (user_id, speaker_id, rating) VALUES (?, ?, ?)')
      .bind(userId, speakerId, rating)
      .run();
  }

  let redirect = '/vendors';
  const ref = request.headers.get('referer');
  if (ref) try { redirect = new URL(ref).pathname; } catch {}
  return new Response(null, { status: 302, headers: { Location: redirect } });
};
