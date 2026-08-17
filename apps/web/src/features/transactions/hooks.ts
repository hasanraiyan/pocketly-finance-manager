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

/**
 * `initialData` is genuinely optional. It used to default to an empty
 * page, which made react-query believe it already had results for a filter
 * it had never fetched -- so typing a search or changing a filter flashed
 * "No records found" before the real rows arrived.
 *
 * `keepPreviousData` covers the gap instead: the previous result set stays
 * on screen, dimmed by the caller via `isPlaceholderData`, until the new
 * one lands.
 */
export function useTransactions(
  filters: TransactionFilters,
  initialData?: TransactionsPage,
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: transactionsKey(filters),
    queryFn: async (): Promise<TransactionsPage> => {
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
  const key = transactionsKey(filters);
  return useMutation({
    mutationFn: async (cursor: string) => {
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
  const key = transactionsKey(filters);
  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
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
  const key = transactionsKey(filters);
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTransactionInput;
    }) => {
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
  const key = transactionsKey(filters);
  return useMutation({
    mutationFn: async (id: string) => {
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
      toast.add({
        title: "Record deleted",
        type: "success",
        timeout: 6000,
        actionProps: {
          children: "Undo",
          onClick: async () => {
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
