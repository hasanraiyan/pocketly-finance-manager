"use client";

import { useState } from "react";
import { Minus, PenLine, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ErrorState } from "@/components/error-state";
import { formatCurrency } from "@/lib/format";
import type { Account } from "@/features/accounts/hooks";
import { GoalFormDialog } from "./goal-form-dialog";
import {
  useContributeToGoal,
  useDeleteGoal,
  useGoals,
  type Goal,
} from "./hooks";

/**
 * Status is the one thing on the card that isn't a number, so it carries the
 * colour: someone scanning six goals should see which need attention without
 * reading a single figure.
 */
const STATUS: Record<
  Goal["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  complete: { label: "Done", variant: "default" },
  on_track: { label: "On track", variant: "secondary" },
  at_risk: { label: "Behind", variant: "destructive" },
  stalled: { label: "Not moving", variant: "outline" },
};

function formatCompletion(iso: string | null): string {
  if (!iso) return "No date yet";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function ContributeDialog({
  goal,
  currency,
}: {
  goal: Goal;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const contribute = useContributeToGoal();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const minor = Math.round(parseFloat(amount || "0") * 100) * direction;
    if (minor === 0) return;
    contribute.mutate(
      { id: goal._id, amount: minor },
      {
        onSuccess: () => {
          setOpen(false);
          setAmount("");
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAmount("");
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus />
            Add
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{goal.name}</DialogTitle>
            <DialogDescription>
              {formatCurrency(goal.progress, currency)} of{" "}
              {formatCurrency(goal.targetAmount, currency)} so far.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
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
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={contribute.isPending}
                onClick={() => setDirection(1)}
              >
                {contribute.isPending && <Spinner className="size-3.5" />}
                <Plus />
                Put in
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={contribute.isPending}
                onClick={() => setDirection(-1)}
              >
                <Minus />
                Take out
              </Button>
            </div>
          </div>
          <DialogFooter />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteGoalAlert({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false);
  const deleteGoal = useDeleteGoal();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete {goal.name}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
          <AlertDialogDescription>
            {goal.name} stops counting against what&apos;s safe to spend. No
            money moves — this only removes the goal.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteGoal.mutate(goal._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GoalsView({
  initialData,
  initialLoadFailed = false,
  accounts,
  currency,
}: {
  initialData: Goal[];
  initialLoadFailed?: boolean;
  accounts: Account[];
  currency: string;
}) {
  const { data: goals, isError, isFetching, refetch } = useGoals(initialData);
  const showError = initialLoadFailed || isError;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Goals</h1>
          <p className="text-sm text-muted-foreground">
            What you&apos;re saving towards, and when you&apos;ll get there.
          </p>
        </div>
        <GoalFormDialog
          accounts={accounts}
          trigger={
            <Button className="hidden md:inline-flex">
              <Plus />
              New goal
            </Button>
          }
        />
      </div>

      {/* The empty state has its own CTA -- a FAB alongside it would give
          mobile two ways to do the same thing. */}
      {!(goals.length === 0 && !showError) && (
        <GoalFormDialog
          accounts={accounts}
          trigger={
            <Button
              aria-label="New goal"
              className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 size-14 rounded-full shadow-lg md:hidden [&_svg:not([class*='size-'])]:size-6"
            >
              <Plus />
            </Button>
          }
        />
      )}

      {showError ? (
        <ErrorState
          title="Couldn't load your goals"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : goals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No goals yet</EmptyTitle>
            <EmptyDescription>
              Set one and Pocketly will hold it back from what&apos;s safe to
              spend, then tell you when you&apos;ll reach it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <GoalFormDialog
              accounts={accounts}
              trigger={<Button size="sm">Create a goal</Button>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const status = STATUS[goal.status];
            return (
              <Card key={goal._id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{goal.name}</CardTitle>
                    <Badge variant={status.variant} className="mt-1">
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <GoalFormDialog
                      goal={goal}
                      accounts={accounts}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <PenLine />
                          <span className="sr-only">Edit {goal.name}</span>
                        </Button>
                      }
                    />
                    <DeleteGoalAlert goal={goal} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between font-mono text-sm tabular-nums">
                      <span>{formatCurrency(goal.progress, currency)}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>
                    <Progress value={goal.percentComplete} />
                  </div>

                  <dl className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex justify-between gap-2">
                      <dt>Expected</dt>
                      <dd className="tabular-nums">
                        {formatCompletion(goal.projectedCompletion)}
                      </dd>
                    </div>
                    {goal.monthlyContribution > 0 && (
                      <div className="flex justify-between gap-2">
                        <dt>Each month</dt>
                        <dd className="tabular-nums">
                          {formatCurrency(goal.monthlyContribution, currency)}
                        </dd>
                      </div>
                    )}
                    {/* Only shown when it differs from the plan -- repeating
                        the same number twice reads as a rendering bug. */}
                    {goal.monthlyShortfall > 0 && (
                      <div className="flex justify-between gap-2 text-negative">
                        <dt>Needs</dt>
                        <dd className="tabular-nums">
                          {formatCurrency(goal.requiredMonthly ?? 0, currency)} a
                          month
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* A linked goal's progress is its account balance, so
                      there is nothing to type here -- the money has to move
                      in the account itself. */}
                  {!goal.accountId && goal.status !== "complete" && (
                    <ContributeDialog goal={goal} currency={currency} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
