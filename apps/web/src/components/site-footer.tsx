import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 px-6 py-10 sm:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="font-heading text-base text-foreground">
            Pocketly
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            A personal ledger, kept plainly. &copy; {new Date().getFullYear()}
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/faq" className="hover:text-foreground">
            FAQ
          </Link>
          <Link href="/mcp-guide" className="hover:text-foreground">
            Connect an AI client
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
