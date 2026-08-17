import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { ExportModal } from "@/features/transactions/ExportModal";
import { RecordsSkeleton } from "@/features/transactions/RecordsSkeleton";
import {
  useDeleteTransaction,
  useLoadMoreTransactions,
  useTransactions,
  type Transaction,
  type TransactionFilters,
} from "@/features/transactions/hooks";
import { TransactionModal } from "@/features/transactions/TransactionModal";
import { useAuth } from "@/lib/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { theme } from "@/lib/theme";

const TYPE_FILTER_OPTIONS: Array<{
  value: Transaction["type"] | "";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

export default function RecordsScreen() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Transaction["type"] | "">("");
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filters: TransactionFilters = useMemo(
    () => ({
      type: typeFilter || undefined,
      accountId: accountFilter || undefined,
      categoryId: categoryFilter || undefined,
      q: search.trim() || undefined,
    }),
    [typeFilter, accountFilter, categoryFilter, search],
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useTransactions(filters);

  const loadMore = useLoadMoreTransactions(filters);
  const deleteTransaction = useDeleteTransaction(filters);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const [modalVisible, setModalVisible] = useState(false);
  const [exportVisible, setExportVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const transactions = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  // Account map for fast lookup
  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a._id, a.name]));
  }, [accounts]);

  // Category map for fast lookup
  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);

  // Quick stats for visible items
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") expense += t.amount;
    }
    return { income, expense };
  }, [transactions]);

  function handleAddRecord() {
    setSelectedTx(null);
    setModalVisible(true);
  }

  function handleEditRecord(tx: Transaction) {
    setSelectedTx(tx);
    setModalVisible(true);
  }

  function handleDeleteRecord(tx: Transaction) {
    const title = tx.description || "this record";
    Alert.alert(
      `Delete "${title}"?`,
      "Are you sure you want to delete this record? This will update your account balances.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction.mutateAsync(tx._id);
            } catch {
              Alert.alert("Error", "Could not delete record. Please try again.");
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="flex-row items-center justify-between px-6 pt-16 pb-4 border-b border-border bg-background">
        <View>
          <Text className="font-heading text-2xl text-foreground">Records</Text>
          <Text className="text-xs text-muted-foreground">
            {transactions.length} entries shown
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setExportVisible(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-lg border border-border bg-card"
          >
            <Feather name="download" size={16} color={theme.foreground} />
          </Pressable>

          <Pressable
            onPress={handleAddRecord}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 active:opacity-80"
          >
            <Feather name="plus" size={16} color={theme.primaryForeground} />
            <Text className="text-xs font-semibold text-primary-foreground">
              Add Record
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-6 py-4 pb-28 gap-4"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        {/* Search Input */}
        <View className="flex-row items-center rounded-xl bg-card border border-border px-3 h-11">
          <Feather name="search" size={16} color={theme.mutedForeground} />
          <TextInput
            placeholder="Search records or notes..."
            placeholderTextColor={theme.mutedForeground}
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-sm text-foreground"
          />
          {Boolean(search) && (
            <Pressable onPress={() => setSearch("")} hitSlop={6}>
              <Feather name="x" size={16} color={theme.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Type Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1"
        >
          <View className="flex-row gap-2 px-1">
            {TYPE_FILTER_OPTIONS.map((opt) => {
              const isSelected = typeFilter === opt.value;
              return (
                <Pressable
                  key={opt.value || "all"}
                  onPress={() => setTypeFilter(opt.value)}
                  className={`rounded-full px-3.5 py-1.5 border ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
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

            {/* Account Filter Pill */}
            {accounts.map((acc) => {
              const isSelected = accountFilter === acc._id;
              return (
                <Pressable
                  key={acc._id}
                  onPress={() =>
                    setAccountFilter((prev) =>
                      prev === acc._id ? "" : acc._id,
                    )
                  }
                  className={`rounded-full px-3.5 py-1.5 border ${
                    isSelected
                      ? "bg-primary border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      isSelected
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {acc.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Stats summary bar */}
        {transactions.length > 0 && (
          <View className="flex-row gap-3">
            <Card className="flex-1 bg-card border border-border/80">
              <CardContent className="p-3 flex-row items-center gap-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-positive/10">
                  <Feather name="arrow-up-right" size={16} color={theme.positive} />
                </View>
                <View>
                  <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                    Income
                  </Text>
                  <Text className="font-mono text-sm font-bold text-positive">
                    {formatCurrency(stats.income, user?.currency ?? "USD")}
                  </Text>
                </View>
              </CardContent>
            </Card>

            <Card className="flex-1 bg-card border border-border/80">
              <CardContent className="p-3 flex-row items-center gap-2.5">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-negative/10">
                  <Feather name="arrow-down-right" size={16} color={theme.negative} />
                </View>
                <View>
                  <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                    Expenses
                  </Text>
                  <Text className="font-mono text-sm font-bold text-negative">
                    {formatCurrency(stats.expense, user?.currency ?? "USD")}
                  </Text>
                </View>
              </CardContent>
            </Card>
          </View>
        )}

        {/* List Content */}
        {isLoading && !isRefetching ? (
          <RecordsSkeleton />
        ) : isError ? (
          <View className="items-center justify-center rounded-2xl bg-card border border-border p-8 text-center">
            <Feather name="alert-circle" size={32} color={theme.negative} />
            <Text className="mt-3 font-heading text-lg text-foreground">
              Couldn&apos;t load records
            </Text>
            <Text className="mt-1 text-center text-xs text-muted-foreground mb-4">
              Please check your connection and try again.
            </Text>
            <Button variant="outline" onPress={() => refetch()}>
              Retry
            </Button>
          </View>
        ) : transactions.length === 0 ? (
          <View className="items-center justify-center rounded-2xl bg-card border border-border/80 p-8 text-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Feather name="file-text" size={32} color={theme.primary} />
            </View>
            <Text className="font-heading text-lg text-foreground">
              No records found
            </Text>
            <Text className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
              {search || typeFilter || accountFilter
                ? "Try adjusting your search or filters."
                : "Add your first income, expense, or transfer record."}
            </Text>
            <Button onPress={handleAddRecord} className="mt-5">
              Add a Record
            </Button>
          </View>
        ) : (
          <View className="gap-2.5">
            {transactions.map((tx) => {
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";
              const accountName = accountMap.get(tx.accountId) ?? "Account";
              const toAccountName = tx.toAccountId
                ? accountMap.get(tx.toAccountId)
                : null;
              const categoryName = tx.categoryId
                ? categoryMap.get(tx.categoryId)
                : null;

              return (
                <View
                  key={tx._id}
                  className="flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-3.5 shadow-sm"
                >
                  {/* Left: Icon & Details */}
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-xl ${
                        isIncome
                          ? "bg-positive/10"
                          : isTransfer
                            ? "bg-muted"
                            : "bg-negative/10"
                      }`}
                    >
                      <Feather
                        name={
                          isIncome
                            ? "arrow-up-right"
                            : isTransfer
                              ? "repeat"
                              : "arrow-down-right"
                        }
                        size={18}
                        color={
                          isIncome
                            ? theme.positive
                            : isTransfer
                              ? theme.foreground
                              : theme.negative
                        }
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-sm font-semibold text-foreground"
                      >
                        {tx.description ||
                          (isTransfer
                            ? "Transfer"
                            : isIncome
                              ? "Income"
                              : "Expense")}
                      </Text>
                      <View className="flex-row flex-wrap items-center gap-1.5 mt-0.5">
                        <Text className="text-[11px] text-muted-foreground">
                          {formatDate(tx.date)}
                        </Text>
                        <Text className="text-[11px] text-muted-foreground/60">•</Text>
                        <Text className="text-[11px] text-muted-foreground font-medium">
                          {isTransfer && toAccountName
                            ? `${accountName} → ${toAccountName}`
                            : accountName}
                        </Text>
                        {categoryName && (
                          <>
                            <Text className="text-[11px] text-muted-foreground/60">•</Text>
                            <Text className="text-[11px] text-primary font-medium">
                              {categoryName}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Right: Amount & Action Buttons */}
                  <View className="items-end gap-1.5">
                    <Text
                      className={`font-mono text-sm font-bold tabular-nums ${
                        isIncome
                          ? "text-positive"
                          : isTransfer
                            ? "text-foreground"
                            : "text-negative"
                      }`}
                    >
                      {isIncome ? "+" : isTransfer ? "" : "-"}
                      {formatCurrency(tx.amount, user?.currency ?? "USD")}
                    </Text>

                    <View className="flex-row items-center gap-1">
                      <Pressable
                        onPress={() => handleEditRecord(tx)}
                        hitSlop={6}
                        className="h-6 w-6 items-center justify-center rounded bg-muted/60"
                      >
                        <Feather name="edit-2" size={11} color={theme.foreground} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteRecord(tx)}
                        hitSlop={6}
                        className="h-6 w-6 items-center justify-center rounded bg-negative/10"
                      >
                        <Feather name="trash-2" size={11} color={theme.negative} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Load more button */}
            {Boolean(nextCursor) && (
              <View className="mt-3">
                <Button
                  variant="outline"
                  loading={loadMore.isPending}
                  onPress={() => nextCursor && loadMore.mutate(nextCursor)}
                >
                  Load More Records
                </Button>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        transaction={selectedTx}
        filters={filters}
      />

      {/* Export Report Modal */}
      <ExportModal
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
      />
    </View>
  );
}
