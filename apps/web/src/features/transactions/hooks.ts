"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useTransactions(
  filters: TransactionFilters,
  initialData: TransactionsPage = { items: [], nextCursor: null },
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

export interface ExportPdfInput {
  period: string;
  from?: string;
  to?: string;
}

/**
 * Queues an async PDF export job on the server.
 * The server returns 202 immediately; the PDF is emailed once generated.
 */
export function useExportPdf() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      // We use fetch directly because the SDK client doesn't handle
      // 202 responses with arbitrary JSON bodies out of the box.
      const { getStoredAuthToken } = await import("@/lib/auth-token");
      const token = getStoredAuthToken();

      const res = await fetch(`${baseUrl}/exports/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? "Export failed",
        );
      }

      return res.json() as Promise<{ jobId: string; message: string }>;
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
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      const { getStoredAuthToken } = await import("@/lib/auth-token");
      const token = getStoredAuthToken();

      const res = await fetch(`${baseUrl}/exports/csv`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? "CSV export failed",
        );
      }

      return res.json() as Promise<{ jobId: string; message: string }>;
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
