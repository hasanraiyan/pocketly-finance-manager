import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

export type Category =
  components["schemas"]["CategoryListDto"]["data"]["items"][number];
export type CreateCategoryInput = components["schemas"]["CreateCategoryDto"];
export type UpdateCategoryInput = components["schemas"]["UpdateCategoryDto"];

export const CATEGORIES_KEY = ["categories"] as const;

export function useCategories() {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/categories", {
        params: { query: { limit: 100 } },
      });
      if (error || !data) {
        throw new Error("Failed to load categories");
      }
      return data.data.items;
    },
  });
}

export function useCreateCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const { data, error } = await client.POST("/categories", {
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to create category");
      }
      return data.data;
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(CATEGORIES_KEY, (old) => [
        category,
        ...(old ?? []),
      ]);
    },
  });
}

export function useUpdateCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCategoryInput;
    }) => {
      const { data, error } = await client.PATCH("/categories/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update category");
      }
      return data.data;
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(
        CATEGORIES_KEY,
        (old) => old?.map((c) => (c._id === category._id ? category : c)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}

export function useDeleteCategory() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/categories/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete category");
      }
      return id;
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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["records"] });
    },
  });
}
