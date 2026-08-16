import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { getAllBlogPosts, formatBlogDate } from "@/lib/blog";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on money habits and the thinking behind Pocketly.",
};

export default async function BlogIndexPage() {
  const [session, posts] = await Promise.all([
    getServerSession(),
    getAllBlogPosts(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={Boolean(session)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-12">
        <p className="mb-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Blog
        </p>
        <h1 className="font-heading text-3xl text-foreground">
          Notes on keeping a ledger
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Money habits, and the thinking behind Pocketly.
        </p>

        <ul className="mt-10 divide-y divide-border border-t border-border">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <Link
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-1.5"
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {formatBlogDate(post.date)}
                </span>
                <span className="font-heading text-xl text-foreground group-hover:underline">
                  {post.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {post.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
