import type { APIRoute } from 'astro';

// Static starfield behind every page, generated once at build time.
// Seeded so the sky is identical on every build and every visit.
const WIDTH = 1600;
const HEIGHT = 1000;
const COUNT = 420;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mostly cream-white, with a few warm (disk) and cool (photon rim) stars.
const COLORS: [string, number][] = [
  ['#f3ebe1', 0.72],
  ['#f5b98b', 0.14],
  ['#8ec5ff', 0.1],
  ['#ffb23f', 0.04],
];

function pickColor(r: number) {
  for (const [color, weight] of COLORS) {
    if ((r -= weight) <= 0) return color;
  }
  return COLORS[0][0];
}

export const GET: APIRoute = () => {
  const rand = mulberry32(0x6a7a6a);
  const stars: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    const x = (rand() * WIDTH).toFixed(1);
    const y = (rand() * HEIGHT).toFixed(1);
    // Cubing skews toward faint, tiny stars with the occasional bright one.
    const b = rand() ** 3;
    const r = (0.35 + b * 1.1).toFixed(2);
    const opacity = (0.25 + b * 0.75).toFixed(2);
    const color = pickColor(rand());
    if (b > 0.6) {
      stars.push(`<circle cx="${x}" cy="${y}" r="${(+r * 2.5).toFixed(1)}" fill="${color}" opacity="0.05"/>`);
    }
    stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice">${stars.join('')}</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
