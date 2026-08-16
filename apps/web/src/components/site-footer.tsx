export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 px-6 py-10 sm:px-12">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <span className="font-heading text-base text-foreground">
          Pocketly
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          A personal ledger, kept plainly. &copy; {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
