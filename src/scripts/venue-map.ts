import type { Map as MapLibreMap } from 'maplibre-gl';

// Route drawn on the map: street access -> forecourt -> venue entrance.
const STREET_ACCESS: [number, number] = [-1.526327, 47.211736];
const VENUE_PARVIS: [number, number] = [-1.525261, 47.211925];
const VENUE_ENTRANCE: [number, number] = [-1.525113, 47.211681];

type MapTheme = {
  land: string;
  landDeep: string;
  water: string;
  ink: string;
  route: string;
  accent: string;
  paper: string;
};

function readMapTheme(): MapTheme {
  const rootStyles = getComputedStyle(document.documentElement);
  const color = (name: string) => rootStyles.getPropertyValue(name).trim();
  return {
    land: color('--color-brand-cream'),
    landDeep: color('--color-brand-cream-deep'),
    water: color('--color-brand-blue'),
    ink: color('--color-brand-black'),
    route: color('--color-brand-blue'),
    accent: color('--color-brand-orange'),
    paper: color('--color-brand-white'),
  };
}

function styleMap(map: MapLibreMap, mapTheme: MapTheme): void {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();

    try {
      if (layer.type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', mapTheme.land);
      }

      if (layer.type === 'fill') {
        const isWater = id.includes('water');
        const isBuilding = id.includes('building');
        map.setPaintProperty(
          layer.id,
          'fill-color',
          isWater ? mapTheme.water : isBuilding ? mapTheme.landDeep : mapTheme.land,
        );
        map.setPaintProperty(layer.id, 'fill-opacity', isWater ? 0.18 : isBuilding ? 0.88 : 1);
      }

      if (layer.type === 'line') {
        map.setPaintProperty(layer.id, 'line-color', mapTheme.paper);
      }

      if (layer.type === 'symbol') {
        if (/(poi|airport|aeroway|transit)/.test(id)) {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        } else {
          map.setPaintProperty(layer.id, 'text-color', mapTheme.ink);
          map.setPaintProperty(layer.id, 'text-halo-color', mapTheme.land);
          map.setPaintProperty(layer.id, 'text-halo-width', 1.5);
        }
      }
    } catch {
      /* Certaines couches utilisent des motifs. Leur rendu natif reste en place. */
    }
  }
}

function addVenueRoute(map: MapLibreMap, mapTheme: MapTheme): void {
  map.addSource('venue-route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [STREET_ACCESS, VENUE_PARVIS, VENUE_ENTRANCE],
      },
    },
  });

  map.addLayer({
    id: 'venue-route-casing',
    type: 'line',
    source: 'venue-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': mapTheme.paper, 'line-width': 8 },
  });

  map.addLayer({
    id: 'venue-route-line',
    type: 'line',
    source: 'venue-route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': mapTheme.route, 'line-width': 4 },
  });

  map.addSource('venue-points', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [STREET_ACCESS, VENUE_ENTRANCE].map((coordinates, index) => ({
        type: 'Feature',
        properties: { kind: index === 0 ? 'street' : 'entrance' },
        geometry: { type: 'Point', coordinates },
      })),
    },
  });

  map.addLayer({
    id: 'venue-points-halo',
    type: 'circle',
    source: 'venue-points',
    paint: { 'circle-radius': 8, 'circle-color': mapTheme.paper },
  });

  map.addLayer({
    id: 'venue-points-fill',
    type: 'circle',
    source: 'venue-points',
    paint: {
      'circle-radius': 4.5,
      'circle-color': ['match', ['get', 'kind'], 'entrance', mapTheme.route, mapTheme.accent],
    },
  });

  map.fitBounds(
    [
      [-1.52655, 47.21152],
      [-1.52488, 47.21208],
    ],
    {
      padding: { top: 26, right: 26, bottom: 26, left: 26 },
      maxZoom: 16.6,
      duration: 0,
    },
  );

  map.jumpTo({ bearing: 158, pitch: 38, zoom: map.getZoom() - 0.3 });
}

// Pulls in maplibre-gl (~270 KiB) and its CSS. Call only once the map
// container is about to enter the viewport: see initVenueMapOnScroll below.
export async function mountVenueMap(container: HTMLElement): Promise<void> {
  // maplibre-gl exports named bindings (Map, AttributionControl, ...), not a
  // single default export, so the module itself carries what we need.
  const [maplibregl] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl.css'),
  ]);

  const mapTheme = readMapTheme();

  const map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [-1.52548, 47.21178],
    zoom: 15.5,
    bearing: 158,
    pitch: 38,
    interactive: false,
    attributionControl: false,
  });

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

  map.on('load', () => {
    container.querySelector('[data-venue-map-fallback]')?.remove();
    const attribution = container.querySelector('details.maplibregl-ctrl-attrib');
    if (attribution) {
      attribution.removeAttribute('open');
      attribution.classList.remove('maplibregl-compact-show');
    }

    styleMap(map, mapTheme);
    addVenueRoute(map, mapTheme);
  });
}

// Defers the maplibre-gl download until the map card nears the viewport,
// so it never competes with the LCP image or blocks the main thread on load.
export function initVenueMapOnScroll(root: ParentNode = document): void {
  const container = root.querySelector<HTMLElement>('[data-venue-map]');
  if (!container || container.dataset.mapReady === 'true') return;

  container.dataset.mapReady = 'true';

  const load = () => void mountVenueMap(container);

  if (!('IntersectionObserver' in window)) {
    load();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    },
    { rootMargin: '200px' },
  );
  observer.observe(container);
}
