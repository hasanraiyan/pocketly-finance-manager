import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import { ACCOUNTS_KEY } from "@/features/accounts/hooks";
import {
  deleteLocalTransaction,
  getLocalTransactions,
  saveLocalTransaction,
} from "@/lib/local-storage-adapter";

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

export function transactionsKey(filters: TransactionFilters, isGuest = false, userId?: string) {
  return ["transactions", filters, isGuest, userId ?? "anon"] as const;
}

function sanitizeQuery(filters: TransactionFilters, limit = 25, cursor?: string) {
  const query: Record<string, any> = { limit };
  if (filters.type) query.type = filters.type;
  if (filters.accountId && filters.accountId.trim()) query.accountId = filters.accountId.trim();
  if (filters.categoryId && filters.categoryId.trim()) query.categoryId = filters.categoryId.trim();
  if (filters.q && filters.q.trim()) query.q = filters.q.trim();
  if (cursor) query.cursor = cursor;
  return query;
}

export function useTransactions(filters: TransactionFilters) {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const key = transactionsKey(filters, isGuest, user?._id);

  return useQuery({
    queryKey: key,
    queryFn: async (): Promise<TransactionsPage> => {
      if (isGuest) {
        let items = await getLocalTransactions();
        if (filters.type) items = items.filter((t) => t.type === filters.type);
        if (filters.accountId) items = items.filter((t) => t.accountId === filters.accountId);
        if (filters.categoryId) items = items.filter((t) => t.categoryId === filters.categoryId);
        if (filters.q) {
          const q = filters.q.toLowerCase().trim();
          items = items.filter(
            (t) =>
              t.note?.toLowerCase().includes(q) ||
              t.description?.toLowerCase().includes(q)
          );
        }
        return {
          items: items as unknown as Transaction[],
          nextCursor: null,
        };
      }

      const { data, error } = await client.GET("/transactions", {
        params: { query: sanitizeQuery(filters, 25) as any },
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
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = transactionsKey(filters, isGuest, user?._id);

  return useMutation({
    mutationFn: async (cursor: string) => {
      if (isGuest) return { items: [], nextCursor: null };
      const { data, error } = await client.GET("/transactions", {
        params: { query: sanitizeQuery(filters, 25, cursor) as any },
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

export function useCreateTransaction(filters: TransactionFilters = {}) {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = transactionsKey(filters, isGuest, user?._id);

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (isGuest) {
        const saved = await saveLocalTransaction({
          type: input.type as "income" | "expense" | "transfer",
          amount: Number(input.amount) || 0,
          date: input.date || new Date().toISOString(),
          categoryId: input.categoryId || "",
          accountId: input.accountId || "",
          toAccountId: input.toAccountId,
          note: input.note,
        });
        return saved as unknown as Transaction;
      }

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

export function useUpdateTransaction(filters: TransactionFilters = {}) {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = transactionsKey(filters, isGuest, user?._id);

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateTransactionInput;
    }) => {
      if (isGuest) {
        const saved = await saveLocalTransaction({
          _id: id,
          type: input.type as "income" | "expense" | "transfer",
          amount: Number(input.amount) || 0,
          date: input.date || new Date().toISOString(),
          categoryId: input.categoryId || "",
          accountId: input.accountId || "",
          toAccountId: input.toAccountId,
          note: input.note,
        });
        return saved as unknown as Transaction;
      }

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteTransaction(filters: TransactionFilters = {}) {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = transactionsKey(filters, isGuest, user?._id);

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalTransaction(id);
        return id;
      }

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
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
