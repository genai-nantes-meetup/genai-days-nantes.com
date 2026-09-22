/* Dérive un résumé texte brut à partir d'un corps Markdown, pour les
 * contextes qui n'acceptent pas de HTML (meta description, JSON-LD,
 * llms.txt, aperçus compacts) alors que le contenu source peut désormais
 * porter du gras, des liens ou plusieurs paragraphes. */
export function stripMarkdownToPlainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
