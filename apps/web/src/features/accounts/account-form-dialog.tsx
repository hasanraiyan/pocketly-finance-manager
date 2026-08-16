"use client";

import { useId, useState, type ReactNode } from "react";
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
import {
  useCreateAccount,
  useUpdateAccount,
  type Account,
} from "./hooks";

const ACCOUNT_TYPE_OPTIONS: Array<{ value: Account["type"]; label: string }> =
  [
    { value: "bank", label: "Bank" },
    { value: "cash", label: "Cash" },
    { value: "savings", label: "Savings" },
    { value: "upi", label: "UPI" },
    { value: "credit_card", label: "Credit card" },
    { value: "wallet", label: "Wallet" },
  ];

export function AccountFormDialog({
  account,
  trigger,
}: {
  account?: Account;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<Account["type"]>(
    account?.type ?? "bank",
  );
  const [balance, setBalance] = useState(
    account ? String(account.initialBalance / 100) : "0",
  );
  const [currency, setCurrency] = useState(account?.currency ?? "INR");

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const nameId = useId();
  const isEditing = Boolean(account);
  const pending = createAccount.isPending || updateAccount.isPending;

  function resetToDefaults() {
    setName(account?.name ?? "");
    setType(account?.type ?? "bank");
    setBalance(account ? String(account.initialBalance / 100) : "0");
    setCurrency(account?.currency ?? "INR");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      name,
      type,
      initialBalance: Math.round(parseFloat(balance || "0") * 100),
      currency: currency.toUpperCase(),
    };

    if (isEditing && account) {
      updateAccount.mutate(
        { id: account._id, input },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createAccount.mutate(input, {
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
              {isEditing ? "Edit account" : "Add an account"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor={nameId}>Name</FieldLabel>
              <Input
                id={nameId}
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="HDFC Savings"
              />
            </Field>

            <Field>
              <FieldLabel>Type</FieldLabel>
              <NativeSelect
                className="w-full"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as Account["type"])
                }
              >
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <NativeSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>
                  {isEditing ? "Starting balance" : "Opening balance"}
                </FieldLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Currency</FieldLabel>
                <Input
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="uppercase"
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
