import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import React from "react";

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return node.toString();
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node) && node.props && (node.props as { children?: React.ReactNode }).children) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

const components: MDXComponents = {
  h2: ({ children }) => {
    const text = extractText(children);
    const id = slugify(text);
    return (
      <h2
        id={id}
        className="mt-12 mb-4 scroll-mt-24 font-heading text-2xl text-foreground first:mt-0"
      >
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const text = extractText(children);
    const id = slugify(text);
    return (
      <h3
        id={id}
        className="mt-8 mb-3 scroll-mt-24 font-heading text-lg font-medium text-foreground"
      >
        {children}
      </h3>
    );
  },
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
    <blockquote className="mb-5 border-l-2 border-primary/60 bg-muted/20 py-1 pl-4 text-foreground italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <Link
      href={href ?? "#"}
      className="font-medium text-foreground underline underline-offset-4 decoration-primary/50 transition-colors hover:decoration-foreground"
    >
      {children}
    </Link>
  ),
  code: ({ children }) => (
    <code className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted/50 text-xs text-foreground uppercase">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="transition-colors hover:bg-muted/20">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-medium text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-muted-foreground">{children}</td>
  ),
  hr: () => <hr className="my-10 border-border" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

