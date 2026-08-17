import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { theme } from "@/lib/theme";
import {
  useCreateCategory,
  useUpdateCategory,
  type Category,
} from "./hooks";

interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  category?: Category | null;
  defaultType?: "expense" | "income";
}

const COLOR_PALETTE = [
  "#10b981", // Emerald
  "#f43f5e", // Rose
  "#3b82f6", // Sky / Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple / Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

const CATEGORY_ICONS: Array<keyof typeof Feather.glyphMap> = [
  "shopping-bag",
  "coffee",
  "home",
  "film",
  "zap",
  "book",
  "heart",
  "truck",
  "gift",
  "tag",
  "briefcase",
  "dollar-sign",
];

export function CategoryModal({
  visible,
  onClose,
  category,
  defaultType = "expense",
}: CategoryModalProps) {
  const isEditing = Boolean(category);
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();

  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">(defaultType);
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [icon, setIcon] = useState<string>("tag");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (category) {
        setName(category.name);
        setType(category.type as "expense" | "income");
        setColor(category.color ?? COLOR_PALETTE[0]);
        setIcon(category.icon ?? "tag");
      } else {
        setName("");
        setType(defaultType);
        setColor(defaultType === "income" ? COLOR_PALETTE[0] : COLOR_PALETTE[1]);
        setIcon("tag");
      }
      setError(null);
    }
  }, [visible, category, defaultType]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Please enter a category name.");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      color,
      icon,
    };

    setError(null);
    try {
      if (isEditing && category) {
        await updateCat.mutateAsync({ id: category._id, input: payload });
      } else {
        await createCat.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save category.",
      );
    }
  }

  const isPending = createCat.isPending || updateCat.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end md:justify-center md:items-center bg-black/60 md:p-6"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="w-full md:max-w-xl max-h-[90%] rounded-t-3xl md:rounded-3xl bg-background px-6 pb-8 pt-6 border-t md:border border-border">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-heading text-xl text-foreground">
              {isEditing ? "Edit Category" : "New Category"}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <Feather name="x" size={18} color={theme.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-5 py-2">
              {/* Type Switcher */}
              <View className="flex-row rounded-xl bg-card border border-border p-1">
                <Pressable
                  onPress={() => setType("expense")}
                  className={`flex-1 items-center justify-center rounded-lg py-2 ${
                    type === "expense" ? "bg-primary" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      type === "expense"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Expense
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setType("income")}
                  className={`flex-1 items-center justify-center rounded-lg py-2 ${
                    type === "income" ? "bg-primary" : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      type === "income"
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Income
                  </Text>
                </Pressable>
              </View>

              {/* Name */}
              <TextField
                label="Category Name"
                placeholder="e.g. Groceries, Freelance, Subscriptions"
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (error) setError(null);
                }}
              />

              {/* Color Picker */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Color Tag
                </Text>
                <View className="flex-row gap-2.5">
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = color === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-9 w-9 items-center justify-center rounded-full ${
                          isSelected ? "border-2 border-foreground" : ""
                        }`}
                      >
                        {isSelected && (
                          <Feather name="check" size={16} color="#ffffff" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Icon Picker */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Category Icon
                </Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {CATEGORY_ICONS.map((ic) => {
                    const isSelected = icon === ic;
                    return (
                      <Pressable
                        key={ic}
                        onPress={() => setIcon(ic)}
                        className={`h-11 w-11 items-center justify-center rounded-xl border ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "bg-card border-border"
                        }`}
                      >
                        <Feather
                          name={ic}
                          size={18}
                          color={
                            isSelected
                              ? theme.primaryForeground
                              : theme.foreground
                          }
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleSubmit}>
                  {isEditing ? "Save Category" : "Create Category"}
                </Button>
                <Button
                  variant="ghost"
                  onPress={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
