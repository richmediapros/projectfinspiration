import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdmin } from '../../../../lib/auth';
import { logActivity } from '../../../../lib/activity';

export const POST: APIRoute = async ({ params, request, locals }) => {
  if (!isAdmin(locals)) return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();

  if (!name) return new Response('Speaker name is required', { status: 400 });

  const db = env.DB;
  const vendorId = params.id!;
  const id = crypto.randomUUID();

  const title = String(form.get('title') ?? '').trim() || null;
  const email = String(form.get('email') ?? '').trim() || null;
  const phone = String(form.get('phone') ?? '').trim() || null;
  const photoUrl = String(form.get('photo_url') ?? '').trim() || null;
  const bio = String(form.get('bio') ?? '').trim() || null;
  const website = String(form.get('website') ?? '').trim() || null;
  const linkedin = String(form.get('linkedin') ?? '').trim() || null;
  const topics = String(form.get('topics') ?? '').trim() || null;

  await db
    .prepare(`INSERT INTO speakers (id, vendor_id, name, title, email, phone, photo_url, bio, website, linkedin, topics, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, vendorId, name, title, email, phone, photoUrl, bio, website, linkedin, topics, locals.userId ?? null)
    .run();

  await logActivity(db, request, 'speaker_added', locals.userEmail!, `${name} (vendor: ${vendorId})`);

  return new Response(null, { status: 302, headers: { Location: `/vendors/${vendorId}` } });
};
