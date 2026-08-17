import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { useAuth } from "@/lib/auth-provider";
import { formatCurrency } from "@/lib/format";
import { theme } from "@/lib/theme";
import {
  ACCOUNT_ICONS,
  ACCOUNT_TYPE_LABELS,
  resolveAccountIconKey,
  type AccountType,
} from "@/features/accounts/account-icons";
import { AccountModal } from "@/features/accounts/AccountModal";
import {
  useAccounts,
  useDeleteAccount,
  type Account,
} from "@/features/accounts/hooks";

export default function AccountsScreen() {
  const { user } = useAuth();
  const { data: accounts = [], isLoading, isError, refetch, isRefetching } =
    useAccounts();
  const deleteAccount = useDeleteAccount();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    if (activeFilter === "all") return accounts;
    return accounts.filter((acc) => acc.type === activeFilter);
  }, [accounts, activeFilter]);

  const filters = useMemo(() => {
    const types = Array.from(new Set(accounts.map((a) => a.type)));
    return [
      { key: "all", label: "All" },
      ...types.map((t) => ({
        key: t,
        label: ACCOUNT_TYPE_LABELS[t as AccountType] ?? t,
      })),
    ];
  }, [accounts]);

  function handleAddAccount() {
    setSelectedAccount(null);
    setModalVisible(true);
  }

  function handleEditAccount(account: Account) {
    setSelectedAccount(account);
    setModalVisible(true);
  }

  function handleDeleteAccount(account: Account) {
    Alert.alert(
      `Delete ${account.name}?`,
      "This archives the account. Its past records stay in your history, but it won't appear in totals anymore.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(account._id);
            } catch {
              Alert.alert("Error", "Could not delete account. Please try again.");
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
          <Text className="font-heading text-2xl text-foreground">Accounts</Text>
          <Text className="text-xs text-muted-foreground">
            {accounts.length} {accounts.length === 1 ? "account" : "accounts"} active
          </Text>
        </View>
        <Pressable
          onPress={handleAddAccount}
          hitSlop={8}
          className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 active:opacity-80"
        >
          <Feather name="plus" size={16} color={theme.primaryForeground} />
          <Text className="text-xs font-semibold text-primary-foreground">
            Add Account
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-6 py-6 pb-24 gap-6"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        {/* Total Net Worth / Balance Card */}
        <Card className="bg-card border border-border/80">
          <CardContent className="p-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Total Balance
              </Text>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Feather name="credit-card" size={14} color={theme.primary} />
              </View>
            </View>
            <Text className="mt-2 font-mono text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(totalBalance, user?.currency ?? "USD")}
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Across all linked wallets, cash, and banking accounts
            </Text>
          </CardContent>
        </Card>

        {/* Filter Pills */}
        {accounts.length > 0 && filters.length > 2 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-1"
          >
            <View className="flex-row gap-2 px-1">
              {filters.map((f) => {
                const isActive = activeFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setActiveFilter(f.key)}
                    className={`rounded-full px-3.5 py-1.5 border ${
                      isActive
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Loading state */}
        {isLoading && !isRefetching ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color={theme.primary} />
            <Text className="mt-3 text-sm text-muted-foreground">
              Loading your accounts...
            </Text>
          </View>
        ) : isError ? (
          /* Error State */
          <View className="items-center justify-center rounded-2xl bg-card border border-border p-8 text-center">
            <Feather name="alert-circle" size={32} color={theme.negative} />
            <Text className="mt-3 font-heading text-lg text-foreground">
              Couldn&apos;t load accounts
            </Text>
            <Text className="mt-1 text-center text-xs text-muted-foreground mb-4">
              Please check your connection and try again.
            </Text>
            <Button variant="outline" onPress={() => refetch()}>
              Retry
            </Button>
          </View>
        ) : filteredAccounts.length === 0 ? (
          /* Empty State */
          <View className="items-center justify-center rounded-2xl bg-card border border-border/80 p-8 text-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Feather name="folder" size={32} color={theme.primary} />
            </View>
            <Text className="font-heading text-lg text-foreground">
              {activeFilter === "all"
                ? "No accounts yet"
                : "No accounts in this category"}
            </Text>
            <Text className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
              {activeFilter === "all"
                ? "Add your bank, cash, or credit card accounts to track your ledger."
                : "Try selecting a different filter or create a new account."}
            </Text>
            <Button onPress={handleAddAccount} className="mt-5">
              Add an Account
            </Button>
          </View>
        ) : (
          /* Accounts List */
          <View className="gap-3">
            {filteredAccounts.map((account) => {
              const iconInfo =
                ACCOUNT_ICONS[
                  resolveAccountIconKey(
                    account.icon,
                    account.type as AccountType,
                  )
                ];
              const isNegative = account.balance < 0;

              return (
                <View
                  key={account._id}
                  className="flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-4 shadow-sm"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <View className="h-11 w-11 items-center justify-center rounded-xl bg-muted border border-border/60">
                      <Feather
                        name={iconInfo?.icon ?? "credit-card"}
                        size={20}
                        color={theme.foreground}
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-base font-semibold text-foreground"
                      >
                        {account.name}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text className="text-xs text-muted-foreground capitalize">
                          {ACCOUNT_TYPE_LABELS[account.type as AccountType] ??
                            account.type}
                        </Text>
                        <Text className="text-xs text-muted-foreground/60">•</Text>
                        <Text className="text-xs text-muted-foreground uppercase">
                          {account.currency}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end gap-2">
                    <Text
                      className={`font-mono text-base font-semibold tabular-nums ${
                        isNegative ? "text-negative" : "text-foreground"
                      }`}
                    >
                      {formatCurrency(account.balance, account.currency)}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Pressable
                        onPress={() => handleEditAccount(account)}
                        hitSlop={6}
                        className="h-7 w-7 items-center justify-center rounded-md bg-muted/60"
                      >
                        <Feather name="edit-2" size={13} color={theme.foreground} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteAccount(account)}
                        hitSlop={6}
                        className="h-7 w-7 items-center justify-center rounded-md bg-negative/10"
                      >
                        <Feather name="trash-2" size={13} color={theme.negative} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Account Create / Edit Modal */}
      <AccountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        account={selectedAccount}
        defaultCurrency={user?.currency ?? "USD"}
      />
    </View>
  );
}
