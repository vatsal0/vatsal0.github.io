// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://vatsal0.github.io',
  output: 'static',
  // 'preserve' mirrors src/pages: blog/index.astro -> /blog/index.html, blog/foo -> /blog/foo.html.
  // That keeps the old site's URLs working, and GitHub Pages also serves /blog/foo for /blog/foo.html.
  build: { format: 'preserve' },
  // Astro 7 defaults to JSX whitespace rules, which drop the line breaks between prose and inline links
  // ("work with<a>Pavel</a>"). `true` compresses losslessly, like plain HTML.
  compressHTML: true,
});
