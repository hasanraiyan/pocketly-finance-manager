import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "@/lib/get-session";
import { getBlogSlugs, getBlogPostMeta, formatBlogDate } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function generateStaticParams() {
  return getBlogSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getBlogPostMeta(slug).catch(() => null);
  if (!meta) return {};

  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      title: meta.title,
      description: meta.description,
      publishedTime: meta.date,
      url: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getBlogSlugs().includes(slug)) notFound();

  const [session, meta, { default: Post }] = await Promise.all([
    getServerSession(),
    getBlogPostMeta(slug),
    import(`@/content/blog/${slug}.mdx`) as Promise<{
      default: React.ComponentType;
    }>,
  ]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.date,
    author: { "@type": "Person", name: SITE_NAME },
    url: `${SITE_URL}/blog/${slug}`,
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={Boolean(session)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-12">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Blog
        </Link>
        <p className="mb-2 font-mono text-xs text-muted-foreground">
          {formatBlogDate(meta.date)}
        </p>
        <h1 className="mb-10 font-heading text-3xl text-foreground">
          {meta.title}
        </h1>
        <Post />
      </main>
      <SiteFooter />
    </div>
  );
}
