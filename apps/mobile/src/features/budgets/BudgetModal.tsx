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
import { useCreateBudget, useUpdateBudget, type Budget } from "./hooks";

interface BudgetModalProps {
  visible: boolean;
  onClose: () => void;
  budget?: Budget | null;
}

const PERIOD_OPTIONS: Array<{ value: Budget["period"]; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function BudgetModal({ visible, onClose, budget }: BudgetModalProps) {
  const isEditing = Boolean(budget);
  const { data: categories = [] } = useCategories();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Budget["period"]>("monthly");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (budget) {
        setCategoryId(budget.categoryId);
        setAmount(String(budget.amount / 100));
        setPeriod(budget.period);
      } else {
        setCategoryId(expenseCategories[0]?._id ?? "");
        setAmount("");
        setPeriod("monthly");
      }
      setError(null);
    }
  }, [visible, budget]);

  async function handleSubmit() {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid budget amount.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category for this budget.");
      return;
    }

    const payload = {
      categoryId,
      amount: Math.round(numAmount * 100),
      period,
    };

    setError(null);
    try {
      if (isEditing && budget) {
        await updateBudget.mutateAsync({ id: budget._id, input: payload });
      } else {
        await createBudget.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save budget.",
      );
    }
  }

  const isPending = createBudget.isPending || updateBudget.isPending;

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
              {isEditing ? "Edit Budget" : "Create Budget"}
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
              {/* Category Selector */}
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

              {/* Amount */}
              <TextField
                label="Budget Limit Amount"
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (error) setError(null);
                }}
              />

              {/* Period selection */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Reset Period
                </Text>
                <View className="flex-row gap-2">
                  {PERIOD_OPTIONS.map((opt) => {
                    const isSelected = period === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setPeriod(opt.value)}
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

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleSubmit}>
                  {isEditing ? "Save Changes" : "Set Budget"}
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
