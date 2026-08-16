import type { MDXComponents } from "mdx/types";
import Link from "next/link";

const components: MDXComponents = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-3 font-heading text-2xl text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 font-heading text-lg text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-5 leading-relaxed text-muted-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-5 flex flex-col gap-2 pl-5 text-muted-foreground [&>li]:list-disc">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 flex flex-col gap-2 pl-5 text-muted-foreground [&>li]:list-decimal">
      {children}
    </ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-5 border-l-2 border-border pl-4 text-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? "#"}
      className="text-foreground underline underline-offset-4"
    >
      {children}
    </Link>
  ),
  code: ({ children }) => (
    <code className="border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  ),
  hr: () => <hr className="my-10 border-border" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
