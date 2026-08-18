"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

import { useAuth } from "@/lib/auth-provider";
import {
  getLocalBudgets,
  saveLocalBudget,
  deleteLocalBudget,
} from "@/lib/local-storage-adapter";

export type Budget =
  components["schemas"]["BudgetListDto"]["data"]["items"][number];
export type CreateBudgetInput = components["schemas"]["CreateBudgetDto"];
export type UpdateBudgetInput = components["schemas"]["UpdateBudgetDto"];

export const BUDGETS_KEY = ["budgets"] as const;

export function useBudgets(initialData: Budget[] = []) {
  const client = usePocketlyClient();
  const { isGuest } = useAuth();

  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalBudgets();
        return local as unknown as Budget[];
      }
      const { data, error } = await client.GET("/budgets", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
  });
}

export function useCreateBudget() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      if (isGuest) {
        const created = await saveLocalBudget({
          categoryId: input.categoryId,
          amount: input.amount,
          period: (input.period as any) ?? "monthly",
        });
        return created as unknown as Budget;
      }
      const { data, error } = await client.POST("/budgets", { body: input });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (budget) => {
      queryClient.setQueryData<Budget[]>(BUDGETS_KEY, (old) => [
        budget,
        ...(old ?? []),
      ]);
      toast.add({ title: "Budget created", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't create budget",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useUpdateBudget() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBudgetInput;
    }) => {
      if (isGuest) {
        const updated = await saveLocalBudget({
          _id: id,
          categoryId: input.categoryId ?? "",
          amount: input.amount ?? 0,
          period: (input.period as any) ?? "monthly",
        });
        return updated as unknown as Budget;
      }
      const { data, error } = await client.PATCH("/budgets/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (budget) => {
      queryClient.setQueryData<Budget[]>(
        BUDGETS_KEY,
        (old) => old?.map((b) => (b._id === budget._id ? budget : b)) ?? [],
      );
      toast.add({ title: "Budget updated", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update budget",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteBudget() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalBudget(id);
        return;
      }
      const { error } = await client.DELETE("/budgets/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: BUDGETS_KEY });
      const previous = queryClient.getQueryData<Budget[]>(BUDGETS_KEY);
      queryClient.setQueryData<Budget[]>(
        BUDGETS_KEY,
        (old) => old?.filter((b) => b._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(BUDGETS_KEY, context.previous);
      }
      toast.add({
        title: "Couldn't delete budget",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
