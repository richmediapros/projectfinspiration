import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getTokenFromRequest, getSessionEmail } from './lib/session';
import { SUPER_ADMIN_EMAIL, isLocalDev, getUserByEmail } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/', '/request-access'];
const SKIP_PREFIXES = ['/_astro/', '/favicon'];

function noCacheHeaders(response: Response): Response {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return newResponse;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) {
    return next();
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return noCacheHeaders(await next());
  }

  const db = env.DB;

  if (isLocalDev(context.request)) {
    const user = await getUserByEmail(db, SUPER_ADMIN_EMAIL);
    if (user) {
      context.locals.userEmail = user.email;
      context.locals.userId = user.id;
      context.locals.userRole = user.role;
      context.locals.userName = user.name;
      context.locals.associationId = user.association_id ?? undefined;
      context.locals.associationName = user.association_name ?? undefined;
    } else {
      context.locals.userEmail = SUPER_ADMIN_EMAIL;
      context.locals.userRole = 'super_admin';
      context.locals.userName = 'Admin';
    }
    return noCacheHeaders(await next());
  }

  const token = getTokenFromRequest(context.request);

  if (token && db) {
    const email = await getSessionEmail(db, token);
    if (email) {
      const user = await getUserByEmail(db, email);
      if (user && user.status === 'active') {
        context.locals.userEmail = user.email;
        context.locals.userId = user.id;
        context.locals.userRole = user.role;
        context.locals.userName = user.name;
        context.locals.associationId = user.association_id ?? undefined;
        context.locals.associationName = user.association_name ?? undefined;
        return noCacheHeaders(await next());
      }
    }
  }

  const returnTo = `?return_to=${encodeURIComponent(pathname)}`;
  return context.redirect(`/login${returnTo}`);
});
