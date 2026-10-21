import type { APIRoute } from 'astro';

export const prerender = false;

/* Le français vit à la racine, mais des visiteurs tapent /fr par symétrie
 * avec /en : on les renvoie vers la même page sans le préfixe. */
export const GET: APIRoute = ({ params, url, redirect }) => {
  const path = params.path ? `/${params.path}` : '/';
  /* Les navigateurs lisent /\evil.com comme //evil.com : on résout la cible
   * comme eux et on refuse tout ce qui quitte le site. */
  const target = new URL(`${path}${url.search}`, url.origin);
  if (target.origin !== url.origin) return redirect('/', 301);
  return redirect(`${target.pathname}${target.search}`, 301);
};
