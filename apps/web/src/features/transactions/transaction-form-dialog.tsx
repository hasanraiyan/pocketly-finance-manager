"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Account } from "@/features/accounts/hooks";
import { useAccounts } from "@/features/accounts/hooks";
import {
  useCategories,
  useCreateCategory,
  type Category,
} from "@/features/categories/hooks";
import {
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
  type TransactionFilters,
} from "./hooks";

const TYPE_OPTIONS: Array<{ value: Transaction["type"]; label: string }> = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function toDateInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function TransactionFormDialog({
  transaction,
  filters,
  accountsInitialData,
  categoriesInitialData,
  trigger,
}: {
  transaction?: Transaction;
  filters: TransactionFilters;
  accountsInitialData: Account[];
  categoriesInitialData: Category[];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Transaction["type"]>(
    transaction?.type ?? "expense",
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount / 100) : "",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [note, setNote] = useState(transaction?.note ?? "");
  const [accountId, setAccountId] = useState(transaction?.accountId ?? "");
  const [toAccountId, setToAccountId] = useState(
    transaction?.toAccountId ?? "",
  );
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [date, setDate] = useState(toDateInputValue(transaction?.date));
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const { data: accounts } = useAccounts(accountsInitialData);
  const { data: categories } = useCategories(categoriesInitialData);
  const createCategory = useCreateCategory();
  const createTransaction = useCreateTransaction(filters);
  const updateTransaction = useUpdateTransaction(filters);
  const nameId = useId();

  const isEditing = Boolean(transaction);
  const pending = createTransaction.isPending || updateTransaction.isPending;

  const relevantCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  function resetToDefaults() {
    setType(transaction?.type ?? "expense");
    setAmount(transaction ? String(transaction.amount / 100) : "");
    setDescription(transaction?.description ?? "");
    setNote(transaction?.note ?? "");
    setAccountId(transaction?.accountId ?? "");
    setToAccountId(transaction?.toAccountId ?? "");
    setCategoryId(transaction?.categoryId ?? "");
    setDate(toDateInputValue(transaction?.date));
    setAddingCategory(false);
    setNewCategoryName("");
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    createCategory.mutate(
      { name: newCategoryName.trim(), type: type === "income" ? "income" : "expense" },
      {
        onSuccess: (category) => {
          setCategoryId(category._id);
          setAddingCategory(false);
          setNewCategoryName("");
        },
      },
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      type,
      amount: Math.round(parseFloat(amount || "0") * 100),
      description: description || undefined,
      note: note || undefined,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      categoryId: type === "transfer" ? undefined : categoryId,
      date: new Date(date).toISOString(),
    };

    if (isEditing && transaction) {
      updateTransaction.mutate(
        { id: transaction._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createTransaction.mutate(input, {
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
              {isEditing ? "Edit record" : "Add a record"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel>Type</FieldLabel>
              <NativeSelect
                className="w-full"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as Transaction["type"]);
                  setCategoryId("");
                }}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor={nameId}>Amount</FieldLabel>
                <Input
                  id={nameId}
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
                <FieldLabel>Date</FieldLabel>
                <Input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel>
                {type === "transfer" ? "From account" : "Account"}
              </FieldLabel>
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

            {type === "transfer" ? (
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
                {addingCategory ? (
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={createCategory.isPending}
                      onClick={handleAddCategory}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingCategory(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <NativeSelect
                    className="w-full"
                    required
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setAddingCategory(true);
                      } else {
                        setCategoryId(e.target.value);
                      }
                    }}
                  >
                    <NativeSelectOption value="" disabled>
                      Select a category
                    </NativeSelectOption>
                    {relevantCategories.map((c) => (
                      <NativeSelectOption key={c._id} value={c._id}>
                        {c.name}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value="__new__">
                      + Add new category
                    </NativeSelectOption>
                  </NativeSelect>
                )}
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor={`${nameId}-desc`}>
                Description (optional)
              </FieldLabel>
              <Input
                id={`${nameId}-desc`}
                maxLength={200}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Groceries, rent, salary..."
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`${nameId}-note`}>
                Note (optional)
              </FieldLabel>
              <Textarea
                id={`${nameId}-note`}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Add record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
