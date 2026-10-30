import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';

// Raw Markdown copy of each post, linked from /llms.txt for AI agents.
export const getStaticPaths = (async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: CollectionEntry<'blog'> }> = ({ props }) => {
  const { post } = props;
  const date = post.data.date.toISOString().slice(0, 10);
  const body = `# ${post.data.title}\n\n${date}\n\n${post.body.trim()}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
