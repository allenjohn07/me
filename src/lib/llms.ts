import { getCollection } from 'astro:content';
import { DATA } from '@/data/resume';

// Builds /llms.txt (https://llmstxt.org): a Markdown summary of the site for AI agents.
export async function buildLlmsTxt(): Promise<string> {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const url = (path: string) => new URL(path, DATA.url).href;

  const lines = [
    `# ${DATA.name}`,
    '',
    `> ${DATA.description}`,
    '',
    DATA.summary,
    '',
    '## Links',
    '',
    `- [Website](${url('/')})`,
    `- [Blog](${url('/blog/')})`,
    `- [GitHub](${DATA.contact.social.GitHub.url})`,
    `- [LinkedIn](${DATA.contact.social.LinkedIn.url})`,
    '',
    '## Education',
    '',
    ...DATA.education.map((edu) => `- ${edu.degree} - ${edu.school}, ${edu.end}`),
    '',
    '## Projects',
    '',
    ...DATA.projects.map((project) => {
      const title = project.url ? `[${project.title}](${project.url})` : project.title;
      return `- ${title}: ${project.description}`;
    }),
    '',
    '## Cubing',
    '',
    ...DATA.cubing.map((item) => `- ${item}`),
    '',
    '## Blog posts',
    '',
    ...posts.map((post) => {
      const date = post.data.date.toISOString().slice(0, 10);
      const summary = post.data.description ? `: ${post.data.description}` : '';
      return `- [${post.data.title}](${url(`/blog/${post.slug}.md`)}) (${date})${summary}`;
    }),
  ];

  return lines.join('\n') + '\n';
}
