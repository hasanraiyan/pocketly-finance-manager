"use client";

import { useMemo, useState } from "react";
import { Filter, PenLine, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ErrorState } from "@/components/error-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Account } from "@/features/accounts/hooks";
import type { Category } from "@/features/categories/hooks";
import { TransactionFormDialog } from "./transaction-form-dialog";
import {
  useDeleteTransaction,
  useLoadMoreTransactions,
  useTransactions,
  type Transaction,
  type TransactionFilters,
  type TransactionsPage,
} from "./hooks";

const TYPE_FILTER_OPTIONS: Array<{
  value: Transaction["type"] | "";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function TypeFilterPills({
  value,
  onChange,
}: {
  value: Transaction["type"] | "";
  onChange: (value: Transaction["type"] | "") => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter by type"
      className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scrollbar-none"
    >
      {TYPE_FILTER_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value || "all"}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "h-8 shrink-0 snap-start rounded-full border px-3.5 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MobileFilterPopover({
  type,
  onTypeChange,
  accountId,
  onAccountChange,
  accounts,
}: {
  type: Transaction["type"] | "";
  onTypeChange: (value: Transaction["type"] | "") => void;
  accountId: string;
  onAccountChange: (value: string) => void;
  accounts: Account[];
}) {
  const activeCount = (type ? 1 : 0) + (accountId ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              activeCount > 0
                ? `Filters (${activeCount} active)`
                : "Filter records"
            }
            className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-input bg-transparent text-foreground outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        }
      >
        <Filter className="size-4" />
        {activeCount > 0 && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Type
            </span>
            <TypeFilterPills value={type} onChange={onTypeChange} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Account
            </span>
            <NativeSelect
              className="w-full"
              value={accountId}
              onChange={(e) => onAccountChange(e.target.value)}
            >
              <NativeSelectOption value="">All accounts</NativeSelectOption>
              {accounts.map((a) => (
                <NativeSelectOption key={a._id} value={a._id}>
                  {a.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RecordsView({
  initialData,
  initialLoadFailed = false,
  accounts,
  categories,
  currency,
}: {
  initialData: TransactionsPage;
  initialLoadFailed?: boolean;
  accounts: Account[];
  categories: Category[];
  currency: string;
}) {
  const [type, setType] = useState<Transaction["type"] | "">("");
  const [accountId, setAccountId] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const filters: TransactionFilters = useMemo(
    () => ({
      type: type || undefined,
      accountId: accountId || undefined,
      q: q || undefined,
    }),
    [type, accountId, q],
  );

  const isDefaultFilters = !type && !accountId && !q;
  const { data, isError, isFetching, refetch } = useTransactions(
    filters,
    isDefaultFilters ? initialData : undefined,
  );
  const showError = (isDefaultFilters && initialLoadFailed) || isError;
  const deleteTransaction = useDeleteTransaction(filters);
  const loadMore = useLoadMoreTransactions(filters);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a._id, a])),
    [accounts],
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c._id, c])),
    [categories],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Records</h1>
          <p className="text-sm text-muted-foreground">
            Every income, expense, and transfer you&apos;ve logged.
          </p>
        </div>
        <TransactionFormDialog
          filters={filters}
          accountsInitialData={accounts}
          categoriesInitialData={categories}
          trigger={
            <Button className="hidden md:inline-flex">
              <Plus />
              Add record
            </Button>
          }
        />
      </div>

      {/* The empty-state CTA below already covers "add your first record" --
          skip the FAB there so mobile doesn't show two add affordances. */}
      {!(isDefaultFilters && data.items.length === 0 && !showError) && (
        <TransactionFormDialog
          filters={filters}
          accountsInitialData={accounts}
          categoriesInitialData={categories}
          trigger={
            <Button
              aria-label="Add record"
              className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 size-14 rounded-full shadow-lg md:hidden [&_svg:not([class*='size-'])]:size-6"
            >
              <Plus />
            </Button>
          }
        />
      )}

      <div className="hidden items-center justify-between gap-3 md:flex">
        <TypeFilterPills value={type} onChange={setType} />
        <div className="flex items-center gap-3">
          <NativeSelect
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <NativeSelectOption value="">All accounts</NativeSelectOption>
            {accounts.map((a) => (
              <NativeSelectOption key={a._id} value={a._id}>
                {a.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setQ(qInput);
            }}
            onBlur={() => setQ(qInput)}
            placeholder="Search description..."
            className="w-48"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQ(qInput);
          }}
          onBlur={() => setQ(qInput)}
          placeholder="Search description..."
          className="flex-1"
        />
        <MobileFilterPopover
          type={type}
          onTypeChange={setType}
          accountId={accountId}
          onAccountChange={setAccountId}
          accounts={accounts}
        />
      </div>

      {showError ? (
        <ErrorState
          title="Couldn't load your records"
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : data.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>No records found</EmptyTitle>
            <EmptyDescription>
              {isDefaultFilters
                ? "Add your first record to see it here."
                : "Try a different filter or search term."}
            </EmptyDescription>
          </EmptyHeader>
          {isDefaultFilters && (
            <EmptyContent>
              <TransactionFormDialog
                filters={filters}
                accountsInitialData={accounts}
                categoriesInitialData={categories}
                trigger={<Button size="sm">Add a record</Button>}
              />
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <>
          <ul className="divide-y divide-border md:hidden">
            {data.items.map((tx) => {
              const category = tx.categoryId
                ? categoryMap.get(tx.categoryId)
                : undefined;
              const account = accountMap.get(tx.accountId);
              const toAccount = tx.toAccountId
                ? accountMap.get(tx.toAccountId)
                : undefined;
              return (
                <li key={tx._id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-foreground">
                        {tx.description ||
                          category?.name ||
                          (tx.type === "transfer" ? "Transfer" : tx.type)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(tx.date)}
                        {category && ` · ${category.name}`}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm tabular-nums",
                        tx.type === "expense" && "text-negative",
                        tx.type === "income" && "text-positive",
                      )}
                    >
                      {tx.type === "expense"
                        ? "-"
                        : tx.type === "income"
                          ? "+"
                          : ""}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {account?.name ?? "—"}
                      {toAccount && ` → ${toAccount.name}`}
                    </span>
                    <div className="-mr-2 flex shrink-0 gap-1">
                      <TransactionFormDialog
                        transaction={tx}
                        filters={filters}
                        accountsInitialData={accounts}
                        categoriesInitialData={categories}
                        trigger={
                          <Button variant="ghost" size="icon-sm">
                            <PenLine />
                            <span className="sr-only">Edit record</span>
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteTransaction.mutate(tx._id)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete record</span>
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((tx) => {
                const category = tx.categoryId
                  ? categoryMap.get(tx.categoryId)
                  : undefined;
                const account = accountMap.get(tx.accountId);
                const toAccount = tx.toAccountId
                  ? accountMap.get(tx.toAccountId)
                  : undefined;
                return (
                  <TableRow key={tx._id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <div className="flex flex-col">
                        <span>
                          {tx.description ||
                            category?.name ||
                            (tx.type === "transfer" ? "Transfer" : tx.type)}
                        </span>
                        {category && (
                          <span className="text-xs text-muted-foreground">
                            {category.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {account?.name ?? "—"}
                      {toAccount && ` → ${toAccount.name}`}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        tx.type === "expense" && "text-negative",
                        tx.type === "income" && "text-positive",
                      )}
                    >
                      {tx.type === "expense"
                        ? "-"
                        : tx.type === "income"
                          ? "+"
                          : ""}
                      {formatCurrency(tx.amount, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <TransactionFormDialog
                          transaction={tx}
                          filters={filters}
                          accountsInitialData={accounts}
                          categoriesInitialData={categories}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <PenLine />
                              <span className="sr-only">Edit record</span>
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => deleteTransaction.mutate(tx._id)}
                        >
                          <Trash2 />
                          <span className="sr-only">Delete record</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {data.nextCursor && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={loadMore.isPending}
                onClick={() => loadMore.mutate(data.nextCursor as string)}
              >
                {loadMore.isPending && <Spinner className="size-3.5" />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
