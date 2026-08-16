import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getServerSession } from "@/lib/get-session";
import {
  getBlogSlugs,
  getBlogPostMeta,
  getAllBlogPosts,
  formatBlogDate,
} from "@/lib/blog";
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

  const [session, meta, allPosts, { default: Post }] = await Promise.all([
    getServerSession(),
    getBlogPostMeta(slug),
    getAllBlogPosts(),
    import(`@/content/blog/${slug}.mdx`) as Promise<{
      default: React.ComponentType;
    }>,
  ]);

  const relatedPosts = allPosts
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

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
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <Post />
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-16 border-t border-border pt-12">
            <h2 className="mb-6 font-heading text-xl text-foreground">
              Related reading
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/40 hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatBlogDate(related.date)}
                    </span>
                    <h3 className="font-heading text-sm font-medium text-foreground group-hover:underline line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {related.description}
                    </p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                    Read article <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
