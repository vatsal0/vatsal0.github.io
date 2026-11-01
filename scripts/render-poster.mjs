#!/usr/bin/env node
// Renders the hero black hole posters from the real shader and saves them to src/assets/blackhole/.
// Run `npm run dev` first, then `npm run poster`. Uses headless Chrome with SwiftShader (software WebGL).
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const DEV_URL = process.env.DEV_URL ?? 'http://localhost:4321/';
const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!CHROME) throw new Error('Chrome not found; set CHROME=/path/to/chrome');

for (const orientation of ['portrait', 'landscape']) {
  const dom = execFileSync(
    CHROME,
    [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--virtual-time-budget=60000',
      '--dump-dom',
      `${DEV_URL}?poster=${orientation}`,
    ],
    { maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
  ).toString();

  const match = dom.match(/<pre id="poster-out">([^<]*)<\/pre>/);
  if (!match) throw new Error(`No poster output for ${orientation}. Is the dev server running at ${DEV_URL}?`);
  if (!match[1].startsWith('data:image/png;base64,')) throw new Error(`${orientation}: ${match[1]}`);

  const out = `src/assets/blackhole/poster-${orientation}.png`;
  writeFileSync(out, Buffer.from(match[1].slice('data:image/png;base64,'.length), 'base64'));
  console.log(`  wrote ${out}`);
}
