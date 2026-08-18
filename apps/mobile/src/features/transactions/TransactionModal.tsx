import React, { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { DatePickerField } from "@/components/DatePickerField";
import { TextField } from "@/components/TextField";
import { AccountModal } from "@/features/accounts/AccountModal";
import { useAccounts } from "@/features/accounts/hooks";
import {
  useCategories,
  useCreateCategory,
} from "@/features/categories/hooks";
import { theme } from "@/lib/theme";
import {
  useCreateTransaction,
  useUpdateTransaction,
  type Transaction,
  type TransactionFilters,
} from "./hooks";

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  filters?: TransactionFilters;
  defaultType?: Transaction["type"];
}

const TYPE_OPTIONS: Array<{
  value: Transaction["type"];
  label: string;
  icon: "arrow-down-right" | "arrow-up-right" | "repeat";
}> = [
  { value: "expense", label: "Expense", icon: "arrow-down-right" },
  { value: "income", label: "Income", icon: "arrow-up-right" },
  { value: "transfer", label: "Transfer", icon: "repeat" },
];

function toDateInputValue(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function TransactionModal({
  visible,
  onClose,
  transaction,
  filters = {},
  defaultType = "expense",
}: TransactionModalProps) {
  const isEditing = Boolean(transaction);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const createTransaction = useCreateTransaction(filters);
  const updateTransaction = useUpdateTransaction(filters);

  const [type, setType] = useState<Transaction["type"]>(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(toDateInputValue());

  // In-modal sub-modals & category creation
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const relevantCategories = useMemo(() => {
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  useEffect(() => {
    if (visible) {
      if (transaction) {
        setType(transaction.type);
        setAmount(String(transaction.amount / 100));
        setDescription(transaction.description ?? "");
        setNote(transaction.note ?? "");
        setAccountId(transaction.accountId ?? "");
        setToAccountId(transaction.toAccountId ?? "");
        setCategoryId(transaction.categoryId ?? "");
        setDate(toDateInputValue(transaction.date));
      } else {
        setType(defaultType);
        setAmount("");
        setDescription("");
        setNote("");
        setAccountId(accounts[0]?._id ?? "");
        setToAccountId(accounts[1]?._id ?? "");
        setCategoryId("");
        setDate(toDateInputValue());
      }
      setAddingCategory(false);
      setNewCatName("");
      setError(null);
    }
  }, [visible, transaction]);

  // Keep selected account in sync if accounts arrive
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0]._id);
    }
    if (!toAccountId && accounts.length > 1) {
      const dest = accounts.find((a) => a._id !== (accountId || accounts[0]._id));
      if (dest) setToAccountId(dest._id);
    }
  }, [accounts, accountId, toAccountId]);

  async function handleCreateNewCategory() {
    if (!newCatName.trim()) return;
    try {
      const created = await createCategory.mutateAsync({
        name: newCatName.trim(),
        type: type === "income" ? "income" : "expense",
      });
      setCategoryId(created._id);
      setNewCatName("");
      setAddingCategory(false);
    } catch {
      setError("Could not create category. Please try again.");
    }
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setError("Please provide a description.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!accountId) {
      setError("Please create or select an account first.");
      return;
    }
    if (type === "transfer") {
      if (!toAccountId) {
        setError("Please select the destination account for this transfer.");
        return;
      }
      if (accountId === toAccountId) {
        setError("Source and destination accounts must be different.");
        return;
      }
    } else {
      if (!categoryId) {
        setError("Please select a category.");
        return;
      }
    }

    const payload = {
      type,
      amount: Math.round(numAmount * 100),
      description: description.trim(),
      note: note.trim() || undefined,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      categoryId: type !== "transfer" ? categoryId : undefined,
      date: new Date(date).toISOString(),
    };

    setError(null);
    try {
      if (isEditing && transaction) {
        await updateTransaction.mutateAsync({
          id: transaction._id,
          input: payload,
        });
      } else {
        await createTransaction.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save record.",
      );
    }
  }

  const isPending =
    createTransaction.isPending ||
    updateTransaction.isPending ||
    createCategory.isPending;

  return (
    <>
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
                {isEditing ? "Edit Record" : "Add Record"}
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
                {/* Type Segmented Selector */}
                <View className="flex-row rounded-xl bg-card border border-border p-1">
                  {TYPE_OPTIONS.map((opt) => {
                    const isSelected = type === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => {
                          setType(opt.value);
                          setCategoryId("");
                        }}
                        className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 ${
                          isSelected ? "bg-primary" : "bg-transparent"
                        }`}
                      >
                        <Feather
                          name={opt.icon}
                          size={14}
                          color={
                            isSelected
                              ? theme.primaryForeground
                              : theme.mutedForeground
                          }
                        />
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected
                              ? "text-primary-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Amount & Description */}
                <TextField
                  label="Amount"
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  value={amount}
                  onChangeText={(text) => {
                    setAmount(text);
                    if (error) setError(null);
                  }}
                />

                <TextField
                  label="Description"
                  placeholder="e.g. Weekly Groceries, Restaurant, Salary"
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (error) setError(null);
                  }}
                />

                {/* Account Selector & Empty State UX */}
                <View className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-foreground">
                      {type === "transfer" ? "From Account" : "Account"}
                    </Text>
                    {accounts.length > 0 && (
                      <Pressable
                        onPress={() => setShowAccountModal(true)}
                        hitSlop={8}
                      >
                        <Text className="text-xs font-medium text-primary">
                          + New Account
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  {accounts.length === 0 ? (
                    <View className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 items-center gap-2.5 my-1">
                      <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                        <Feather name="credit-card" size={20} color={theme.primary} />
                      </View>
                      <Text className="text-sm font-semibold text-foreground text-center">
                        No Accounts Found
                      </Text>
                      <Text className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
                        You need at least one account (e.g. Cash, Checking, Savings) to log transactions.
                      </Text>
                      <Button
                        onPress={() => setShowAccountModal(true)}
                        className="flex-row items-center gap-1.5 mt-1 py-2 px-4"
                      >
                        <Feather name="plus" size={14} color={theme.primaryForeground} />
                        <Text className="text-xs font-semibold text-primaryForeground">
                          Create Account
                        </Text>
                      </Button>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="-mx-1"
                    >
                      <View className="flex-row gap-2 px-1">
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

                        <Pressable
                          onPress={() => setShowAccountModal(true)}
                          className="rounded-xl px-3 py-2.5 border border-dashed border-border bg-card/60 flex-row items-center gap-1.5"
                        >
                          <Feather name="plus" size={13} color={theme.mutedForeground} />
                          <Text className="text-xs font-medium text-muted-foreground">
                            New
                          </Text>
                        </Pressable>
                      </View>
                    </ScrollView>
                  )}
                </View>

                {/* Destination Account Selector (for transfers) & 2-Account Warning UX */}
                {type === "transfer" && (
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-foreground">
                        To Account
                      </Text>
                      {accounts.length > 1 && (
                        <Pressable
                          onPress={() => setShowAccountModal(true)}
                          hitSlop={8}
                        >
                          <Text className="text-xs font-medium text-primary">
                            + New Account
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {accounts.length < 2 ? (
                      <View className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex-row items-center gap-3 my-1">
                        <Feather name="alert-circle" size={20} color="#f59e0b" />
                        <View className="flex-1 gap-0.5">
                          <Text className="text-xs font-semibold text-foreground">
                            2 Accounts Required for Transfer
                          </Text>
                          <Text className="text-[11px] text-muted-foreground leading-tight">
                            Add a destination account (e.g. Bank or Savings) to transfer money.
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setShowAccountModal(true)}
                          className="bg-amber-500/20 px-3 py-1.5 rounded-lg"
                        >
                          <Text className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            + Add
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="-mx-1"
                      >
                        <View className="flex-row gap-2 px-1">
                          {accounts
                            .filter((acc) => acc._id !== accountId)
                            .map((acc) => {
                              const isSelected = toAccountId === acc._id;
                              return (
                                <Pressable
                                  key={acc._id}
                                  onPress={() => setToAccountId(acc._id)}
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
                    )}
                  </View>
                )}

                {/* Category Selector (for Expense & Income) */}
                {type !== "transfer" && (
                  <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-foreground">
                        Category
                      </Text>
                      <Pressable
                        onPress={() => setAddingCategory((prev) => !prev)}
                        hitSlop={8}
                      >
                        <Text className="text-xs font-medium text-primary">
                          {addingCategory ? "Cancel" : "+ New Category"}
                        </Text>
                      </Pressable>
                    </View>

                    {addingCategory && (
                      <View className="flex-row items-center gap-2 mb-2">
                        <TextInput
                          placeholder="Category name"
                          placeholderTextColor={theme.mutedForeground}
                          value={newCatName}
                          onChangeText={setNewCatName}
                          className="flex-1 h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                        />
                        <Pressable
                          onPress={handleCreateNewCategory}
                          className="h-10 rounded-lg bg-primary px-3 items-center justify-center"
                        >
                          <Text className="text-xs font-semibold text-primary-foreground">
                            Add
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {relevantCategories.length === 0 && !addingCategory ? (
                      <View className="rounded-xl border border-dashed border-border bg-card/50 p-3 items-center gap-1.5">
                        <Text className="text-xs text-muted-foreground text-center">
                          No {type} categories yet.
                        </Text>
                        <Pressable
                          onPress={() => setAddingCategory(true)}
                          className="py-1 px-3 rounded-md bg-primary/10"
                        >
                          <Text className="text-xs font-medium text-primary">
                            + Create {type === "income" ? "Income" : "Expense"} Category
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="-mx-1"
                      >
                        <View className="flex-row gap-2 px-1">
                          {relevantCategories.map((cat) => {
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
                    )}
                  </View>
                )}

                {/* Date Picker */}
                <DatePickerField
                  label="Date"
                  value={date}
                  onChange={setDate}
                />

                {/* Note */}
                <TextField
                  label="Notes (Optional)"
                  placeholder="Add details, receipt notes, or tags..."
                  value={note}
                  onChangeText={setNote}
                />

                {error && (
                  <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
                    <Text className="text-xs text-negative text-center">
                      {error}
                    </Text>
                  </View>
                )}

                <View className="mt-4 gap-2">
                  <Button loading={isPending} onPress={handleSubmit}>
                    {isEditing ? "Save Changes" : "Add Record"}
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

      {/* In-place Account Creation Modal */}
      <AccountModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={(created) => {
          if (!accountId) {
            setAccountId(created._id);
          } else if (type === "transfer" && !toAccountId) {
            setToAccountId(created._id);
          }
          setShowAccountModal(false);
        }}
      />
    </>
  );
}
