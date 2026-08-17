"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type Recurrence =
  components["schemas"]["RecurrenceListDto"]["data"]["items"][number];
export type CreateRecurrenceInput =
  components["schemas"]["CreateRecurrenceDto"];
export type UpdateRecurrenceInput =
  components["schemas"]["UpdateRecurrenceDto"];

export const RECURRENCES_KEY = ["recurrences"] as const;

export function useRecurrences(initialData: Recurrence[] = []) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: RECURRENCES_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/recurrences", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
  });
}

export function useCreateRecurrence() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecurrenceInput) => {
      const { data, error } = await client.POST("/recurrences", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (recurrence) => {
      queryClient.setQueryData<Recurrence[]>(RECURRENCES_KEY, (old) => [
        recurrence,
        ...(old ?? []),
      ]);
      toast.add({ title: "Repeat added", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't add this repeat",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useUpdateRecurrence() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateRecurrenceInput;
    }) => {
      const { data, error } = await client.PATCH("/recurrences/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (recurrence) => {
      queryClient.setQueryData<Recurrence[]>(
        RECURRENCES_KEY,
        (old) =>
          old?.map((r) => (r._id === recurrence._id ? recurrence : r)) ?? [],
      );
      toast.add({ title: "Repeat updated", type: "success", timeout: 3000 });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update this repeat",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

/**
 * Pause and resume share a hook because they are the same user intent seen
 * from two sides, and the optimistic update is identical.
 */
export function useSetRecurrencePaused() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paused }: { id: string; paused: boolean }) => {
      const path = paused
        ? ("/recurrences/{id}/pause" as const)
        : ("/recurrences/{id}/resume" as const);
      const { data, error } = await client.POST(path, {
        params: { path: { id } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (recurrence) => {
      queryClient.setQueryData<Recurrence[]>(
        RECURRENCES_KEY,
        (old) =>
          old?.map((r) => (r._id === recurrence._id ? recurrence : r)) ?? [],
      );
      toast.add({
        title: recurrence.paused ? "Repeat paused" : "Repeat resumed",
        description: recurrence.paused
          ? "It won't add anything until you resume it."
          : undefined,
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't change this repeat",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteRecurrence() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/recurrences/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: RECURRENCES_KEY });
      const previous =
        queryClient.getQueryData<Recurrence[]>(RECURRENCES_KEY);
      queryClient.setQueryData<Recurrence[]>(
        RECURRENCES_KEY,
        (old) => old?.filter((r) => r._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(RECURRENCES_KEY, context.previous);
      }
      toast.add({
        title: "Couldn't delete this repeat",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
