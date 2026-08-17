import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

export type Account =
  components["schemas"]["AccountListDto"]["data"]["items"][number];
export type CreateAccountInput = components["schemas"]["CreateAccountDto"];
export type UpdateAccountInput = components["schemas"]["UpdateAccountDto"];

export const ACCOUNTS_KEY = ["accounts"] as const;

export function useAccounts() {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/accounts", {
        params: { query: { limit: 100 } },
      });
      if (error || !data) {
        throw new Error("Failed to load accounts");
      }
      return data.data.items;
    },
  });
}

export function useCreateAccount() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const { data, error } = await client.POST("/accounts", {
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to create account");
      }
      return data.data;
    },
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(ACCOUNTS_KEY, (old) => [
        account,
        ...(old ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAccount() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAccountInput;
    }) => {
      const { data, error } = await client.PATCH("/accounts/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update account");
      }
      return data.data;
    },
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(
        ACCOUNTS_KEY,
        (old) => old?.map((a) => (a._id === account._id ? account : a)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteAccount() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/accounts/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete account");
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ACCOUNTS_KEY });
      const previous = queryClient.getQueryData<Account[]>(ACCOUNTS_KEY);
      queryClient.setQueryData<Account[]>(
        ACCOUNTS_KEY,
        (old) => old?.filter((a) => a._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(ACCOUNTS_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
