"use client";

import { useMemo, useState } from "react";
import { BellRing, PenLine, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import type { Category } from "@/features/categories/hooks";
import { MoneyRuleFormDialog } from "./money-rule-form-dialog";
import {
  useDeleteMoneyRule,
  useMoneyRules,
  useUpdateMoneyRule,
  type MoneyRule,
} from "./hooks";

/**
 * Each rule reads as one sentence rather than a row of fields. "Balance
 * drops below ₹5,000" is something a person can check at a glance; a table
 * of kind/threshold/category is something they have to decode.
 */
function describe(
  rule: MoneyRule,
  currency: string,
  categoryName: string | undefined,
): string {
  const amount = formatCurrency(rule.threshold ?? 0, currency);
  switch (rule.kind) {
    case "balance_under":
      return `Balance drops below ${amount}`;
    case "category_over":
      return `${categoryName ?? "A category"} goes over ${amount}`;
    case "large_transaction":
      return `Any single expense over ${amount}`;
    case "weekly_summary":
      return rule.cadenceDays === 7
        ? "A weekly in-and-out summary"
        : `An in-and-out summary every ${rule.cadenceDays} days`;
    case "goal_progress":
      return rule.cadenceDays === 7
        ? "A weekly goal check-in"
        : `A goal check-in every ${rule.cadenceDays} days`;
    default:
      // The API's list of kinds can grow ahead of this deploy; showing the
      // raw kind beats blanking the row.
      return rule.kind;
  }
}

function lastFiredLabel(rule: MoneyRule): string {
  if (!rule.enabled) return "Off";
  if (!rule.lastFiredAt) return "Not triggered yet";
  return `Last sent ${new Date(rule.lastFiredAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
}

function DeleteRuleAlert({ rule, label }: { rule: MoneyRule; label: string }) {
  const [open, setOpen] = useState(false);
  const deleteRule = useDeleteMoneyRule();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete alert: {label}</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll stop being told when {label.toLowerCase()}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteRule.mutate(rule._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MoneyRulesSection({
  initialData,
  initialLoadFailed = false,
  categories,
  currency,
}: {
  initialData: MoneyRule[];
  initialLoadFailed?: boolean;
  categories: Category[];
  currency: string;
}) {
  const {
    data: rules,
    isError,
    isFetching,
    refetch,
  } = useMoneyRules(initialData);
  const updateRule = useUpdateMoneyRule();
  const showError = initialLoadFailed || isError;

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c._id, c.name])),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Alerts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Told to you when it happens, instead of found when you look.
          </p>
        </div>
        {rules.length > 0 && !showError && (
          <MoneyRuleFormDialog
            expenseCategories={expenseCategories}
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                Add
              </Button>
            }
          />
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {showError ? (
          <ErrorState
            title="Couldn't load your alerts"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : rules.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellRing />
              </EmptyMedia>
              <EmptyTitle>No alerts yet</EmptyTitle>
              <EmptyDescription>
                Set one and Pocketly will tell you when your balance dips, a
                category runs over, or an unusually large expense lands.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <MoneyRuleFormDialog
                expenseCategories={expenseCategories}
                trigger={<Button size="sm">Add an alert</Button>}
              />
            </EmptyContent>
          </Empty>
        ) : (
          rules.map((rule) => {
            const label = describe(
              rule,
              currency,
              rule.categoryId
                ? categoryMap.get(rule.categoryId)
                : undefined,
            );
            return (
              <div
                key={rule._id}
                className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-sm",
                      !rule.enabled && "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lastFiredLabel(rule)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={rule.enabled}
                    aria-label={`Turn ${label} ${rule.enabled ? "off" : "on"}`}
                    onCheckedChange={(enabled) =>
                      updateRule.mutate({
                        id: rule._id,
                        input: { enabled },
                      })
                    }
                  />
                  <MoneyRuleFormDialog
                    rule={rule}
                    expenseCategories={expenseCategories}
                    trigger={
                      <Button variant="ghost" size="icon-sm">
                        <PenLine />
                        <span className="sr-only">Edit alert: {label}</span>
                      </Button>
                    }
                  />
                  <DeleteRuleAlert rule={rule} label={label} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
