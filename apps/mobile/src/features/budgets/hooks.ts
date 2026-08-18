import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  deleteLocalBudget,
  getLocalBudgets,
  saveLocalBudget,
} from "@/lib/local-storage-adapter";

export type Budget =
  components["schemas"]["BudgetListDto"]["data"]["items"][number];
export type CreateBudgetInput = components["schemas"]["CreateBudgetDto"];
export type UpdateBudgetInput = components["schemas"]["UpdateBudgetDto"];

export const BUDGETS_KEY = ["budgets"] as const;

export function useBudgets() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

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
      if (error || !data) {
        throw new Error("Failed to load budgets");
      }
      return data.data.items;
    },
  });
}

export function useCreateBudget() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      if (isGuest) {
        const saved = await saveLocalBudget({
          categoryId: input.categoryId,
          amount: Number(input.amount) || 0,
          period: (input.period as "monthly" | "weekly" | "yearly") || "monthly",
        });
        return saved as unknown as Budget;
      }

      const { data, error } = await client.POST("/budgets", { body: input });
      if (error || !data) {
        throw new Error("Failed to create budget");
      }
      return data.data;
    },
    onSuccess: (budget) => {
      queryClient.setQueryData<Budget[]>(BUDGETS_KEY, (old) => [
        budget,
        ...(old ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateBudget() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateBudgetInput;
    }) => {
      if (isGuest) {
        const saved = await saveLocalBudget({
          _id: id,
          categoryId: input.categoryId || "",
          amount: Number(input.amount) || 0,
          period: (input.period as "monthly" | "weekly" | "yearly") || "monthly",
        });
        return saved as unknown as Budget;
      }

      const { data, error } = await client.PATCH("/budgets/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update budget");
      }
      return data.data;
    },
    onSuccess: (budget) => {
      queryClient.setQueryData<Budget[]>(
        BUDGETS_KEY,
        (old) => old?.map((b) => (b._id === budget._id ? budget : b)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBudget() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalBudget(id);
        return id;
      }

      const { error } = await client.DELETE("/budgets/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete budget");
      }
      return id;
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
