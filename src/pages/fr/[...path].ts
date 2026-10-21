import type { APIRoute } from 'astro';

export const prerender = false;

/* Le français vit à la racine, mais des visiteurs tapent /fr par symétrie
 * avec /en : on les renvoie vers la même page sans le préfixe. */
export const GET: APIRoute = ({ params, url, redirect }) => {
  const path = params.path ? `/${params.path}` : '/';
  return redirect(`${path}${url.search}`, 301);
};
