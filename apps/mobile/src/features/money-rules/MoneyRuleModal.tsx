import React, { useEffect, useMemo, useState } from "react";
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
import { useCategories } from "@/features/categories/hooks";
import { theme } from "@/lib/theme";
import { useCreateMoneyRule, useUpdateMoneyRule, type MoneyRule } from "./hooks";

interface MoneyRuleModalProps {
  visible: boolean;
  onClose: () => void;
  rule?: MoneyRule | null;
}

export const RULE_KIND_OPTIONS: Array<{
  value: MoneyRule["kind"];
  label: string;
  needsThreshold: boolean;
  needsCategory: boolean;
  thresholdLabel?: string;
}> = [
  {
    value: "balance_under",
    label: "Balance drops below",
    needsThreshold: true,
    needsCategory: false,
    thresholdLabel: "Minimum Balance Floor",
  },
  {
    value: "category_over",
    label: "A category goes over",
    needsThreshold: true,
    needsCategory: true,
    thresholdLabel: "Category Spending Limit",
  },
  {
    value: "large_transaction",
    label: "A single expense is bigger than",
    needsThreshold: true,
    needsCategory: false,
    thresholdLabel: "Large Expense Amount",
  },
  {
    value: "weekly_summary",
    label: "Regular summary digest",
    needsThreshold: false,
    needsCategory: false,
  },
  {
    value: "goal_progress",
    label: "Regular goal check-in",
    needsThreshold: false,
    needsCategory: false,
  },
];

export function MoneyRuleModal({ visible, onClose, rule }: MoneyRuleModalProps) {
  const isEditing = Boolean(rule);
  const { data: categories = [] } = useCategories();
  const createRule = useCreateMoneyRule();
  const updateRule = useUpdateMoneyRule();

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const [kind, setKind] = useState<MoneyRule["kind"]>("balance_under");
  const [threshold, setThreshold] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cadenceDays, setCadenceDays] = useState("7");
  const [error, setError] = useState<string | null>(null);

  const shape =
    RULE_KIND_OPTIONS.find((option) => option.value === kind) ??
    RULE_KIND_OPTIONS[0];

  useEffect(() => {
    if (visible) {
      if (rule) {
        setKind(rule.kind);
        setThreshold(rule.threshold ? String(rule.threshold / 100) : "");
        setCategoryId(rule.categoryId ?? "");
        setCadenceDays(String(rule.cadenceDays ?? 7));
      } else {
        setKind("balance_under");
        setThreshold("");
        setCategoryId(expenseCategories[0]?._id ?? "");
        setCadenceDays("7");
      }
      setError(null);
    }
  }, [visible, rule]);

  async function handleSubmit() {
    if (shape.needsThreshold) {
      const numThreshold = parseFloat(threshold);
      if (isNaN(numThreshold) || numThreshold <= 0) {
        setError("Please enter a valid positive amount.");
        return;
      }
    }
    if (shape.needsCategory && !categoryId) {
      setError("Please select a category for this rule.");
      return;
    }

    const payload = {
      kind,
      enabled: rule?.enabled ?? true,
      threshold: shape.needsThreshold
        ? Math.round(parseFloat(threshold || "0") * 100)
        : null,
      categoryId: shape.needsCategory ? categoryId : null,
      cadenceDays: Number(cadenceDays) || 7,
    };

    setError(null);
    try {
      if (isEditing && rule) {
        await updateRule.mutateAsync({ id: rule._id, input: payload });
      } else {
        await createRule.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save alert rule.",
      );
    }
  }

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="max-h-[90%] rounded-t-3xl bg-background px-6 pb-8 pt-6 border-t border-border">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-heading text-xl text-foreground">
              {isEditing ? "Edit Alert Rule" : "Create Alert Rule"}
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
              {/* Alert Kind Selector */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Alert Condition
                </Text>
                <View className="gap-2">
                  {RULE_KIND_OPTIONS.map((opt) => {
                    const isSelected = kind === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setKind(opt.value)}
                        className={`rounded-xl p-3.5 border ${
                          isSelected
                            ? "bg-primary/5 border-primary"
                            : "bg-card border-border"
                        }`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
                          {isSelected && (
                            <Feather name="check" size={16} color={theme.primary} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Category Selector (if category needed) */}
              {shape.needsCategory && (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-foreground">
                    Expense Category
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="-mx-1"
                  >
                    <View className="flex-row gap-2 px-1">
                      {expenseCategories.map((cat) => {
                        const isSelected = categoryId === cat._id;
                        return (
                          <Pressable
                            key={cat._id}
                            onPress={() => setCategoryId(cat._id)}
                            className={`rounded-xl px-3.5 py-2.5 border ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "bg-card border-border"
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-foreground"
                              }`}
                            >
                              {cat.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Threshold input (if threshold needed) */}
              {shape.needsThreshold && (
                <TextField
                  label={shape.thresholdLabel ?? "Threshold Amount"}
                  keyboardType="decimal-pad"
                  placeholder="100.00"
                  value={threshold}
                  onChangeText={(text) => {
                    setThreshold(text);
                    if (error) setError(null);
                  }}
                />
              )}

              {/* Cadence days (for digests) */}
              {!shape.needsThreshold && (
                <View className="gap-2">
                  <Text className="text-sm font-medium text-foreground">
                    Cadence Frequency
                  </Text>
                  <View className="flex-row gap-2">
                    {[
                      { days: "7", label: "Weekly (7d)" },
                      { days: "14", label: "Bi-weekly (14d)" },
                      { days: "30", label: "Monthly (30d)" },
                    ].map((opt) => {
                      const isSelected = cadenceDays === opt.days;
                      return (
                        <Pressable
                          key={opt.days}
                          onPress={() => setCadenceDays(opt.days)}
                          className={`flex-1 items-center justify-center rounded-xl py-2.5 border ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "bg-card border-border"
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected
                                ? "text-primary-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleSubmit}>
                  {isEditing ? "Save Alert" : "Create Alert Rule"}
                </Button>
                <Button variant="ghost" onPress={onClose} disabled={isPending}>
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
