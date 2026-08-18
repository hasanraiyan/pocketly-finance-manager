"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

import { useAuth } from "@/lib/auth-provider";
import {
  getLocalTransactions,
  saveLocalTransaction,
  deleteLocalTransaction,
} from "@/lib/local-storage-adapter";
import { ACCOUNTS_KEY } from "../accounts/hooks";

export type Transaction =
  components["schemas"]["TransactionListDto"]["data"]["items"][number];
export type CreateTransactionInput =
  components["schemas"]["CreateTransactionDto"];
export type UpdateTransactionInput =
  components["schemas"]["UpdateTransactionDto"];

export interface TransactionFilters {
  type?: Transaction["type"];
  accountId?: string;
  categoryId?: string;
  q?: string;
}

export interface TransactionsPage {
  items: Transaction[];
  nextCursor: string | null;
}

function transactionsKey(filters: TransactionFilters) {
  return ["transactions", filters] as const;
}

export function useTransactions(
  filters: TransactionFilters,
  initialData?: TransactionsPage,
) {
  const client = usePocketlyClient();
  const { isGuest } = useAuth();

  return useQuery({
    queryKey: transactionsKey(filters),
    queryFn: async (): Promise<TransactionsPage> => {
      if (isGuest) {
        let items = (await getLocalTransactions()) as unknown as Transaction[];
        if (filters.type) {
          items = items.filter((t) => t.type === filters.type);
        }
        if (filters.accountId) {
          items = items.filter(
            (t) => t.accountId === filters.accountId || (t as { toAccountId?: string }).toAccountId === filters.accountId,
          );
        }
        if (filters.categoryId) {
          items = items.filter((t) => t.categoryId === filters.categoryId);
        }
        if (filters.q) {
          const q = filters.q.toLowerCase();
          items = items.filter((t) => t.note?.toLowerCase().includes(q));
        }
        return { items, nextCursor: null };
      }
      const { data, error } = await client.GET("/transactions", {
        params: { query: { ...filters, limit: 20 } },
      });
      if (error) throw error;
      return { items: data.data.items, nextCursor: data.data.nextCursor };
    },
    initialData,
    placeholderData: keepPreviousData,
  });
}

export function useLoadMoreTransactions(filters: TransactionFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const key = transactionsKey(filters);

  return useMutation({
    mutationFn: async (cursor: string) => {
      if (isGuest) {
        return { items: [], nextCursor: null };
      }
      const { data, error } = await client.GET("/transactions", {
        params: { query: { ...filters, cursor, limit: 20 } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (page) => {
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items: [...(old?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
    },
    onError: () => {
      toast.add({
        title: "Couldn't load more records",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useCreateTransaction(filters: TransactionFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const key = transactionsKey(filters);

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (isGuest) {
        const created = await saveLocalTransaction({
          type: input.type,
          amount: input.amount,
          date: input.date,
          categoryId: input.categoryId,
          accountId: input.accountId,
          toAccountId: input.toAccountId ?? undefined,
          note: input.note ?? undefined,
        });
        return created as unknown as Transaction;
      }
      const { data, error } = await client.POST("/transactions", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (transaction) => {
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items: [transaction, ...(old?.items ?? [])],
        nextCursor: old?.nextCursor ?? null,
      }));
      // Invalidate accounts to reflect new balance
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.add({ title: "Record added", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't add record",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useUpdateTransaction(filters: TransactionFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const key = transactionsKey(filters);

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTransactionInput;
    }) => {
      if (isGuest) {
        const updated = await saveLocalTransaction({
          _id: id,
          type: input.type ?? "expense",
          amount: input.amount ?? 0,
          date: input.date ?? new Date().toISOString(),
          categoryId: input.categoryId ?? "",
          accountId: input.accountId ?? "",
          toAccountId: input.toAccountId ?? undefined,
          note: input.note ?? undefined,
        });
        return updated as unknown as Transaction;
      }
      const { data, error } = await client.PATCH("/transactions/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (transaction) => {
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items:
          old?.items.map((t) =>
            t._id === transaction._id ? transaction : t,
          ) ?? [],
        nextCursor: old?.nextCursor ?? null,
      }));
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.add({ title: "Record updated", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update record",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteTransaction(filters: TransactionFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();
  const key = transactionsKey(filters);

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalTransaction(id);
        return;
      }
      const { error } = await client.DELETE("/transactions/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TransactionsPage>(key);
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items: old?.items.filter((t) => t._id !== id) ?? [],
        nextCursor: old?.nextCursor ?? null,
      }));
      return { previous };
    },
    onSuccess: (_void, id) => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.add({
        title: "Record deleted",
        type: "success",
        timeout: 6000,
        actionProps: {
          children: "Undo",
          onClick: async () => {
            if (isGuest) return;
            const { data, error } = await client.PATCH(
              "/transactions/{id}/restore",
              { params: { path: { id } } },
            );
            if (!error && data) {
              queryClient.setQueryData<TransactionsPage>(key, (old) => ({
                items: [data.data, ...(old?.items ?? [])],
                nextCursor: old?.nextCursor ?? null,
              }));
              toast.add({
                title: "Record restored",
                type: "success",
                timeout: 3000,
              });
            }
          },
        },
      });
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
      toast.add({
        title: "Couldn't delete record",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}

// ---------------------------------------------------------------------------
// PDF Export
// ---------------------------------------------------------------------------

/**
 * Taken straight from the generated SDK rather than restated here, so an
 * added or renamed period on the API becomes a compile error in the UI
 * instead of a 400 at runtime.
 */
export type ExportPdfInput = components["schemas"]["ExportQueryDto"];

/**
 * Queues an async PDF export job on the server.
 * The server returns 202 immediately; the PDF is emailed once generated.
 */
export function useExportPdf() {
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      const { data, error } = await client.POST("/exports/pdf", {
        body: params,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (data) => {
      toast.add({
        title: "📧 Report on its way!",
        description: data.message,
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Export failed",
        description: err.message || "Could not queue the report. Try again.",
        type: "error",
      });
    },
  });
}

/**
 * Queues an async CSV transactions export job on the server.
 * The server returns 202 immediately; the CSV file is emailed once generated.
 */
export function useExportCsv() {
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      const { data, error } = await client.POST("/exports/csv", {
        body: params,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (data) => {
      toast.add({
        title: "📧 CSV export queued!",
        description: data.message,
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "CSV export failed",
        description: err.message || "Could not queue the CSV export. Try again.",
        type: "error",
      });
    },
  });
}
