import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

// Essays live at src/content/blog/<slug>.md, daily posts at src/content/blog/daily/<YYYY-MM-DD>.md.
// The entry id doubles as the URL: /blog/<id>.html.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().optional(),
  }),
});

const publications = defineCollection({
  loader: file('./src/content/publications.json'),
  schema: z.object({
    title: z.string(),
    // "*" suffix marks equal contribution. Vatsal's name is bolded by the component.
    authors: z.array(z.string()),
    // First public release (arXiv); sets the order on the homepage, newest first.
    date: z.coerce.date(),
    venue: z.string(),
    year: z.number(),
    url: z.string(),
    links: z.array(z.object({ label: z.string(), url: z.string() })),
    summary: z.string(),
  }),
});

const books = defineCollection({
  loader: file('./src/content/books.json'),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    // 0 = haven't read it yet, 1 = forgettable, 2 = nothing special, 3 = good, 4 = great, 5 = life-changing.
    // null = not rated yet (shows as a TODO).
    rating: z.number().int().min(0).max(5).nullable(),
    blurb: z.string().optional(),
    link: z.url().optional(),
  }),
});

export const collections = { blog, publications, books };
