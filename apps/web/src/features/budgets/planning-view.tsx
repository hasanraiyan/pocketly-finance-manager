"use client";

import { useMemo, useState } from "react";
import { PenLine, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/features/categories/hooks";
import { BudgetFormDialog } from "./budget-form-dialog";
import { useBudgets, useDeleteBudget, type Budget } from "./hooks";

const PERIOD_LABELS: Record<Budget["period"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function DeleteBudgetAlert({ budget, name }: { budget: Budget; name: string }) {
  const [open, setOpen] = useState(false);
  const deleteBudget = useDeleteBudget();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 />
        <span className="sr-only">Delete {name} budget</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll stop tracking spending against {name}. This
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false);
              deleteBudget.mutate(budget._id);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PlanningView({
  initialData,
  categories,
  currency,
}: {
  initialData: Budget[];
  categories: Category[];
  currency: string;
}) {
  const { data: budgets } = useBudgets(initialData);
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c._id, c])),
    [categories],
  );
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Planning</h1>
          <p className="text-sm text-muted-foreground">
            Set a budget per category and see how close you are to it.
          </p>
        </div>
        <BudgetFormDialog
          expenseCategories={expenseCategories}
          trigger={
            <Button>
              <Plus />
              Create budget
            </Button>
          }
        />
      </div>

      {budgets.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target />
            </EmptyMedia>
            <EmptyTitle>No budgets yet</EmptyTitle>
            <EmptyDescription>
              Create a budget to start tracking your spending against it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <BudgetFormDialog
              expenseCategories={expenseCategories}
              trigger={<Button size="sm">Create a budget</Button>}
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const category = categoryMap.get(budget.categoryId);
            const name = category?.name ?? "Unknown category";
            return (
              <Card key={budget._id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>{name}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {PERIOD_LABELS[budget.period]}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <BudgetFormDialog
                      budget={budget}
                      expenseCategories={expenseCategories}
                      trigger={
                        <Button variant="ghost" size="icon-sm">
                          <PenLine />
                          <span className="sr-only">Edit {name} budget</span>
                        </Button>
                      }
                    />
                    <DeleteBudgetAlert budget={budget} name={name} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {formatCurrency(budget.spent, currency)} of{" "}
                      {formatCurrency(budget.amount, currency)}
                    </span>
                    <span
                      className={cn(
                        budget.percentageUsed > 100
                          ? "text-negative"
                          : "text-muted-foreground",
                      )}
                    >
                      {budget.percentageUsed}%
                    </span>
                  </div>
                  <Progress value={Math.min(budget.percentageUsed, 100)} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
