import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

export type MoneyRule =
  components["schemas"]["MoneyRuleListDto"]["data"]["items"][number];
export type CreateMoneyRuleInput =
  components["schemas"]["CreateMoneyRuleDto"];
export type UpdateMoneyRuleInput =
  components["schemas"]["UpdateMoneyRuleDto"];

export const MONEY_RULES_KEY = ["money-rules"] as const;

export function useMoneyRules() {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: MONEY_RULES_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/money-rules", {
        params: { query: { limit: 100 } },
      });
      if (error || !data) {
        throw new Error("Failed to load alerts");
      }
      return data.data.items;
    },
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
      if (error || !data) {
        throw new Error("Failed to create alert rule");
      }
      return data.data;
    },
    onSuccess: (rule) => {
      queryClient.setQueryData<MoneyRule[]>(MONEY_RULES_KEY, (old) => [
        rule,
        ...(old ?? []),
      ]);
    },
  });
}

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
      if (error || !data) {
        throw new Error("Failed to update alert rule");
      }
      return data.data;
    },
    onSuccess: (rule) => {
      queryClient.setQueryData<MoneyRule[]>(
        MONEY_RULES_KEY,
        (old) => old?.map((r) => (r._id === rule._id ? rule : r)) ?? [],
      );
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
      if (error) {
        throw new Error("Failed to delete alert rule");
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: MONEY_RULES_KEY });
      const previous = queryClient.getQueryData<MoneyRule[]>(MONEY_RULES_KEY);
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: MONEY_RULES_KEY });
    },
  });
}
