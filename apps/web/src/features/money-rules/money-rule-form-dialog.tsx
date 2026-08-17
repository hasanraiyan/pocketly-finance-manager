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
import type { Category } from "@/features/categories/hooks";
import {
  useCreateMoneyRule,
  useUpdateMoneyRule,
  type MoneyRule,
} from "./hooks";

export const RULE_KIND_OPTIONS: Array<{
  value: MoneyRule["kind"];
  label: string;
  /** Threshold kinds ask for an amount; digests ask for a cadence. */
  needsThreshold: boolean;
  needsCategory: boolean;
  thresholdLabel?: string;
}> = [
  {
    value: "balance_under",
    label: "Balance drops below",
    needsThreshold: true,
    needsCategory: false,
    thresholdLabel: "Floor",
  },
  {
    value: "category_over",
    label: "A category goes over",
    needsThreshold: true,
    needsCategory: true,
    thresholdLabel: "Limit",
  },
  {
    value: "large_transaction",
    label: "A single expense is bigger than",
    needsThreshold: true,
    needsCategory: false,
    thresholdLabel: "Amount",
  },
  {
    value: "weekly_summary",
    label: "Regular in-and-out summary",
    needsThreshold: false,
    needsCategory: false,
  },
  {
    value: "goal_progress",
    label: "Regular goal check-in",
    needsThreshold: false,
    needsCategory: false,
  },
];

export function MoneyRuleFormDialog({
  rule,
  expenseCategories,
  trigger,
}: {
  rule?: MoneyRule;
  expenseCategories: Category[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MoneyRule["kind"]>(
    rule?.kind ?? "balance_under",
  );
  const [threshold, setThreshold] = useState(
    rule?.threshold ? String(rule.threshold / 100) : "",
  );
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [cadenceDays, setCadenceDays] = useState(String(rule?.cadenceDays ?? 7));

  const createRule = useCreateMoneyRule();
  const updateRule = useUpdateMoneyRule();
  const isEditing = Boolean(rule);
  const pending = createRule.isPending || updateRule.isPending;
  const shape =
    RULE_KIND_OPTIONS.find((option) => option.value === kind) ??
    RULE_KIND_OPTIONS[0];

  function resetToDefaults() {
    setKind(rule?.kind ?? "balance_under");
    setThreshold(rule?.threshold ? String(rule.threshold / 100) : "");
    setCategoryId(rule?.categoryId ?? "");
    setCadenceDays(String(rule?.cadenceDays ?? 7));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      kind,
      threshold: shape.needsThreshold
        ? Math.round(parseFloat(threshold || "0") * 100)
        : null,
      categoryId: shape.needsCategory ? categoryId : null,
      cadenceDays: Number(cadenceDays) || 7,
      enabled: rule?.enabled ?? true,
    };

    if (isEditing && rule) {
      updateRule.mutate(
        { id: rule._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createRule.mutate(input, {
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
            <DialogTitle>{isEditing ? "Edit alert" : "New alert"}</DialogTitle>
            <DialogDescription>
              Pocketly checks these every few hours and tells you when
              something crosses the line.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>Tell me when</FieldLabel>
              <NativeSelect
                className="w-full"
                value={kind}
                disabled={isEditing}
                onChange={(e) => setKind(e.target.value as MoneyRule["kind"])}
              >
                {RULE_KIND_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            {shape.needsCategory && (
              <Field>
                <FieldLabel>Category</FieldLabel>
                <NativeSelect
                  className="w-full"
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <NativeSelectOption value="" disabled>
                    Select a category
                  </NativeSelectOption>
                  {expenseCategories.map((category) => (
                    <NativeSelectOption key={category._id} value={category._id}>
                      {category.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}

            {shape.needsThreshold ? (
              <Field>
                <FieldLabel>{shape.thresholdLabel}</FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="0.00"
                />
              </Field>
            ) : (
              <Field>
                <FieldLabel>How often, in days</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  required
                  value={cadenceDays}
                  onChange={(e) => setCadenceDays(e.target.value)}
                />
              </Field>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Add alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
