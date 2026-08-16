import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-session";
import {
  Apple,
  LineChart,
  Play,
  Receipt,
  RefreshCcw,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site-config";

const LEDGER_ENTRIES: Array<{
  description: string;
  date: string;
  amount: number;
  type: "income" | "expense";
}> = [
  { description: "Salary", date: "Aug 12", amount: 5200000, type: "income" },
  {
    description: "Freelance design",
    date: "Aug 10",
    amount: 850000,
    type: "income",
  },
  { description: "Rent", date: "Aug 9", amount: 1200000, type: "expense" },
  {
    description: "Groceries",
    date: "Aug 7",
    amount: 184000,
    type: "expense",
  },
  {
    description: "Electricity",
    date: "Aug 3",
    amount: 96000,
    type: "expense",
  },
];

const LEDGER_BALANCE = 4570000;

const LOOP_STAGES = ["Earn", "Record", "Understand", "Plan", "Improve"];

const CAPABILITIES = [
  {
    icon: Wallet,
    title: "Accounts",
    description: "Every bank account, wallet, and card in one balance sheet.",
  },
  {
    icon: Receipt,
    title: "Records",
    description:
      "Log income, expenses, and transfers in seconds — search and filter them anytime.",
  },
  {
    icon: Target,
    title: "Planning",
    description:
      "Set a budget per category and see exactly how close you are to it.",
  },
  {
    icon: LineChart,
    title: "Analysis",
    description:
      "Cash flow and spending patterns, visualized without the spreadsheet.",
  },
];

export default async function Home() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <header className="flex items-center justify-between border-b border-border/70 px-6 py-6 sm:px-12">
        <span className="font-heading text-xl text-foreground">Pocketly</span>
        <nav className="flex items-center gap-4 text-sm">
          <Button variant="ghost" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button render={<Link href="/sign-up" />}>Get started</Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-20 sm:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <p className="mb-5 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              Personal finance, kept like a ledger
            </p>
            <h1 className="max-w-xl font-heading text-4xl leading-[1.08] text-foreground sm:text-6xl">
              Every expense, written down where you&apos;ll actually look.
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              Pocketly is the ledger for people who don&apos;t think in
              spreadsheets. Record what you spend in seconds, and watch your
              balance, budgets, and habits come into focus.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" render={<Link href="/sign-up" />}>
                Start your ledger
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/sign-in" />}
              >
                I already have an account
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                Coming soon
              </span>
              <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                <Play className="size-3.5" />
                Google Play
              </span>
              <span className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-mono text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                <Apple className="size-3.5" />
                App Store
              </span>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <div className="relative w-full max-w-md">
              {/* Older pages in the ledger, peeking out behind the current one */}
              <div
                aria-hidden
                className="absolute inset-x-6 top-4 -z-10 h-full rotate-3 rounded-2xl border border-border/60 bg-card/50"
              />
              <div
                aria-hidden
                className="absolute inset-x-3 top-2 -z-10 h-full -rotate-1 rounded-2xl border border-border/80 bg-card/75"
              />
              <div className="-rotate-1 rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:rotate-0">
                <div className="mb-4 flex items-center justify-between border-b border-dashed border-border pb-3">
                  <span className="font-mono text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                    Sample entries
                  </span>
                  <span className="font-heading text-sm text-foreground">
                    Pocketly
                  </span>
                </div>
                <ul className="flex flex-col">
                  {LEDGER_ENTRIES.map((entry, i) => (
                    <li
                      key={entry.description}
                      className="animate-ledger-row flex items-center justify-between py-2"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {entry.description}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.date}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-sm tabular-nums",
                          entry.type === "expense"
                            ? "text-negative"
                            : "text-positive",
                        )}
                      >
                        {entry.type === "expense" ? "-" : "+"}
                        {formatCurrency(entry.amount, "INR")}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    Balance
                  </span>
                  <span className="font-mono text-base tabular-nums text-foreground">
                    {formatCurrency(LEDGER_BALANCE, "INR")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The loop */}
        <section className="border-t border-border/70 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:px-12">
            <p className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
              The Pocketly loop
            </p>
            <h2 className="max-w-lg font-heading text-2xl text-foreground sm:text-3xl">
              Money moves in a loop. So does Pocketly.
            </h2>
            {/* Below lg: stages wrap onto their own lines like a short list. */}
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4 lg:hidden">
              {LOOP_STAGES.map((stage, i) => (
                <span key={stage} className="flex items-center gap-3">
                  <span className="font-mono text-sm tracking-wide text-foreground uppercase">
                    {stage}
                  </span>
                  {i < LOOP_STAGES.length - 1 && (
                    <span
                      aria-hidden
                      className="font-mono text-sm text-muted-foreground"
                    >
                      &rarr;
                    </span>
                  )}
                </span>
              ))}
              <span
                aria-hidden
                className="font-mono text-sm text-muted-foreground"
              >
                &rarr;
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-mono text-sm tracking-wide text-accent-foreground uppercase">
                <RefreshCcw className="size-3.5" />
                Repeat
              </span>
            </div>

            {/* At lg+: one ruled line spanning the full width, like a ledger's running total row. */}
            <div className="mt-10 hidden items-center lg:flex">
              {LOOP_STAGES.map((stage) => (
                <Fragment key={stage}>
                  <span className="shrink-0 font-mono text-sm tracking-wide text-foreground uppercase">
                    {stage}
                  </span>
                  <span
                    aria-hidden
                    className="mx-4 h-px flex-1 border-t border-dashed border-border"
                  />
                </Fragment>
              ))}
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 font-mono text-sm tracking-wide text-accent-foreground uppercase">
                <RefreshCcw className="size-3.5" />
                Repeat
              </span>
            </div>
          </div>
        </section>

        {/* Capability index */}
        <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:px-12">
          <p className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            What&apos;s inside
          </p>
          <h2 className="max-w-lg font-heading text-2xl text-foreground sm:text-3xl">
            Everything a ledger needs. Nothing it doesn&apos;t.
          </h2>
          <ul className="mt-10 grid border-t border-l border-border sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-5 border-r border-b border-border p-6 sm:p-8"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-heading text-lg text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing CTA */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:px-12">
            <p className="mb-3 font-mono text-xs tracking-widest text-primary-foreground/70 uppercase">
              Get started
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl">
              Start keeping your ledger.
            </h2>
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                variant="secondary"
                render={<Link href="/sign-up" />}
              >
                Create your account
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-primary-foreground/70">
              Takes less than a minute.
            </p>
          </div>
        </section>
      </main>

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
    </div>
  );
}
