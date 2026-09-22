import { describe, expect, it } from 'vitest';
import { getCollection } from 'astro:content';
import EquipePage from '../../src/pages/equipe.astro';
import { createAstroContainer } from '../utils/create-astro-container';

describe('equipe.astro', () => {
  it('presents every organiser with the role they carry on the event', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(EquipePage);
    const team = await getCollection('team');

    expect(html).toContain('<title>L’équipe');
    expect(team.length).toBeGreaterThan(0);

    for (const member of team) {
      expect(html).toContain(member.data.name);
      expect(html).toContain(member.data.role);
      expect(html).toContain(member.data.photo);
    }
  });

  it('keeps the roster in the order declared by the collection', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(EquipePage);
    const team = (await getCollection('team')).sort((a, b) => a.data.order - b.data.order);
    const positions = team.map((member) => html.indexOf(member.data.name));

    expect(positions.every((position) => position > -1)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  /* Les portraits servis à la page doivent être les variantes compressées :
   * la convention du projet interdit de référencer une source non optimisée. */
  it('only references optimised portraits', async () => {
    const team = await getCollection('team');

    expect(team.every((member) => member.data.photo.endsWith('-optimized.webp'))).toBe(true);
  });

  it('exposes collection and breadcrumb structured data', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(EquipePage);

    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"@type":"Person"');
  });

  /* Les coordonnées ne sont jamais exposées en clair sur le site : la page
   * équipe renvoie vers /contact, qui sert les adresses à la demande. */
  it('never exposes an email address', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(EquipePage);

    expect(html).not.toContain('mailto:');
    expect(html).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  });
});
