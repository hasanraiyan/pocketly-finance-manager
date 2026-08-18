"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

import { useAuth } from "@/lib/auth-provider";
import {
  getLocalCategories,
  saveLocalCategory,
  deleteLocalCategory,
} from "@/lib/local-storage-adapter";

export type Category =
  components["schemas"]["CategoryListDto"]["data"]["items"][number];
export type CreateCategoryInput = components["schemas"]["CreateCategoryDto"];
export type UpdateCategoryInput = components["schemas"]["UpdateCategoryDto"];

export const CATEGORIES_KEY = ["categories"] as const;

export function useCategories(initialData: Category[] = []) {
  const client = usePocketlyClient();
  const { isGuest } = useAuth();

  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalCategories();
        return local as unknown as Category[];
      }
      const { data, error } = await client.GET("/categories", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return data.data.items;
    },
    initialData,
  });
}

export function useCreateCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (isGuest) {
        const created = await saveLocalCategory({
          name: input.name,
          type: input.type,
          color: input.color,
          icon: input.icon,
        });
        return created as unknown as Category;
      }
      const { data, error } = await client.POST("/categories", {
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(CATEGORIES_KEY, (old) => [
        category,
        ...(old ?? []),
      ]);
      toast.add({
        title: "Category created",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't create category",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useUpdateCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCategoryInput;
    }) => {
      if (isGuest) {
        const updated = await saveLocalCategory({
          _id: id,
          name: input.name ?? "Category",
          type: input.type ?? "expense",
          color: input.color,
          icon: input.icon,
        });
        return updated as unknown as Category;
      }
      const { data, error } = await client.PATCH("/categories/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        CATEGORIES_KEY,
        (old) =>
          old?.map((c) => (c._id === category._id ? category : c)) ?? [],
      );
      toast.add({
        title: "Category updated",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update category",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useDeleteCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const { isGuest } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalCategory(id);
        return;
      }
      const { error } = await client.DELETE("/categories/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CATEGORIES_KEY });
      const previous = queryClient.getQueryData<Category[]>(CATEGORIES_KEY);
      queryClient.setQueryData<Category[]>(
        CATEGORIES_KEY,
        (old) => old?.filter((c) => c._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CATEGORIES_KEY, context.previous);
      }
      toast.add({
        title: "Couldn't delete category",
        description: "It's back — try again.",
        type: "error",
      });
    },
  });
}
