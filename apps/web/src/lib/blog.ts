import { readdirSync } from "fs";
import path from "path";

export type BlogPostMeta = {
  title: string;
  description: string;
  date: string;
};

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src/content/blog");

export function getBlogSlugs(): string[] {
  return readdirSync(BLOG_CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export async function getBlogPostMeta(slug: string): Promise<BlogPostMeta> {
  const mod = (await import(`@/content/blog/${slug}.mdx`)) as {
    metadata: BlogPostMeta;
  };
  return mod.metadata;
}

export async function getAllBlogPosts(): Promise<
  Array<BlogPostMeta & { slug: string }>
> {
  const posts = await Promise.all(
    getBlogSlugs().map(async (slug) => ({
      slug,
      ...(await getBlogPostMeta(slug)),
    })),
  );
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function formatBlogDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
