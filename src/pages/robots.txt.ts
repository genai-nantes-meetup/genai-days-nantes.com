import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) => {
  const siteUrl = (site ?? new URL(url.origin)).href;
  const body = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${new URL('/sitemap-index.xml', siteUrl).href}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
