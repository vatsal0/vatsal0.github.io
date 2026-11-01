// Deterministic star positions for the books page: seeded by each book's id, so the sky looks the
// same on every build and visit. Positions are normalized to [0, 1] within the sky's box.

export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export interface Point {
  x: number;
  y: number;
}

/** Sky box sizes the layouts are planned in (px). The CSS uses the same aspect ratios. */
export const SKY = {
  wide: { width: 680, height: 560, minGap: 70 },
  // Phones get a taller, scrolling sky rather than cramming stars together.
  narrow: { width: 360, height: 1180, minGap: 62 },
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Places each id away from the ones before it; pass ids in priority order (brightest first). */
export function layout(ids: string[], box: { width: number; height: number; minGap: number }) {
  const margin = 0.06;
  const placed: (Point & { id: string })[] = [];
  for (const id of ids) {
    const rand = mulberry32(hash(id));
    let best: Point = { x: 0.5, y: 0.5 };
    let bestGap = -1;
    for (let tries = 0; tries < 400; tries++) {
      const p = { x: margin + rand() * (1 - 2 * margin), y: margin + rand() * (1 - 2 * margin) };
      const gap = Math.min(
        Infinity,
        ...placed.map((q) => Math.hypot((p.x - q.x) * box.width, (p.y - q.y) * box.height)),
      );
      if (gap > bestGap) {
        best = p;
        bestGap = gap;
      }
      if (gap >= box.minGap) break;
    }
    placed.push({ id, ...best });
  }
  return new Map(placed.map(({ id, x, y }) => [id, { x, y }]));
}

/**
 * Star look per rating, following real star colors from hottest to coolest:
 * blue (Rigel) -> blue-white (Sirius) -> yellow (Sun) -> orange (Aldebaran) -> red (Antares).
 * `spike` is the length of the cross-shaped diffraction spikes in px.
 */
export const STAR_STYLE: Record<Rating, { size: number; glow: number; spike: number; color: string; label: string; spectral: string }> = {
  5: { size: 16, glow: 30, spike: 70, color: '#5aa9ff', label: 'life-changing', spectral: 'blue, ~25,000 K (Rigel)' },
  4: { size: 12, glow: 16, spike: 34, color: '#e6edff', label: 'great', spectral: 'blue-white, ~10,000 K (Sirius)' },
  3: { size: 10, glow: 12, spike: 24, color: '#ffd84a', label: 'good', spectral: 'yellow, ~6,000 K (the Sun)' },
  2: { size: 8, glow: 9, spike: 16, color: '#ffa232', label: 'nothing special', spectral: 'orange, ~4,000 K (Aldebaran)' },
  1: { size: 6.5, glow: 7, spike: 10, color: '#ff5a4d', label: 'forgettable', spectral: 'red, ~3,000 K (Antares)' },
  0: { size: 5, glow: 0, spike: 0, color: '#6b6d74', label: "haven't read it yet", spectral: 'a dead, cooled-off ember' },
};
