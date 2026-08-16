import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="font-heading text-xl text-foreground">Pocketly</span>
        <nav className="flex items-center gap-4 text-sm">
          <Button variant="ghost" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />}>Get started</Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:px-12">
        <p className="mb-4 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Track → Understand → Plan → Improve
        </p>
        <h1 className="max-w-2xl font-heading text-4xl leading-tight text-foreground sm:text-6xl">
          A calmer way to know where your money went.
        </h1>
        <p className="mt-6 max-w-md text-base text-muted-foreground">
          Record an expense in under ten seconds. See your balance, your
          budgets, and your habits — without the spreadsheet.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/sign-up" />}>
            Start tracking, free
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/sign-in" />}>
            I already have an account
          </Button>
        </div>
      </main>
    </div>
  );
}
