import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

export const isDaily = (post: Post) => post.id.startsWith('daily/');
export const postUrl = (post: Post) => `/blog/${post.id}.html`;

/** Published posts, newest first. */
export async function getPosts() {
  const posts = await getCollection('blog', (p) => !p.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// Dates are calendar days with no time zone; format in UTC so they never shift by a day.
export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const formatShortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
