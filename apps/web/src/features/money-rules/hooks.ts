"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type MoneyRule =
  components["schemas"]["MoneyRuleListDto"]["data"]["items"][number];
export type CreateMoneyRuleInput =
  components["schemas"]["CreateMoneyRuleDto"];
export type UpdateMoneyRuleInput =
  components["schemas"]["UpdateMoneyRuleDto"];

export const MONEY_RULES_KEY = ["money-rules"] as const;

export function useMoneyRules(initialData: MoneyRule[] = []) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: MONEY_RULES_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/money-rules", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
  });
}

export function useCreateMoneyRule() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMoneyRuleInput) => {
      const { data, error } = await client.POST("/money-rules", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (rule) => {
      queryClient.setQueryData<MoneyRule[]>(MONEY_RULES_KEY, (old) => [
        rule,
        ...(old ?? []),
      ]);
      toast.add({ title: "Alert added", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't add this alert",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

/**
 * Editing and the enable/disable switch share a hook: the switch is a patch
 * of one field, and giving it its own mutation would duplicate the cache
 * write for no gain.
 */
export function useUpdateMoneyRule() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateMoneyRuleInput;
    }) => {
      const { data, error } = await client.PATCH("/money-rules/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (rule) => {
      queryClient.setQueryData<MoneyRule[]>(
        MONEY_RULES_KEY,
        (old) => old?.map((r) => (r._id === rule._id ? rule : r)) ?? [],
      );
    },
    onError: () => {
      toast.add({
        title: "Couldn't change this alert",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteMoneyRule() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/money-rules/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: MONEY_RULES_KEY });
      const previous =
        queryClient.getQueryData<MoneyRule[]>(MONEY_RULES_KEY);
      queryClient.setQueryData<MoneyRule[]>(
        MONEY_RULES_KEY,
        (old) => old?.filter((r) => r._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(MONEY_RULES_KEY, context.previous);
      }
      toast.add({
        title: "Couldn't delete this alert",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
