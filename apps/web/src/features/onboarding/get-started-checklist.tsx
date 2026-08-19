"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { cn } from "@/lib/utils";

export type ChecklistStep = {
  title: string;
  detail: string;
  href: string;
  done: boolean;
};

export function GetStartedChecklist({ steps }: { steps: ChecklistStep[] }) {
  const [dismissed, setDismissed] = useState(false);
  const client = usePocketlyClient();

  const dismiss = useMutation({
    mutationFn: async () => {
      await client.PATCH("/users/me", { body: { dismissChecklist: true } });
    },
  });

  const completed = steps.filter((step) => step.done).length;

  if (dismissed || completed === steps.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          {completed} of {steps.length} done
        </CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              // Hide immediately and persist in the background: the card is
              // gone either way, and a failed write only means it comes back
              // next visit rather than blocking the click.
              setDismissed(true);
              dismiss.mutate();
            }}
          >
            <X />
            <span className="sr-only">Dismiss get started</span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <Progress value={(completed / steps.length) * 100} mode="task" className="mb-3" />
        {steps.map((step) => (
          <div
            key={step.href}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {step.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-positive" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-sm",
                    step.done ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.title}
                </span>
                {!step.done && (
                  <span className="text-xs text-muted-foreground">
                    {step.detail}
                  </span>
                )}
              </div>
            </div>
            {!step.done && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                render={<Link href={step.href} />}
              >
                Go
                <ArrowRight />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
