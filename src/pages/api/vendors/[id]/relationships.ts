import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  const userId = locals.userId;
  const associationId = locals.associationId;
  if (!userId || !associationId) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const relationshipType = String(form.get('relationship_type') ?? '');
  const action = String(form.get('action') ?? 'toggle');

  if (!['member', 'endorsed'].includes(relationshipType)) {
    return new Response('Invalid relationship type', { status: 400 });
  }

  const db = env.DB;
  const vendorId = params.id!;

  const existing = await db
    .prepare('SELECT id FROM vendor_associations WHERE vendor_id = ? AND association_id = ? AND relationship_type = ?')
    .bind(vendorId, associationId, relationshipType)
    .first<{ id: string }>();

  if (action === 'remove' || (action === 'toggle' && existing)) {
    if (existing) {
      await db.prepare('DELETE FROM vendor_associations WHERE id = ?').bind(existing.id).run();
    }
  } else {
    const id = crypto.randomUUID();
    await db
      .prepare('INSERT INTO vendor_associations (id, vendor_id, association_id, relationship_type, created_by) VALUES (?, ?, ?, ?, ?)')
      .bind(id, vendorId, associationId, relationshipType, userId)
      .run();
  }

  const referer = request.headers.get('referer') || `/vendors/${vendorId}`;
  return new Response(null, { status: 302, headers: { Location: referer } });
};
