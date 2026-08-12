import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.userId) return new Response('Unauthorized', { status: 401 });

  const search = url.searchParams.get('q')?.trim() ?? '';
  const topic = url.searchParams.get('topic')?.trim() ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 40, 100);
  const offset = Number(url.searchParams.get('offset')) || 0;

  const db = env.DB;

  let query = `
    SELECT s.id, s.vendor_id, s.name, s.title, s.photo_url, s.topics, s.bio,
      v.name as vendor_name, v.logo_url as vendor_logo,
      COALESCE(SUM(CASE WHEN sr.rating = 'up' THEN 1 ELSE 0 END), 0) as thumbs_up,
      COALESCE(SUM(CASE WHEN sr.rating = 'down' THEN 1 ELSE 0 END), 0) as thumbs_down
    FROM speakers s
    JOIN vendors v ON v.id = s.vendor_id
    LEFT JOIN speaker_ratings sr ON sr.speaker_id = s.id
  `;

  const binds: string[] = [];
  let whereClause = ' WHERE s.active = 1';

  if (search) {
    whereClause += ` AND (s.name LIKE ? OR s.bio LIKE ? OR s.topics LIKE ? OR s.title LIKE ?)`;
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (topic) {
    whereClause += ` AND (',' || s.topics || ',' LIKE ?)`;
    binds.push(`%,${topic},%`);
  }

  query += whereClause;
  query += ` GROUP BY s.id ORDER BY s.name LIMIT ? OFFSET ?`;
  binds.push(String(limit), String(offset));

  const speakers = (await db.prepare(query).bind(...binds).all()).results;

  return new Response(JSON.stringify(speakers), {
    headers: { 'Content-Type': 'application/json' },
  });
};
