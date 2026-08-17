"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSimulateScenario, type ScenarioKind } from "./hooks";

const KINDS: Array<{ value: ScenarioKind; label: string }> = [
  { value: "one_off", label: "A one-off purchase" },
  { value: "recurring", label: "Something every month" },
  { value: "spending_change", label: "Spending more or less overall" },
];

export function ScenarioDialog({ currency }: { currency: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ScenarioKind>("one_off");
  const [amount, setAmount] = useState("");
  const [percentChange, setPercentChange] = useState("10");
  const simulate = useSimulateScenario();
  const result = simulate.data;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    simulate.mutate(
      kind === "spending_change"
        ? { kind, percentChange: Number(percentChange) }
        : {
            kind,
            type: "expense",
            amount: Math.round(parseFloat(amount || "0") * 100),
            ...(kind === "recurring" ? { frequency: "monthly" as const } : {}),
          },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // A stale verdict from the last question is worse than none: the
        // amounts on screen would no longer be the ones it answered.
        if (!next) simulate.reset();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="secondary"
            size="sm"
            className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
          >
            <Sparkles />
            Can I afford it?
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Try it before you do it</DialogTitle>
            <DialogDescription>
              Pocketly runs the same projection twice and shows you the
              difference.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>What if I had</FieldLabel>
              <NativeSelect
                className="w-full"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as ScenarioKind);
                  simulate.reset();
                }}
              >
                {KINDS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            {kind === "spending_change" ? (
              <Field>
                <FieldLabel>Change in spending, as a percentage</FieldLabel>
                <Input
                  type="number"
                  step="1"
                  min="-100"
                  max="1000"
                  required
                  value={percentChange}
                  onChange={(e) => setPercentChange(e.target.value)}
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>Amount</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            )}

            {simulate.isError && (
              <p className="text-sm text-negative">
                We couldn&apos;t work that out just now. Try again in a moment.
              </p>
            )}

            {result && (
              <div className="flex flex-col gap-3 border-t border-border pt-4">
                <p
                  className={cn(
                    "text-sm",
                    result.affordable ? "text-foreground" : "text-negative",
                  )}
                >
                  {result.verdict}
                </p>

                <dl className="flex flex-col gap-1 font-mono text-xs tabular-nums">
                  <div className="flex justify-between gap-2">
                    <dt className="font-sans text-muted-foreground">
                      End of period
                    </dt>
                    <dd>
                      {formatCurrency(
                        result.baseline.projectedBalance,
                        currency,
                      )}{" "}
                      →{" "}
                      {formatCurrency(
                        result.projected.projectedBalance,
                        currency,
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="font-sans text-muted-foreground">
                      Safe to spend
                    </dt>
                    <dd>
                      {formatCurrency(result.baseline.safeToSpend, currency)} →{" "}
                      {formatCurrency(result.projected.safeToSpend, currency)}
                    </dd>
                  </div>
                  {result.delta.monthlyCommitment !== 0 && (
                    <div className="flex justify-between gap-2">
                      <dt className="font-sans text-muted-foreground">
                        Each month
                      </dt>
                      <dd>
                        {formatCurrency(
                          result.delta.monthlyCommitment,
                          currency,
                        )}
                      </dd>
                    </div>
                  )}
                </dl>

                {result.goalsDelayed.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {result.goalsDelayed.map((goal) => (
                      <li key={goal.id}>
                        {goal.name} slips {goal.monthsLater} month
                        {goal.monthsLater === 1 ? "" : "s"}.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={simulate.isPending}>
              {simulate.isPending && <Spinner className="size-3.5" />}
              {result ? "Try again" : "Work it out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
