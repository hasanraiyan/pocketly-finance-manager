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

export function moneyRulesKey(isGuest = false, userId?: string) {
  return ["money-rules", isGuest, userId ?? "anon"] as const;
}

export function useMoneyRules() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const key = moneyRulesKey(isGuest, user?._id);

  return useQuery({
    queryKey: key,
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
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = moneyRulesKey(isGuest, user?._id);

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
      queryClient.setQueryData<MoneyRule[]>(key, (old) => [
        rule,
        ...(old ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["money-rules"] });
    },
  });
}

export function useUpdateMoneyRule() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = moneyRulesKey(isGuest, user?._id);

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
        key,
        (old) => old?.map((r) => (r._id === rule._id ? rule : r)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["money-rules"] });
    },
  });
}

export function useDeleteMoneyRule() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = moneyRulesKey(isGuest, user?._id);

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
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MoneyRule[]>(key);
      queryClient.setQueryData<MoneyRule[]>(
        key,
        (old) => old?.filter((r) => r._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["money-rules"] });
    },
  });
}
