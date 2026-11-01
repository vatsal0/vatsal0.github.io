import { geoOrthographic, geoPath, geoGraticule10, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';

/**
 * Spinnable globe on a canvas, replacing the flat SVG map inside `figure`.
 * Drag (mouse) or swipe (touch) to rotate; it keeps gently spinning on its own unless the
 * visitor prefers reduced motion. Paused while offscreen or the tab is hidden.
 */
export async function startGlobe(figure: HTMLElement) {
  const canvas = figure.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;

  const topology = (await fetch(figure.dataset.src!).then((r) => r.json())) as Topology<{
    countries: GeometryCollection;
  }>;
  const countries = feature(topology, topology.objects.countries).features;
  const visitedIds = new Set((figure.dataset.visited ?? '').split(',').filter(Boolean));
  const visited = countries.filter((c) => visitedIds.has(String(c.id)));
  const others = countries.filter((c) => !visitedIds.has(String(c.id)));

  const css = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const SALMON = color('--salmon', '#f4a38a');
  const SALMON_LINE = color('--salmon-line', '#ffc9b5');

  const projection = geoOrthographic().clipAngle(90).precision(0.5);
  const path = geoPath(projection, ctx);
  const graticule = geoGraticule10();

  // Start centered between the visited countries, so they're in view on first paint.
  const [lon, lat] = visited.length ? geoCentroid({ type: 'FeatureCollection', features: visited }) : [0, 20];
  let rotation: [number, number] = [-lon, -Math.max(-30, Math.min(30, lat))];

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const SPIN = 6; // degrees per second of auto-rotation
  let size = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    size = rect.width;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.width * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    projection.translate([size / 2, size / 2]).scale(size / 2 - 2);
    draw();
  };

  const draw = () => {
    projection.rotate(rotation);
    ctx.clearRect(0, 0, size, size);

    // Ocean
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.fillStyle = '#121218';
    ctx.fill();

    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = 'rgba(245,185,139,0.08)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    for (const c of others) path(c);
    ctx.fillStyle = '#26262e';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,185,139,0.4)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.beginPath();
    for (const c of visited) path(c);
    ctx.fillStyle = SALMON;
    ctx.fill();
    ctx.strokeStyle = SALMON_LINE;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Rim
    ctx.beginPath();
    path({ type: 'Sphere' });
    ctx.strokeStyle = 'rgba(245,185,139,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // ----- interaction: drag to rotate, with a little momentum -----
  let dragging = false;
  let last: { x: number; y: number; t: number } | null = null;
  let velocity: [number, number] = [0, 0]; // degrees per ms
  const sensitivity = () => 180 / size; // a full-width drag turns the globe ~180°

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    velocity = [0, 0];
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    wake();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !last) return;
    const now = performance.now();
    const dx = (e.clientX - last.x) * sensitivity();
    const dy = (e.clientY - last.y) * sensitivity();
    rotation = [rotation[0] + dx, Math.max(-75, Math.min(75, rotation[1] - dy))];
    const dt = Math.max(1, now - last.t);
    velocity = [dx / dt, -dy / dt];
    last = { x: e.clientX, y: e.clientY, t: now };
    draw();
  });
  const release = () => {
    dragging = false;
    last = null;
    wake();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // ----- animation loop: auto-spin + momentum, only while visible -----
  let raf = 0;
  let prev = 0;
  let onScreen = true;
  const frame = (now: number) => {
    const dt = Math.min(64, now - prev);
    prev = now;
    if (!dragging) {
      const spin = reducedMotion.matches ? 0 : SPIN / 1000;
      velocity = [velocity[0] * 0.95, velocity[1] * 0.95];
      rotation = [rotation[0] + (velocity[0] + spin) * dt, Math.max(-75, Math.min(75, rotation[1] + velocity[1] * dt))];
      draw();
      const coasting = Math.abs(velocity[0]) + Math.abs(velocity[1]) > 0.0005;
      if (!coasting && reducedMotion.matches) {
        raf = 0;
        return;
      }
    }
    raf = requestAnimationFrame(frame);
  };
  function wake() {
    if (!raf && onScreen && !document.hidden) {
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  const sleep = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) wake();
    else sleep();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? sleep() : wake()));
  new ResizeObserver(resize).observe(canvas);

  figure.classList.add('has-globe');
  resize();
  wake();
}
