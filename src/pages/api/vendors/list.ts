import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async ({ url, locals }) => {
  const db = env.DB;
  const search = url.searchParams.get('q')?.trim() ?? '';
  const categoryFilter = url.searchParams.get('category') ?? '';
  const scope = url.searchParams.get('scope') ?? 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '40', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  const userAssocId = locals.associationId as string | undefined;

  let query = `
    SELECT v.id, v.name, v.logo_url, v.website, v.description, v.created_at,
      GROUP_CONCAT(DISTINCT c.name) as category_names,
      COALESCE(SUM(CASE WHEN r.rating = 'up' THEN 1 ELSE 0 END), 0) as thumbs_up,
      COALESCE(SUM(CASE WHEN r.rating = 'down' THEN 1 ELSE 0 END), 0) as thumbs_down,
      COALESCE(SUM(CASE WHEN r.rating = 'neutral' THEN 1 ELSE 0 END), 0) as neutral
    FROM vendors v
    LEFT JOIN vendor_categories vc ON vc.vendor_id = v.id
    LEFT JOIN categories c ON c.id = vc.category_id
    LEFT JOIN ratings r ON r.vendor_id = v.id
  `;

  const binds: string[] = [];
  let whereClause = '';

  if (scope !== 'all' && userAssocId) {
    whereClause += ` WHERE v.id IN (SELECT vendor_id FROM vendor_associations WHERE association_id = ? AND relationship_type = ?)`;
    binds.push(userAssocId, scope);
  }

  if (categoryFilter) {
    whereClause += whereClause ? ' AND' : ' WHERE';
    whereClause += ` v.id IN (SELECT vendor_id FROM vendor_categories WHERE category_id = ?)`;
    binds.push(categoryFilter);
  }

  if (search) {
    whereClause += whereClause ? ' AND' : ' WHERE';
    whereClause += ` (v.name LIKE ? OR v.description LIKE ?)`;
    binds.push(`%${search}%`, `%${search}%`);
  }

  query += whereClause;
  query += ` GROUP BY v.id ORDER BY v.name LIMIT ? OFFSET ?`;
  binds.push(String(limit), String(offset));

  const vendors = (await db.prepare(query).bind(...binds).all()).results;

  return new Response(JSON.stringify(vendors), {
    headers: { 'Content-Type': 'application/json' },
  });
};
