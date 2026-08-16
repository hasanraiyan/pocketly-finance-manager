"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type Account =
  components["schemas"]["AccountListDto"]["data"]["items"][number];
export type CreateAccountInput = components["schemas"]["CreateAccountDto"];
export type UpdateAccountInput = components["schemas"]["UpdateAccountDto"];

export const ACCOUNTS_KEY = ["accounts"] as const;

export function useAccounts(initialData: Account[] = []) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/accounts", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
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
      if (error) throw error;
      return data.data;
    },
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(ACCOUNTS_KEY, (old) => [
        account,
        ...(old ?? []),
      ]);
      toast.add({ title: "Account created", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't create account",
        description: "Try again in a moment.",
        type: "error",
      });
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
      if (error) throw error;
      return data.data;
    },
    onSuccess: (account) => {
      queryClient.setQueryData<Account[]>(
        ACCOUNTS_KEY,
        (old) => old?.map((a) => (a._id === account._id ? account : a)) ?? [],
      );
      toast.add({ title: "Account updated", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update account",
        description: "Try again in a moment.",
        type: "error",
      });
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
      if (error) throw error;
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
      toast.add({
        title: "Couldn't delete account",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
