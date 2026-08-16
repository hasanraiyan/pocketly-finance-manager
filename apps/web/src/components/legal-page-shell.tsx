import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function LegalPageShell({
  title,
  updated,
  authenticated,
  children,
}: {
  title: string;
  updated?: string;
  authenticated: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={authenticated} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 sm:px-12">
        <p className="mb-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {title}
        </p>
        <h1 className="font-heading text-3xl text-foreground">{title}</h1>
        {updated && (
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated {updated}
          </p>
        )}
        <div className="prose-legal mt-10 flex flex-col gap-6 text-sm text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
