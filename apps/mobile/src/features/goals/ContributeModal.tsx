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
import { formatCurrency } from "@/lib/format";
import { theme } from "@/lib/theme";
import { useContributeToGoal, type Goal } from "./hooks";

interface ContributeModalProps {
  visible: boolean;
  onClose: () => void;
  goal: Goal | null;
  currency: string;
}

export function ContributeModal({
  visible,
  onClose,
  goal,
  currency,
}: ContributeModalProps) {
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);

  const contribute = useContributeToGoal();

  useEffect(() => {
    if (visible) {
      setAmount("");
      setDirection(1);
      setError(null);
    }
  }, [visible]);

  if (!goal) return null;

  async function handleSubmit() {
    if (!goal) return;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const minor = Math.round(numAmount * 100) * direction;
    setError(null);
    try {
      await contribute.mutateAsync({
        id: goal._id,
        amount: minor,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record contribution.",
      );
    }
  }

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
            <View>
              <Text className="font-heading text-xl text-foreground">
                Update Goal Funds
              </Text>
              <Text className="text-xs text-muted-foreground">{goal.name}</Text>
            </View>
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
              {/* Current saved progress info */}
              <View className="rounded-xl bg-card border border-border p-4 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs text-muted-foreground">Currently Saved</Text>
                  <Text className="font-mono text-base font-bold text-foreground mt-0.5">
                    {formatCurrency(goal.savedAmount, currency)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs text-muted-foreground">Target</Text>
                  <Text className="font-mono text-base font-bold text-primary mt-0.5">
                    {formatCurrency(goal.targetAmount, currency)}
                  </Text>
                </View>
              </View>

              {/* Direction Toggle */}
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setDirection(1)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3 border ${
                    direction === 1
                      ? "bg-primary border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  <Feather
                    name="plus-circle"
                    size={16}
                    color={
                      direction === 1
                        ? theme.primaryForeground
                        : theme.foreground
                    }
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      direction === 1
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    Add Money
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDirection(-1)}
                  className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl p-3 border ${
                    direction === -1
                      ? "bg-negative border-negative"
                      : "bg-card border-border"
                  }`}
                >
                  <Feather
                    name="minus-circle"
                    size={16}
                    color={
                      direction === -1
                        ? theme.primaryForeground
                        : theme.foreground
                    }
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      direction === -1
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    Withdraw
                  </Text>
                </Pressable>
              </View>

              {/* Amount input */}
              <TextField
                label={direction === 1 ? "Deposit Amount" : "Withdrawal Amount"}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text);
                  if (error) setError(null);
                }}
              />

              {error && (
                <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                  <Text className="text-xs text-negative text-center">{error}</Text>
                </View>
              )}

              <View className="mt-4 gap-2">
                <Button loading={contribute.isPending} onPress={handleSubmit}>
                  {direction === 1 ? "Confirm Deposit" : "Confirm Withdrawal"}
                </Button>
                <Button
                  variant="ghost"
                  onPress={onClose}
                  disabled={contribute.isPending}
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
