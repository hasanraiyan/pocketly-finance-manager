"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

import { useAuth } from "@/lib/auth-provider";
import {
  getLocalAccounts,
  saveLocalAccount,
  deleteLocalAccount,
} from "@/lib/local-storage-adapter";

export type Account =
  components["schemas"]["AccountListDto"]["data"]["items"][number];
export type CreateAccountInput = components["schemas"]["CreateAccountDto"];
export type UpdateAccountInput = components["schemas"]["UpdateAccountDto"];

export const ACCOUNTS_KEY = ["accounts"] as const;

export function useAccounts(initialData: Account[] = []) {
  const client = usePocketlyClient();
  const { isGuest } = useAuth();

  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalAccounts();
        return local as unknown as Account[];
      }
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
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      if (isGuest) {
        const created = await saveLocalAccount({
          name: input.name,
          type: input.type,
          balance: (input as { initialBalance?: number; balance?: number }).initialBalance ?? (input as { initialBalance?: number; balance?: number }).balance ?? 0,
          currency: input.currency ?? "USD",
          icon: input.icon,
        });
        return created as unknown as Account;
      }
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
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAccountInput;
    }) => {
      if (isGuest) {
        const updated = await saveLocalAccount({
          _id: id,
          name: input.name ?? "Account",
          type: input.type ?? "bank",
          balance: (input as { initialBalance?: number; balance?: number }).initialBalance ?? (input as { initialBalance?: number; balance?: number }).balance ?? 0,
          currency: input.currency ?? "USD",
          icon: input.icon,
        });
        return updated as unknown as Account;
      }
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
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalAccount(id);
        return;
      }
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
