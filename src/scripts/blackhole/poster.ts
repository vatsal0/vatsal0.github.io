// Dev-only: renders a poster frame at full quality so scripts/render-poster.mjs can save it.
// Imported behind import.meta.env.DEV, so it never ships.
import { createRenderer } from './renderer';
import { FRAMINGS, POSTER_TIME, type Orientation } from './framing';

export function renderPoster(orientation: Orientation) {
  const framing = FRAMINGS[orientation];
  const canvas = document.createElement('canvas');
  const out = document.createElement('pre');
  out.id = 'poster-out';
  const renderer = createRenderer(canvas);
  if (!renderer) {
    out.textContent = 'error: WebGL unavailable or shader failed';
  } else {
    renderer.resize(framing.width, framing.height, 1);
    renderer.draw(POSTER_TIME, framing, { scale: 1, steps: 128 });
    out.textContent = canvas.toDataURL('image/png');
  }
  document.body.append(out);
}
