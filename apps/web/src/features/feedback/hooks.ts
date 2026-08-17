"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type FeedbackItem =
  components["schemas"]["FeedbackListDto"]["data"]["items"][number];
export type FeedbackStatus = FeedbackItem["status"];
export type FeedbackCategory =
  components["schemas"]["CreateFeedbackDto"]["category"];
export type FeedbackType =
  NonNullable<components["schemas"]["CreateFeedbackDto"]["type"]>;
export type CreateFeedbackInput =
  components["schemas"]["CreateFeedbackDto"];

export const FEEDBACK_LIST_KEY = ["feedback-list"] as const;

export type FeedbackQueryOptions = {
  category?: FeedbackCategory;
  status?: components["schemas"]["FeedbackListDto"]["data"]["items"][number]["status"];
  type?: FeedbackType;
  search?: string;
  sortBy?: "recent" | "upvotes";
  onlyMine?: boolean;
  limit?: number;
  offset?: number;
};

export function useFeedbackList(
  options: FeedbackQueryOptions = {},
  initialData?: FeedbackItem[],
) {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: [...FEEDBACK_LIST_KEY, options],
    queryFn: async () => {
      const { data, error } = await client.GET("/feedback", {
        params: {
          query: {
            ...options,
            onlyMine: options.onlyMine,
          },
        },
      });
      if (error) throw error;
      return data.data;
    },
    initialData: initialData
      ? {
          items: initialData,
          nextCursor: null,
        }
      : undefined,
  });
}

export function useCreateFeedback() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFeedbackInput) => {
      const { data, error } = await client.POST("/feedback", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEEDBACK_LIST_KEY });
      toast.add({
        title: "Thank you for your feedback!",
        description: "We review every submission carefully.",
        type: "success",
        timeout: 4000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't submit feedback",
        description: "Please check your network connection and try again.",
        type: "error",
      });
    },
  });
}

export function useToggleUpvote() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.POST("/feedback/{id}/upvote", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data.data;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: FEEDBACK_LIST_KEY });

      // Optimistic update for all active feedback queries
      queryClient.setQueriesData<{
        items: FeedbackItem[];
        nextCursor: string | null;
      }>({ queryKey: FEEDBACK_LIST_KEY }, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((item) => {
            if (item._id === id) {
              const nextHasUpvoted = !item.hasUpvoted;
              return {
                ...item,
                hasUpvoted: nextHasUpvoted,
                upvoteCount: nextHasUpvoted
                  ? item.upvoteCount + 1
                  : Math.max(0, item.upvoteCount - 1),
              };
            }
            return item;
          }),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FEEDBACK_LIST_KEY });
    },
  });
}

export function useDeleteFeedback() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/feedback/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEEDBACK_LIST_KEY });
      toast.add({
        title: "Feedback deleted",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't delete feedback",
        type: "error",
      });
    },
  });
}
