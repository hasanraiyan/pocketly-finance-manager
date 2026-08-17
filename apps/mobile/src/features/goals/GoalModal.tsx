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
import { DatePickerField } from "@/components/DatePickerField";
import { TextField } from "@/components/TextField";
import { useAccounts } from "@/features/accounts/hooks";
import { theme } from "@/lib/theme";
import { useCreateGoal, useUpdateGoal, type Goal } from "./hooks";

interface GoalModalProps {
  visible: boolean;
  onClose: () => void;
  goal?: Goal | null;
}

export const GOAL_KIND_OPTIONS: Array<{ value: Goal["kind"]; label: string }> = [
  { value: "savings", label: "Savings" },
  { value: "emergency_fund", label: "Emergency Fund" },
  { value: "purchase", label: "Purchase" },
  { value: "travel", label: "Travel" },
  { value: "education", label: "Education" },
  { value: "debt_payoff", label: "Debt Payoff" },
  { value: "other", label: "Other" },
];

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function GoalModal({ visible, onClose, goal }: GoalModalProps) {
  const isEditing = Boolean(goal);
  const { data: accounts = [] } = useAccounts();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<Goal["kind"]>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [accountId, setAccountId] = useState("");
  const [savedAmount, setSavedAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (goal) {
        setName(goal.name);
        setKind(goal.kind);
        setTargetAmount(String(goal.targetAmount / 100));
        setMonthlyContribution(
          goal.monthlyContribution ? String(goal.monthlyContribution / 100) : "",
        );
        setTargetDate(toDateInputValue(goal.targetDate));
        setAccountId(goal.accountId ?? "");
        setSavedAmount(String(goal.savedAmount / 100));
      } else {
        setName("");
        setKind("savings");
        setTargetAmount("");
        setMonthlyContribution("");
        setTargetDate("");
        setAccountId("");
        setSavedAmount("0");
      }
      setError(null);
    }
  }, [visible, goal]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Please enter a goal name.");
      return;
    }
    const numTarget = parseFloat(targetAmount);
    if (isNaN(numTarget) || numTarget <= 0) {
      setError("Please enter a valid target amount.");
      return;
    }

    const payload = {
      name: name.trim(),
      kind,
      targetAmount: Math.round(numTarget * 100),
      monthlyContribution: monthlyContribution
        ? Math.round(parseFloat(monthlyContribution) * 100)
        : 0,
      targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      accountId: accountId || null,
      savedAmount: accountId
        ? 0
        : Math.round(parseFloat(savedAmount || "0") * 100),
    };

    setError(null);
    try {
      if (isEditing && goal) {
        await updateGoal.mutateAsync({ id: goal._id, input: payload });
      } else {
        await createGoal.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save savings goal.",
      );
    }
  }

  const isPending = createGoal.isPending || updateGoal.isPending;

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
              {isEditing ? "Edit Savings Goal" : "Create Savings Goal"}
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
              {/* Name */}
              <TextField
                label="Goal Name"
                placeholder="e.g. Dream Vacation, New Car, Emergency Fund"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (error) setError(null);
                }}
              />

              {/* Goal Kind */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Goal Type
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="-mx-1"
                >
                  <View className="flex-row gap-2 px-1">
                    {GOAL_KIND_OPTIONS.map((opt) => {
                      const isSelected = kind === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setKind(opt.value)}
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
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Target Amount */}
              <TextField
                label="Target Savings Amount"
                keyboardType="decimal-pad"
                placeholder="5000.00"
                value={targetAmount}
                onChangeText={(text) => {
                  setTargetAmount(text);
                  if (error) setError(null);
                }}
              />

              {/* Monthly Contribution */}
              <TextField
                label="Monthly Planned Savings (Optional)"
                keyboardType="decimal-pad"
                placeholder="250.00"
                value={monthlyContribution}
                onChangeText={setMonthlyContribution}
              />

              {/* Target Date Picker */}
              <DatePickerField
                label="Target Completion Date (Optional)"
                placeholder="Select target completion date"
                value={targetDate}
                onChange={setTargetDate}
              />

              {/* Linked Account Selector */}
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Linked Account (Optional)
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="-mx-1"
                >
                  <View className="flex-row gap-2 px-1">
                    <Pressable
                      onPress={() => setAccountId("")}
                      className={`rounded-xl px-3.5 py-2.5 border ${
                        !accountId
                          ? "bg-primary border-primary"
                          : "bg-card border-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          !accountId
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        Unlinked (Manual)
                      </Text>
                    </Pressable>

                    {accounts.map((acc) => {
                      const isSelected = accountId === acc._id;
                      return (
                        <Pressable
                          key={acc._id}
                          onPress={() => setAccountId(acc._id)}
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
                            {acc.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Current Saved Amount (only if unlinked) */}
              {!accountId && (
                <TextField
                  label="Initial Amount Saved"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={savedAmount}
                  onChangeText={setSavedAmount}
                />
              )}

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={isPending} onPress={handleSubmit}>
                  {isEditing ? "Save Changes" : "Create Goal"}
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
