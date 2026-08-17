"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type Goal =
  components["schemas"]["GoalListDto"]["data"]["items"][number];
export type CreateGoalInput = components["schemas"]["CreateGoalDto"];
export type UpdateGoalInput = components["schemas"]["UpdateGoalDto"];

export const GOALS_KEY = ["goals"] as const;

export function useGoals(initialData: Goal[] = []) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/goals", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
  });
}

export function useCreateGoal() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data, error } = await client.POST("/goals", { body: input });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(GOALS_KEY, (old) => [
        goal,
        ...(old ?? []),
      ]);
      toast.add({ title: "Goal created", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't create goal",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useUpdateGoal() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateGoalInput }) => {
      const { data, error } = await client.PATCH("/goals/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(
        GOALS_KEY,
        (old) => old?.map((g) => (g._id === goal._id ? goal : g)) ?? [],
      );
      toast.add({ title: "Goal updated", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update goal",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

/**
 * Adding to and taking from a goal share a hook: the API takes a signed
 * amount, and the optimistic update would be identical either way.
 */
export function useContributeToGoal() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { data, error } = await client.POST("/goals/{id}/contributions", {
        params: { path: { id } },
        body: { amount },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (goal, { amount }) => {
      queryClient.setQueryData<Goal[]>(
        GOALS_KEY,
        (old) => old?.map((g) => (g._id === goal._id ? goal : g)) ?? [],
      );
      toast.add({
        title: amount > 0 ? "Added to your goal" : "Taken back out",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update your progress",
        description: "Check the amount and try again.",
        type: "error",
      });
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
      if (error) throw error;
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
      toast.add({
        title: "Couldn't delete goal",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
