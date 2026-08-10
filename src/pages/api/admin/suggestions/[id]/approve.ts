import type { APIRoute } from 'astro';
import { isAdmin } from '../../../../../lib/auth';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!isAdmin(locals)) return new Response('Forbidden', { status: 403 });

  const db = env.DB;
  const { id } = params;

  const suggestion = await db
    .prepare('SELECT * FROM suggestions WHERE id = ? AND status = ?')
    .bind(id, 'pending')
    .first<{ id: string; type: string; vendor_id: string | null; user_id: string; suggested_data: string }>();

  if (!suggestion) return new Response('Not found', { status: 404 });

  const data = JSON.parse(suggestion.suggested_data);
  const categories: string[] = data.categories ?? [];

  if (suggestion.type === 'new_vendor') {
    const vendorId = crypto.randomUUID();
    await db
      .prepare(`INSERT INTO vendors (id, name, logo_url, website, description, contact_name, contact_email, contact_phone, address, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(vendorId, data.name, data.logo_url, data.website, data.description,
            data.contact_name, data.contact_email, data.contact_phone, data.address,
            suggestion.user_id)
      .run();

    if (categories.length > 0) {
      const stmts = categories.map((catId: string) =>
        db.prepare('INSERT INTO vendor_categories (vendor_id, category_id) VALUES (?, ?)').bind(vendorId, catId)
      );
      await db.batch(stmts);
    }
  } else if (suggestion.type === 'edit_vendor' && suggestion.vendor_id) {
    await db
      .prepare(`UPDATE vendors SET name = ?, logo_url = ?, website = ?, description = ?,
                contact_name = ?, contact_email = ?, contact_phone = ?, address = ?, updated_at = datetime('now')
                WHERE id = ?`)
      .bind(data.name, data.logo_url, data.website, data.description,
            data.contact_name, data.contact_email, data.contact_phone, data.address,
            suggestion.vendor_id)
      .run();

    await db.prepare('DELETE FROM vendor_categories WHERE vendor_id = ?').bind(suggestion.vendor_id).run();
    if (categories.length > 0) {
      const stmts = categories.map((catId: string) =>
        db.prepare('INSERT INTO vendor_categories (vendor_id, category_id) VALUES (?, ?)').bind(suggestion.vendor_id, catId)
      );
      await db.batch(stmts);
    }
  }

  await db
    .prepare("UPDATE suggestions SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?")
    .bind(locals.userId, id)
    .run();

  let redirect = '/admin/suggestions';
  const ref = request.headers.get('referer');
  if (ref) try { redirect = new URL(ref).pathname; } catch {}
  return new Response(null, { status: 302, headers: { Location: redirect } });
};
