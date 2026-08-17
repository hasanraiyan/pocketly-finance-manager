import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

export type Goal =
  components["schemas"]["GoalListDto"]["data"]["items"][number];
export type CreateGoalInput = components["schemas"]["CreateGoalDto"];
export type UpdateGoalInput = components["schemas"]["UpdateGoalDto"];

export const GOALS_KEY = ["goals"] as const;

export function useGoals() {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: async () => {
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
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
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
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
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
