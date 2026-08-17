import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { ACCOUNTS_KEY } from "@/features/accounts/hooks";

export type Transaction =
  components["schemas"]["TransactionListDto"]["data"]["items"][number];
export type CreateTransactionInput =
  components["schemas"]["CreateTransactionDto"];
export type UpdateTransactionInput =
  components["schemas"]["UpdateTransactionDto"];
export type ExportPdfInput = components["schemas"]["ExportQueryDto"];

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

export function transactionsKey(filters: TransactionFilters) {
  return ["transactions", filters] as const;
}

export function useTransactions(filters: TransactionFilters) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: transactionsKey(filters),
    queryFn: async (): Promise<TransactionsPage> => {
      const { data, error } = await client.GET("/transactions", {
        params: { query: { ...filters, limit: 25 } },
      });
      if (error || !data) {
        throw new Error("Failed to load records");
      }
      return {
        items: data.data.items,
        nextCursor: data.data.nextCursor,
      };
    },
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
        params: { query: { ...filters, cursor, limit: 25 } },
      });
      if (error || !data) {
        throw new Error("Failed to load more records");
      }
      return data.data;
    },
    onSuccess: (page) => {
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items: [...(old?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
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
      if (error || !data) {
        throw new Error("Failed to add record");
      }
      return data.data;
    },
    onSuccess: (transaction) => {
      queryClient.setQueryData<TransactionsPage>(key, (old) => ({
        items: [transaction, ...(old?.items ?? [])],
        nextCursor: old?.nextCursor ?? null,
      }));
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      if (error || !data) {
        throw new Error("Failed to update record");
      }
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
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      if (error) {
        throw new Error("Failed to delete record");
      }
      return id;
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
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useExportPdf() {
  const client = usePocketlyClient();
  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      const { data, error } = await client.POST("/exports/pdf", {
        body: params,
      });
      if (error || !data) {
        throw new Error("Failed to queue PDF report");
      }
      return data.data;
    },
  });
}

export function useExportCsv() {
  const client = usePocketlyClient();
  return useMutation({
    mutationFn: async (params: ExportPdfInput) => {
      const { data, error } = await client.POST("/exports/csv", {
        body: params,
      });
      if (error || !data) {
        throw new Error("Failed to queue CSV export");
      }
      return data.data;
    },
  });
}
