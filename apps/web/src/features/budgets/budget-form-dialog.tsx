"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
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
import type { Category } from "@/features/categories/hooks";
import { useCreateBudget, useUpdateBudget, type Budget } from "./hooks";

const PERIOD_OPTIONS: Array<{ value: Budget["period"]; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function BudgetFormDialog({
  budget,
  expenseCategories,
  trigger,
}: {
  budget?: Budget;
  expenseCategories: Category[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? "");
  const [amount, setAmount] = useState(
    budget ? String(budget.amount / 100) : "",
  );
  const [period, setPeriod] = useState<Budget["period"]>(
    budget?.period ?? "monthly",
  );

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const isEditing = Boolean(budget);
  const pending = createBudget.isPending || updateBudget.isPending;

  function resetToDefaults() {
    setCategoryId(budget?.categoryId ?? "");
    setAmount(budget ? String(budget.amount / 100) : "");
    setPeriod(budget?.period ?? "monthly");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      categoryId,
      amount: Math.round(parseFloat(amount || "0") * 100),
      period,
    };

    if (isEditing && budget) {
      updateBudget.mutate(
        { id: budget._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createBudget.mutate(input, {
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
            <DialogTitle>
              {isEditing ? "Edit budget" : "Create a budget"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>Category</FieldLabel>
              <NativeSelect
                className="w-full"
                required
                disabled={isEditing}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <NativeSelectOption value="" disabled>
                  Select a category
                </NativeSelectOption>
                {expenseCategories.map((c) => (
                  <NativeSelectOption key={c._id} value={c._id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Amount</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel>Period</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as Budget["period"])
                  }
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
