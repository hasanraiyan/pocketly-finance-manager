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
  useCreateCategory,
  useUpdateCategory,
  type Category,
} from "./hooks";

export function CategoryFormDialog({
  category,
  defaultType,
  trigger,
}: {
  category?: Category;
  defaultType?: Category["type"];
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<Category["type"]>(
    category?.type ?? defaultType ?? "expense",
  );

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const nameId = useId();
  const isEditing = Boolean(category);
  const pending = createCategory.isPending || updateCategory.isPending;

  function resetToDefaults() {
    setName(category?.name ?? "");
    setType(category?.type ?? defaultType ?? "expense");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEditing && category) {
      updateCategory.mutate(
        { id: category._id, input: { name, type } },
        { onSuccess: () => setOpen(false) },
      );
    } else {
      createCategory.mutate(
        { name, type },
        {
          onSuccess: () => {
            setOpen(false);
            resetToDefaults();
          },
        },
      );
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
              {isEditing ? "Edit category" : "Add a category"}
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
                placeholder="Groceries"
              />
            </Field>
            <Field>
              <FieldLabel>Type</FieldLabel>
              <NativeSelect
                className="w-full"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as Category["type"])
                }
              >
                <NativeSelectOption value="expense">
                  Expense
                </NativeSelectOption>
                <NativeSelectOption value="income">Income</NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="size-3.5" />}
              {isEditing ? "Save changes" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
