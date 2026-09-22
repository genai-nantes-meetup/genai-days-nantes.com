/** Use the public production host for crawlers, including Vercel-hosted sites. */
export function getSocialImageUrl(src: string, site: URL | string): string {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return new URL(src, productionHost ? `https://${productionHost}` : site).href;
}
