"use client";

import { useMutation } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type UpdateProfileInput = components["schemas"]["UpdateProfileDto"];

export function useUpdateProfile() {
  const client = usePocketlyClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data, error } = await client.PATCH("/users/me", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      toast.add({
        title: "Profile updated",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update profile",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteMyAccount() {
  const client = usePocketlyClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await client.DELETE("/users/me", {
        body: { confirm: true },
      });
      if (error) throw error;
    },
    onError: () => {
      toast.add({
        title: "Couldn't delete your account",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}
