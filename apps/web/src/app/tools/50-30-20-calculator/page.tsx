import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "@/lib/get-session";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BudgetCalculatorClient } from "./calculator-client";

export const metadata: Metadata = {
  title: "Free 50/30/20 Budget Calculator (Interactive 2026 Tool)",
  description:
    "Calculate your monthly budget using the 50/30/20 rule. Instant breakdown of Needs, Wants, and Savings with customizable categories in multiple currencies.",
  alternates: {
    canonical: "/tools/50-30-20-calculator",
  },
  openGraph: {
    title: "Free 50/30/20 Budget Calculator | Pocketly",
    description:
      "Calculate your monthly budget with the 50/30/20 rule. Instant breakdown of Needs, Wants, and Savings in USD, INR, EUR, GBP.",
    url: "/tools/50-30-20-calculator",
  },
};

export default async function BudgetCalculatorPage() {
  const session = await getServerSession();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "50/30/20 Budget Calculator",
        url: `${SITE_URL}/tools/50-30-20-calculator`,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        creator: {
          "@type": "Organization",
          name: SITE_NAME,
          url: SITE_URL,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is the 50/30/20 budget rule?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The 50/30/20 rule splits your after-tax income into three buckets: 50% for essential Needs, 30% for discretionary Wants, and 20% for Savings and debt repayment.",
            },
          },
          {
            "@type": "Question",
            name: "Should I calculate the 50/30/20 budget before or after taxes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Always calculate your 50/30/20 budget on your after-tax (net take-home) income. This is the exact amount that gets deposited into your bank account.",
            },
          },
          {
            "@type": "Question",
            name: "What if my rent is more than 50% of my income?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "If you live in a high-cost-of-living city, adapt the framework to 60/20/20 or 70/15/15 temporarily until your income increases or fixed expenses drop.",
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={Boolean(session)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-12">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2.5 text-xs text-muted-foreground hover:text-foreground"
            render={
              <Link href="/blog">
                <ArrowLeft className="size-3.5" /> Back to Blog & Guides
              </Link>
            }
          />
          <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
            50/30/20 Budget Calculator
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Instantly divide your monthly take-home income into Needs, Wants, and Savings.
            Read our full guide on{" "}
            <Link
              href="/blog/50-30-20-budget-rule-guide"
              className="text-foreground underline underline-offset-4"
            >
              How the 50/30/20 Budget Rule Works
            </Link>
            .
          </p>
        </div>

        <BudgetCalculatorClient />

        {/* FAQs */}
        <div className="mt-16 border-t border-border pt-12">
          <h2 className="mb-6 font-heading text-2xl text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">
                  Do I calculate this on gross or net income?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Always use your <strong>net take-home pay</strong> (after income taxes, healthcare deductions, and mandatory retirement contributions).
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">
                  Where do debt payments go?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Minimum loan payments count toward <strong>Needs (50%)</strong> to avoid default. Extra payments to accelerate debt payoff count toward <strong>Savings (20%)</strong>.
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">
                  How often should I review my allocations?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Check category balances weekly and run a full review at month-end. See our{" "}
                  <Link
                    href="/blog/how-to-conduct-a-monthly-money-review"
                    className="text-foreground underline underline-offset-4"
                  >
                    Monthly Money Review Checklist
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-sm">
                  Can I track this automatically?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Yes! Pocketly lets you define category budgets matching your 50/30/20 targets with instant ledger visibility.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
