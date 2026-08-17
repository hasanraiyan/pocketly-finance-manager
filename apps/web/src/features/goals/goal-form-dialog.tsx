"use client";

import { useState, type ReactNode } from "react";
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
import type { Account } from "@/features/accounts/hooks";
import { useCreateGoal, useUpdateGoal, type Goal } from "./hooks";

export const GOAL_KIND_OPTIONS: Array<{ value: Goal["kind"]; label: string }> = [
  { value: "savings", label: "Savings" },
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "purchase", label: "A purchase" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "debt_payoff", label: "Paying off debt" },
  { value: "other", label: "Something else" },
];

/** `YYYY-MM-DD` for a date input, from the ISO string the API returns. */
function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

export function GoalFormDialog({
  goal,
  accounts,
  trigger,
}: {
  goal?: Goal;
  accounts: Account[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(goal?.name ?? "");
  const [kind, setKind] = useState<Goal["kind"]>(goal?.kind ?? "savings");
  const [targetAmount, setTargetAmount] = useState(
    goal ? String(goal.targetAmount / 100) : "",
  );
  const [monthlyContribution, setMonthlyContribution] = useState(
    goal ? String(goal.monthlyContribution / 100) : "",
  );
  const [targetDate, setTargetDate] = useState(toDateInput(goal?.targetDate));
  const [accountId, setAccountId] = useState(goal?.accountId ?? "");
  const [savedAmount, setSavedAmount] = useState(
    goal ? String(goal.savedAmount / 100) : "",
  );

  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const isEditing = Boolean(goal);
  const pending = createGoal.isPending || updateGoal.isPending;

  function resetToDefaults() {
    setName(goal?.name ?? "");
    setKind(goal?.kind ?? "savings");
    setTargetAmount(goal ? String(goal.targetAmount / 100) : "");
    setMonthlyContribution(goal ? String(goal.monthlyContribution / 100) : "");
    setTargetDate(toDateInput(goal?.targetDate));
    setAccountId(goal?.accountId ?? "");
    setSavedAmount(goal ? String(goal.savedAmount / 100) : "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      name,
      kind,
      targetAmount: Math.round(parseFloat(targetAmount || "0") * 100),
      monthlyContribution: Math.round(
        parseFloat(monthlyContribution || "0") * 100,
      ),
      // A date input gives a local calendar day; the API wants an instant.
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      accountId: accountId || null,
      // Ignored server-side when the goal tracks an account, so it is only
      // sent for the unlinked case.
      savedAmount: accountId
        ? 0
        : Math.round(parseFloat(savedAmount || "0") * 100),
    };

    if (isEditing && goal) {
      updateGoal.mutate(
        { id: goal._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createGoal.mutate(input, {
        onSuccess: () => {
          setOpen(false);
          resetToDefaults();
        },
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetToDefaults();
      }}
    >
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit goal" : "New goal"}</DialogTitle>
            <DialogDescription>
              Pocketly holds this back from what&apos;s safe to spend, and
              works out when you&apos;ll get there.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Emergency fund"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Kind</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Goal["kind"])}
                >
                  {GOAL_KIND_OPTIONS.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel>Target</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Each month</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>By when</FieldLabel>
                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>Track an account (optional)</FieldLabel>
              <NativeSelect
                className="w-full"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <NativeSelectOption value="">
                  Keep progress separately
                </NativeSelectOption>
                {accounts.map((account) => (
                  <NativeSelectOption key={account._id} value={account._id}>
                    {account.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            {/* Only meaningful for an unlinked goal -- a linked one's
                progress is the account balance, and offering to type a
                second number would invite the two to disagree. */}
            {!accountId && (
              <Field>
                <FieldLabel>Saved so far</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={savedAmount}
                  onChange={(e) => setSavedAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
