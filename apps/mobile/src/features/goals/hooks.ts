import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  contributeLocalGoal,
  deleteLocalGoal,
  getLocalGoals,
  saveLocalGoal,
} from "@/lib/local-storage-adapter";

export type Goal =
  components["schemas"]["GoalListDto"]["data"]["items"][number];
export type CreateGoalInput = components["schemas"]["CreateGoalDto"];
export type UpdateGoalInput = components["schemas"]["UpdateGoalDto"];

export const GOALS_KEY = ["goals"] as const;

export function useGoals() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalGoals();
        return local as unknown as Goal[];
      }

      const { data, error } = await client.GET("/goals", {
        params: { query: { limit: 100 } },
      });
      if (error || !data) {
        throw new Error("Failed to load goals");
      }
      return data.data.items;
    },
  });
}

export function useCreateGoal() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (isGuest) {
        const saved = await saveLocalGoal({
          name: input.name,
          targetAmount: Number(input.targetAmount) || 0,
          savedAmount: 0,
          status: "in_progress",
          targetDate: input.targetDate ?? undefined,
        });
        return saved as unknown as Goal;
      }

      const { data, error } = await client.POST("/goals", { body: input });
      if (error || !data) {
        throw new Error("Failed to create goal");
      }
      return data.data;
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(GOALS_KEY, (old) => [
        goal,
        ...(old ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateGoal() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateGoalInput;
    }) => {
      if (isGuest) {
        const saved = await saveLocalGoal({
          _id: id,
          name: input.name || "Goal",
          targetAmount: Number(input.targetAmount) || 0,
          savedAmount: 0,
          status: (input.kind === "debt_payoff" ? "in_progress" : "in_progress"),
          targetDate: input.targetDate ?? undefined,
        });
        return saved as unknown as Goal;
      }

      const { data, error } = await client.PATCH("/goals/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update goal");
      }
      return data.data;
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(
        GOALS_KEY,
        (old) => old?.map((g) => (g._id === goal._id ? goal : g)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useContributeToGoal() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
    }: {
      id: string;
      amount: number;
    }) => {
      if (isGuest) {
        const updated = await contributeLocalGoal(id, amount);
        return updated as unknown as Goal;
      }

      const { data, error } = await client.POST("/goals/{id}/contributions", {
        params: { path: { id } },
        body: { amount },
      });
      if (error || !data) {
        throw new Error("Failed to update goal contribution");
      }
      return data.data;
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(
        GOALS_KEY,
        (old) => old?.map((g) => (g._id === goal._id ? goal : g)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteGoal() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalGoal(id);
        return id;
      }

      const { error } = await client.DELETE("/goals/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete goal");
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: GOALS_KEY });
      const previous = queryClient.getQueryData<Goal[]>(GOALS_KEY);
      queryClient.setQueryData<Goal[]>(
        GOALS_KEY,
        (old) => old?.filter((g) => g._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(GOALS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
