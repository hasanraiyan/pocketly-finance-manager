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
