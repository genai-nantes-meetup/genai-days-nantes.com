/* Dérive un résumé texte brut à partir d'un corps Markdown, pour les
 * contextes qui n'acceptent pas de HTML (meta description, JSON-LD,
 * llms.txt, aperçus compacts) alors que le contenu source peut désormais
 * porter du gras, des liens ou plusieurs paragraphes.
 *
 * `keepLinkUrls` garde l'adresse après le libellé du lien, utile quand le
 * résumé est lu par un agent (llms.txt) et que la cible compte autant que
 * le texte. Les meta descriptions s'en passent. */
export function stripMarkdownToPlainText(
  markdown: string,
  { keepLinkUrls = false }: { keepLinkUrls?: boolean } = {},
): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, keepLinkUrls ? '$1 ($2)' : '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
