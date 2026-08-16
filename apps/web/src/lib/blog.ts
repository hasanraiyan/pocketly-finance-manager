import { readdirSync, readFileSync } from "fs";
import path from "path";

export type BlogHeading = {
  id: string;
  text: string;
  level: number;
};

export type BlogPostMeta = {
  title: string;
  description: string;
  date: string;
  readingTime?: string;
  headings?: BlogHeading[];
};

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src/content/blog");

export function getBlogSlugs(): string[] {
  return readdirSync(BLOG_CONTENT_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getBlogContent(slug: string): string {
  const filePath = path.join(BLOG_CONTENT_DIR, `${slug}.mdx`);
  return readFileSync(filePath, "utf-8");
}

export function calculateReadingTime(content: string): string {
  const words = content.replace(/[#*`_\[\]()]/g, "").trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function extractHeadings(content: string): BlogHeading[] {
  const headingLines = content.split("\n").filter((line) => line.startsWith("## ") || line.startsWith("### "));
  return headingLines.map((line) => {
    const isH2 = line.startsWith("## ");
    const text = isH2 ? line.replace("## ", "").trim() : line.replace("### ", "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return {
      id,
      text,
      level: isH2 ? 2 : 3,
    };
  });
}

export async function getBlogPostMeta(slug: string): Promise<BlogPostMeta> {
  const mod = (await import(`@/content/blog/${slug}.mdx`)) as {
    metadata: BlogPostMeta;
  };
  const rawContent = getBlogContent(slug);
  const readingTime = calculateReadingTime(rawContent);
  const headings = extractHeadings(rawContent);

  return {
    ...mod.metadata,
    readingTime,
    headings,
  };
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

