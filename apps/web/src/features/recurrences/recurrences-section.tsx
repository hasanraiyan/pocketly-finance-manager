"use client";

import { useState } from "react";
import { PenLine, Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ErrorState } from "@/components/error-state";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account } from "@/features/accounts/hooks";
import type { Category } from "@/features/categories/hooks";
import { RecurrenceFormDialog } from "./recurrence-form-dialog";
import {
  useDeleteRecurrence,
  useRecurrences,
  useSetRecurrencePaused,
  type Recurrence,
} from "./hooks";

const FREQUENCY_NOUN: Record<Recurrence["frequency"], string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

/** "Every month" / "Every 2 weeks" -- the plural only when it earns it. */
function cadence(recurrence: Recurrence) {
  const noun = FREQUENCY_NOUN[recurrence.frequency];
  return recurrence.interval === 1
    ? `Every ${noun}`
    : `Every ${recurrence.interval} ${noun}s`;
}

function nextRunLabel(recurrence: Recurrence) {
  if (recurrence.paused) return "Paused";
  if (!recurrence.nextRunAt) return "Finished";
  return `Next ${new Date(recurrence.nextRunAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

function DeleteRecurrenceAlert({
  recurrence,
  label,
}: {
  recurrence: Recurrence;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const deleteRecurrence = useDeleteRecurrence();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete {label} repeat</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this repeat?</AlertDialogTitle>
          <AlertDialogDescription>
            It won&apos;t add anything new. Records it already created stay in
            your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteRecurrence.mutate(recurrence._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RecurrencesSection({
  initialData,
  initialLoadFailed = false,
  accounts,
  categories,
  currency,
}: {
  initialData: Recurrence[];
  initialLoadFailed?: boolean;
  accounts: Account[];
  categories: Category[];
  currency: string;
}) {
  const {
    data: recurrences,
    isError,
    isFetching,
    refetch,
  } = useRecurrences(initialData);
  const setPaused = useSetRecurrencePaused();
  const showError = initialLoadFailed || isError;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg text-foreground">Repeats</h2>
          <p className="text-sm text-muted-foreground">
            Rent, salary, subscriptions — recorded for you on schedule.
          </p>
        </div>
        {recurrences.length > 0 && (
          <RecurrenceFormDialog
            accounts={accounts}
            categories={categories}
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                Add repeat
              </Button>
            }
          />
        )}
      </div>

      {showError ? (
        <ErrorState
          title="Couldn't load your repeats"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : recurrences.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Repeat />
            </EmptyMedia>
            <EmptyTitle>No repeats yet</EmptyTitle>
            <EmptyDescription>
              Set one up for anything that happens on a schedule and stop
              typing it in every month.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <RecurrenceFormDialog
              accounts={accounts}
              categories={categories}
              trigger={<Button size="sm">Set up a repeat</Button>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recurrences.map((recurrence) => {
            const label = recurrence.description || "Untitled repeat";
            return (
              <Card
                key={recurrence._id}
                className={cn(recurrence.paused && "opacity-60")}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{label}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {cadence(recurrence)} · {nextRunLabel(recurrence)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={setPaused.isPending}
                      onClick={() =>
                        setPaused.mutate({
                          id: recurrence._id,
                          paused: !recurrence.paused,
                        })
                      }
                    >
                      {recurrence.paused ? <Play /> : <Pause />}
                      <span className="sr-only">
                        {recurrence.paused ? "Resume" : "Pause"} {label}
                      </span>
                    </Button>
                    <RecurrenceFormDialog
                      recurrence={recurrence}
                      accounts={accounts}
                      categories={categories}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <PenLine />
                          <span className="sr-only">Edit {label}</span>
                        </Button>
                      }
                    />
                    <DeleteRecurrenceAlert
                      recurrence={recurrence}
                      label={label}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <span
                    className={cn(
                      "text-sm",
                      recurrence.type === "income"
                        ? "text-positive"
                        : "text-foreground",
                    )}
                  >
                    {recurrence.type === "income" ? "+" : ""}
                    {formatCurrency(recurrence.amount, currency)}
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
