import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Calculator, Sparkles } from "lucide-react";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: meta.title,
        description: meta.description,
        datePublished: meta.date,
        author: { "@type": "Person", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        url: `${SITE_URL}/blog/${slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Blog",
            item: `${SITE_URL}/blog`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: meta.title,
            item: `${SITE_URL}/blog/${slug}`,
          },
        ],
      },
    ],
  };

  const hasHeadings = (meta.headings?.length ?? 0) > 1;

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={Boolean(session)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-12">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2.5 text-xs text-muted-foreground hover:text-foreground"
          render={
            <Link href="/blog">
              <ArrowLeft className="size-3.5" /> Back to all posts
            </Link>
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="font-mono text-[11px] text-muted-foreground">
            {formatBlogDate(meta.date)}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[11px]">
            <Clock className="size-3" />
            {meta.readingTime}
          </Badge>
        </div>

        <h1 className="mb-10 font-heading text-3xl text-foreground sm:text-4xl">
          {meta.title}
        </h1>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Main Article Content */}
          <div className={hasHeadings ? "lg:col-span-8" : "lg:col-span-12"}>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <Post />
            </div>

            {/* In-Article Action Banner using shadcn Card */}
            <Card className="my-12 border-border bg-muted/30">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Sparkles className="size-3.5 text-amber-500" />
                      <span>Start tracking with clarity</span>
                    </div>
                    <CardTitle className="text-lg">
                      Build sustainable money habits with Pocketly
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Track your income, expenses, category budgets, and multi-currency accounts in one minimalist ledger.
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href="/tools/50-30-20-calculator">
                          <Calculator className="size-3.5" /> 50/30/20 Calculator
                        </Link>
                      }
                    />
                    <Button
                      variant="default"
                      size="sm"
                      render={
                        <Link href="/sign-up">
                          Get Started Free <ArrowRight className="size-3.5" />
                        </Link>
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table of Contents Sticky Sidebar using shadcn Card */}
          {hasHeadings && (
            <aside className="hidden lg:col-span-4 lg:block">
              <div className="sticky top-24">
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
                      Table of Contents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <nav className="flex flex-col gap-2">
                      {meta.headings?.map((heading) => (
                        <a
                          key={heading.id}
                          href={`#${heading.id}`}
                          className={`text-xs transition-colors hover:text-foreground ${
                            heading.level === 3
                              ? "pl-3 text-muted-foreground/70 hover:text-muted-foreground"
                              : "font-medium text-muted-foreground"
                          }`}
                        >
                          {heading.text}
                        </a>
                      ))}
                    </nav>
                  </CardContent>
                </Card>
              </div>
            </aside>
          )}
        </div>

        {/* Related Reading Grid using shadcn Cards */}
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
                  className="group"
                >
                  <Card
                    size="sm"
                    className="h-full justify-between transition-all group-hover:border-foreground/40 group-hover:bg-muted/30"
                  >
                    <CardHeader className="pb-2">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatBlogDate(related.date)}
                      </span>
                      <CardTitle className="text-sm line-clamp-2 group-hover:underline">
                        {related.title}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {related.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        Read article <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </CardContent>
                  </Card>
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
