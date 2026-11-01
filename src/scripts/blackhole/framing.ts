// Camera framing for the homepage's background black hole (a fixed, viewport-sized layer), one per orientation. The poster images are rendered with exactly these
// settings (scripts/render-poster.mjs), and the live shader crops them the same way object-fit: cover
// crops the poster, so the canvas fades in over the poster without the picture jumping.

export interface Framing {
  /** Poster size in px; its aspect is the reference frame the shader crops from. */
  width: number;
  height: number;
  /** tan(half vertical FOV): smaller = more zoomed in. */
  zoom: number;
  /** Where the hole sits, in reference units (0,0 is the middle; y is +up, range +-0.5). */
  center: [number, number];
}

export const FRAMINGS = {
  portrait: { width: 1080, height: 1920, zoom: 0.4, center: [0, 0.27] },
  landscape: { width: 1920, height: 1080, zoom: 0.34, center: [0, 0.2] },
} satisfies Record<string, Framing>;

export type Orientation = keyof typeof FRAMINGS;

/** Matches the <picture> media query, so poster and canvas always agree. */
export const PORTRAIT_QUERY = '(orientation: portrait)';

/** Disk rotation time the posters are frozen at (and reduced-motion users see). */
export const POSTER_TIME = 12;
