import { createRenderer, type Quality } from './renderer';
import { FRAMINGS, PORTRAIT_QUERY, POSTER_TIME } from './framing';

const WARMUP_FRAMES = 5; // ignore shader compile / first-upload hitches
const SAMPLE_FRAMES = 60;

/**
 * Brings the hero's black hole to life over its poster. Every failure path just leaves the poster up.
 * Expects `root` to contain the <canvas>; adds `is-live` to the canvas once a real frame is on screen.
 * Animation pauses whenever `zone` (the part of the page the black hole sits behind) is scrolled out of view.
 */
export function start(root: HTMLElement, zone: HTMLElement | null) {
  const canvas = root.querySelector('canvas');
  if (!canvas) return;
  const renderer = createRenderer(canvas);
  if (!renderer) return;

  const isPhone = matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia(PORTRAIT_QUERY);

  const maxPixelRatio = isPhone ? 1 : 1.5;
  const minFrameInterval = isPhone ? 1000 / 30 : 0; // phones capped at 30 fps
  const frameBudget = isPhone ? 1000 / 30 : 1000 / 60;
  // Best first. If frames run over budget we step down, at most once per measurement window.
  const ladder: Quality[] = isPhone
    ? [
        { scale: 0.5, steps: 48 },
        { scale: 0.4, steps: 40 },
        { scale: 0.33, steps: 32 },
      ]
    : [
        { scale: 0.5, steps: 64 },
        { scale: 0.4, steps: 48 },
        { scale: 0.33, steps: 32 },
      ];
  let level = 0;

  let raf = 0;
  let last = 0;
  let onScreen = true;
  let lost = false;
  const t0 = performance.now();

  // Adaptive quality: average frame interval over a window, step down if it's over budget.
  let samples = 0;
  let sampleTotal = 0;
  let tuned = false;
  const measure = (interval: number) => {
    if (tuned) return;
    samples++;
    if (samples <= WARMUP_FRAMES) return;
    sampleTotal += interval;
    if (samples < WARMUP_FRAMES + SAMPLE_FRAMES) return;
    const avg = sampleTotal / SAMPLE_FRAMES;
    if (avg > frameBudget * 1.2 && level < ladder.length - 1) {
      level++;
      samples = 0;
      sampleTotal = 0;
    } else {
      tuned = true;
    }
  };

  const draw = (time: number) => {
    renderer.draw(time, portrait.matches ? FRAMINGS.portrait : FRAMINGS.landscape, ladder[level]);
    canvas.classList.add('is-live');
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const interval = now - last;
    if (interval < minFrameInterval - 2) return;
    last = now;
    draw(POSTER_TIME + (now - t0) / 1000);
    measure(interval);
  };

  const shouldAnimate = () => onScreen && !document.hidden && !reducedMotion.matches && !lost;

  const update = () => {
    if (lost) return;
    if (reducedMotion.matches) {
      // One still frame (the same moment the poster shows), no loop.
      cancelAnimationFrame(raf);
      raf = 0;
      draw(POSTER_TIME);
      return;
    }
    if (shouldAnimate() && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!shouldAnimate() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    renderer.resize(rect.width, rect.height, Math.min(devicePixelRatio || 1, maxPixelRatio));
    if (!raf && !lost) draw(reducedMotion.matches ? POSTER_TIME : POSTER_TIME + (performance.now() - t0) / 1000);
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    update();
  }).observe(zone ?? canvas);
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
  portrait.addEventListener('change', resize);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.classList.remove('is-live'); // fall back to the poster
  });

  resize();
  update();
}
