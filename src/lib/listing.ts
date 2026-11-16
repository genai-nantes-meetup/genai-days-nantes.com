/* Sessions de secours (`unlisted: true`) et intervenants qui n'y parlent
 * qu'elles : leurs pages existent, accessibles par URL directe et en noindex,
 * mais aucune liste ni index généré ne les mentionne. Sans import
 * d'astro:content pour que astro.config.mjs (sitemap) partage la même règle. */

interface ListableSession {
  data: { unlisted?: boolean; speakerSlugs: string[]; guestSlugs?: string[] };
}

export function isUnlistedSession(session: ListableSession): boolean {
  return session.data.unlisted === true;
}

export function excludeUnlistedSessions<T extends ListableSession>(sessions: T[]): T[] {
  return sessions.filter((session) => !isUnlistedSession(session));
}

/* Un·e intervenant·e sans aucune session (MC, jury sans session) reste listé·e :
 * seul·e celui ou celle dont toutes les sessions sont masquées l'est aussi. */
export function getUnlistedSpeakerIds(sessions: ListableSession[]): Set<string> {
  const participantsOf = (session: ListableSession) => [...session.data.speakerSlugs, ...(session.data.guestSlugs ?? [])];
  const listedIds = new Set(excludeUnlistedSessions(sessions).flatMap(participantsOf));
  return new Set(sessions.filter(isUnlistedSession).flatMap(participantsOf).filter((id) => !listedIds.has(id)));
}

export function excludeUnlistedSpeakers<T extends { id: string }>(speakers: T[], sessions: ListableSession[]): T[] {
  const unlistedIds = getUnlistedSpeakerIds(sessions);
  return speakers.filter((speaker) => !unlistedIds.has(speaker.id));
}
