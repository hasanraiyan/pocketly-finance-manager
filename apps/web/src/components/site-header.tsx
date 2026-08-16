import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader({ authenticated }: { authenticated: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-border/70 px-6 py-6 sm:px-12">
      <Link href="/" className="font-heading text-xl text-foreground">
        Pocketly
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {authenticated ? (
          <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
        ) : (
          <>
            <Button variant="ghost" render={<Link href="/sign-in" />}>
              Sign in
            </Button>
            <Button render={<Link href="/sign-up" />}>Get started</Button>
          </>
        )}
      </nav>
    </header>
  );
}
