import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  deleteLocalMoneyRule,
  getLocalMoneyRules,
  saveLocalMoneyRule,
} from "@/lib/local-storage-adapter";

export type MoneyRule =
  components["schemas"]["MoneyRuleListDto"]["data"]["items"][number];
export type CreateMoneyRuleInput =
  components["schemas"]["CreateMoneyRuleDto"];
export type UpdateMoneyRuleInput =
  components["schemas"]["UpdateMoneyRuleDto"];

export const MONEY_RULES_KEY = ["money-rules"] as const;

export function useMoneyRules() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: MONEY_RULES_KEY,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalMoneyRules();
        return local as unknown as MoneyRule[];
      }

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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMoneyRuleInput) => {
      if (isGuest) {
        const saved = await saveLocalMoneyRule({
          type: input.kind,
          enabled: input.enabled ?? true,
          amount: Number(input.threshold) || undefined,
          categoryId: input.categoryId ?? undefined,
        });
        return saved as unknown as MoneyRule;
      }

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
  const { isGuest } = useAuth();
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
      if (isGuest) {
        const saved = await saveLocalMoneyRule({
          _id: id,
          type: input.kind || "balance_under",
          enabled: input.enabled ?? true,
          amount: Number(input.threshold) || undefined,
          categoryId: input.categoryId ?? undefined,
        });
        return saved as unknown as MoneyRule;
      }

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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalMoneyRule(id);
        return id;
      }

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
