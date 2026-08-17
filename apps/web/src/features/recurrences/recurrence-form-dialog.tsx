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
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Account } from "@/features/accounts/hooks";
import type { Category } from "@/features/categories/hooks";
import {
  useCreateRecurrence,
  useUpdateRecurrence,
  type Recurrence,
} from "./hooks";

const FREQUENCY_OPTIONS: Array<{
  value: Recurrence["frequency"];
  label: string;
}> = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "monthly", label: "Month" },
  { value: "yearly", label: "Year" },
];

const TYPE_OPTIONS: Array<{ value: Recurrence["type"]; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

/** `<input type="date">` wants YYYY-MM-DD; the API speaks ISO 8601. */
function toDateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

function toIsoStart(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

export function RecurrenceFormDialog({
  recurrence,
  accounts,
  categories,
  trigger,
}: {
  recurrence?: Recurrence;
  accounts: Account[];
  categories: Category[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Recurrence["type"]>(
    recurrence?.type ?? "expense",
  );
  const [amount, setAmount] = useState(
    recurrence ? String(recurrence.amount / 100) : "",
  );
  const [description, setDescription] = useState(
    recurrence?.description ?? "",
  );
  const [accountId, setAccountId] = useState(recurrence?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(
    recurrence?.toAccountId ?? "",
  );
  const [categoryId, setCategoryId] = useState(recurrence?.categoryId ?? "");
  const [frequency, setFrequency] = useState<Recurrence["frequency"]>(
    recurrence?.frequency ?? "monthly",
  );
  const [interval, setInterval] = useState(
    recurrence ? String(recurrence.interval) : "1",
  );
  const [startDate, setStartDate] = useState(
    toDateInput(recurrence?.startDate) ||
      new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(toDateInput(recurrence?.endDate));

  const createRecurrence = useCreateRecurrence();
  const updateRecurrence = useUpdateRecurrence();
  const isEditing = Boolean(recurrence);
  const pending = createRecurrence.isPending || updateRecurrence.isPending;

  const isTransfer = type === "transfer";
  const relevantCategories = categories.filter((c) => c.type === type);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const input = {
      type,
      amount: Math.round(parseFloat(amount || "0") * 100),
      description: description || undefined,
      accountId,
      // A transfer has a destination and no category; everything else is the
      // other way round. Sending both would be rejected by the API anyway.
      toAccountId: isTransfer ? toAccountId : undefined,
      categoryId: isTransfer ? undefined : categoryId || undefined,
      frequency,
      interval: Math.max(1, parseInt(interval || "1", 10)),
      startDate: toIsoStart(startDate),
      endDate: endDate ? toIsoStart(endDate) : null,
    };

    if (isEditing && recurrence) {
      updateRecurrence.mutate(
        { id: recurrence._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createRecurrence.mutate(input, { onSuccess: () => setOpen(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit repeat" : "Set up a repeat"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Type</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as Recurrence["type"])
                  }
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
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
            </div>

            <Field>
              <FieldLabel>Description</FieldLabel>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rent, Netflix, Salary…"
              />
            </Field>

            <Field>
              <FieldLabel>{isTransfer ? "From account" : "Account"}</FieldLabel>
              <NativeSelect
                className="w-full"
                required
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <NativeSelectOption value="" disabled>
                  Select an account
                </NativeSelectOption>
                {accounts.map((a) => (
                  <NativeSelectOption key={a._id} value={a._id}>
                    {a.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            {isTransfer ? (
              <Field>
                <FieldLabel>To account</FieldLabel>
                <NativeSelect
                  className="w-full"
                  required
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                >
                  <NativeSelectOption value="" disabled>
                    Select an account
                  </NativeSelectOption>
                  {accounts
                    .filter((a) => a._id !== accountId)
                    .map((a) => (
                      <NativeSelectOption key={a._id} value={a._id}>
                        {a.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </Field>
            ) : (
              <Field>
                <FieldLabel>Category</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <NativeSelectOption value="">No category</NativeSelectOption>
                  {relevantCategories.map((c) => (
                    <NativeSelectOption key={c._id} value={c._id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Repeat every</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Period</FieldLabel>
                <NativeSelect
                  className="w-full"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as Recurrence["frequency"])
                  }
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                      {parseInt(interval || "1", 10) > 1 ? "s" : ""}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Starts</FieldLabel>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <FieldDescription>
                  The first record lands on this date.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Ends</FieldLabel>
                <Input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <FieldDescription>Leave empty to keep going.</FieldDescription>
              </Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Set up repeat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
