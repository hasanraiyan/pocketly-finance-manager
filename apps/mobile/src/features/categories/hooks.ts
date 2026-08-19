import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import {
  deleteLocalCategory,
  getLocalCategories,
  saveLocalCategory,
} from "@/lib/local-storage-adapter";

export type Category =
  components["schemas"]["CategoryListDto"]["data"]["items"][number];
export type CreateCategoryInput = components["schemas"]["CreateCategoryDto"];
export type UpdateCategoryInput = components["schemas"]["UpdateCategoryDto"];

export const CATEGORIES_KEY = ["categories"] as const;

export function categoriesKey(isGuest = false, userId?: string) {
  return ["categories", isGuest, userId ?? "anon"] as const;
}

export function useCategories() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const key = categoriesKey(isGuest, user?._id);

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      if (isGuest) {
        const local = await getLocalCategories();
        return local as unknown as Category[];
      }

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
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = categoriesKey(isGuest, user?._id);

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      if (isGuest) {
        const saved = await saveLocalCategory({
          name: input.name,
          type: input.type as "expense" | "income",
          color: input.color,
          icon: input.icon,
        });
        return saved as unknown as Category;
      }

      const { data, error } = await client.POST("/categories", {
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to create category");
      }
      return data.data;
    },
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(key, (old) => [
        category,
        ...(old ?? []),
      ]);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateCategory() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = categoriesKey(isGuest, user?._id);

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateCategoryInput;
    }) => {
      if (isGuest) {
        const saved = await saveLocalCategory({
          _id: id,
          name: input.name || "Category",
          type: (input.type as "expense" | "income") || "expense",
          color: input.color,
          icon: input.icon,
        });
        return saved as unknown as Category;
      }

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
        key,
        (old) => old?.map((c) => (c._id === category._id ? category : c)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteCategory() {
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = categoriesKey(isGuest, user?._id);

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        await deleteLocalCategory(id);
        return id;
      }

      const { error } = await client.DELETE("/categories/{id}", {
        params: { path: { id } },
      });
      if (error) {
        throw new Error("Failed to delete category");
      }
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Category[]>(key);
      queryClient.setQueryData<Category[]>(
        key,
        (old) => old?.filter((c) => c._id !== id) ?? [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
