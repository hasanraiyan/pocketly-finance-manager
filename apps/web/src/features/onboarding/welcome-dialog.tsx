"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  LineChart,
  Receipt,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { cn } from "@/lib/utils";

type Slide = {
  icon: typeof Wallet;
  title: string;
  body: string;
  /** Where this feature lives, so a slide is a door and not just a poster. */
  href?: string;
  linkLabel?: string;
};

/**
 * One slide per capability. Deliberately covers everything rather than only
 * the AI connection: someone opening Pocketly for the first time doesn't
 * know what any of it does, and the features that look familiar (accounts,
 * records) are the ones they have to understand before the rest is useful.
 */
const SLIDES: Slide[] = [
  {
    icon: Wallet,
    title: "Welcome to Pocketly",
    body: "A ledger for your own money — not accounting software. Five short steps and you'll know where everything lives.",
  },
  {
    icon: Wallet,
    title: "Accounts",
    body: "Add every bank account, wallet, and card. Pocketly keeps a running balance for each one, so the total at the top is always real rather than something you maintain by hand.",
    href: "/accounts",
    linkLabel: "Go to accounts",
  },
  {
    icon: Receipt,
    title: "Records",
    body: "Log an expense, income, or a transfer between your own accounts in a few seconds. Search and filter them later by category, account, or date — nothing is ever hard-deleted.",
    href: "/records",
    linkLabel: "Go to records",
  },
  {
    icon: Target,
    title: "Budgets and repeats",
    body: "Set a monthly limit per category and watch how close you are. Set up a repeat for rent, salary, or a subscription and Pocketly records it on schedule so you never type it again.",
    href: "/planning",
    linkLabel: "Go to planning",
  },
  {
    icon: LineChart,
    title: "Analysis",
    body: "Cash flow, spending by category, and where your money actually goes. Pocketly also points out anything notable — a category well above its usual, or a budget on pace to run out.",
    href: "/analysis",
    linkLabel: "Go to analysis",
  },
  {
    icon: Download,
    title: "It's your data",
    body: "Export everything as a PDF report or CSV, emailed to you. Delete your account and every record goes with it. No lock-in, no selling anything on.",
    href: "/settings",
    linkLabel: "Go to settings",
  },
  {
    icon: Sparkles,
    title: "Bring your own AI",
    body: "Pocketly speaks MCP, so you can connect Claude or ChatGPT and ask about your money in plain language — using the AI you already pay for, not one we charge you extra for.",
    href: "/mcp-guide",
    linkLabel: "How to connect",
  },
];

const ICONS_BY_INDEX = SLIDES.map((slide) => slide.icon);

export function WelcomeDialog({ onboarded }: { onboarded: boolean }) {
  // Safe to derive directly: `onboarded` is resolved on the server and
  // arrives as a prop, so the server and client agree on the first render.
  const [open, setOpen] = useState(!onboarded);
  const [index, setIndex] = useState(0);
  const client = usePocketlyClient();

  const markOnboarded = useMutation({
    mutationFn: async () => {
      await client.PATCH("/users/me", { body: { onboarded: true } });
    },
  });

  function finish() {
    setOpen(false);
    // Fire and forget: if it fails the walkthrough reappears next visit,
    // which is a far better failure than blocking the dialog from closing.
    markOnboarded.mutate();
  }

  const slide = SLIDES[index];
  const Icon = ICONS_BY_INDEX[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing by any route -- Escape, backdrop, the X -- counts as done.
        // Re-showing a walkthrough someone dismissed is nagging.
        if (!next) finish();
        else setOpen(true);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="size-5" />
          </span>
          <DialogTitle>{slide.title}</DialogTitle>
          <DialogDescription>{slide.body}</DialogDescription>
        </DialogHeader>

        {slide.href && (
          <div className="mt-1">
            <Button
              variant="outline"
              size="sm"
              render={<Link href={slide.href} />}
              onClick={finish}
            >
              {slide.linkLabel}
            </Button>
          </div>
        )}

        <DialogFooter className="mt-6 flex-row items-center justify-between gap-3 sm:justify-between">
          <div className="flex gap-1.5" aria-hidden>
            {SLIDES.map((s, i) => (
              <span
                key={s.title}
                className={cn(
                  "size-1.5 rounded-full",
                  i === index ? "bg-foreground" : "bg-muted",
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => i - 1)}
              >
                Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                Start using Pocketly
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={finish}>
                  Skip
                </Button>
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
