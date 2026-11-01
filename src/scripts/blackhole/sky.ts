// Equirectangular background haze for the shader to lens. Drawn once at startup.
// Only soft, low-frequency glow lives here (so 512x256 is plenty); point stars are drawn in the shader.

const HAZES: [x: number, y: number, radius: number, rgb: string, alpha: number][] = [
  [0.2, 0.62, 0.2, '122,18,20', 0.09], // crimson, from the ESO illustration
  [0.78, 0.4, 0.16, '122,18,20', 0.06],
  [0.5, 0.5, 0.1, '245,185,139', 0.025], // warm dust behind the hole
];

export function drawSky(width = 512, height = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0a0b0f';
  ctx.fillRect(0, 0, width, height);

  for (const [x, y, r, rgb, alpha] of HAZES) {
    const g = ctx.createRadialGradient(x * width, y * height, 0, x * width, y * height, r * width);
    g.addColorStop(0, `rgba(${rgb},${alpha})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }
  return canvas;
}
