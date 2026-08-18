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
import { AccountModal } from "@/features/accounts/AccountModal";
import {
  ACCOUNT_ICONS,
  ACCOUNT_TYPE_LABELS,
  resolveAccountIconKey,
  type AccountType,
} from "@/features/accounts/account-icons";
import { AccountsSkeleton } from "@/features/accounts/AccountsSkeleton";
import {
  useAccounts,
  useDeleteAccount,
  type Account,
} from "@/features/accounts/hooks";
import { formatCurrency } from "@/lib/format";
import { theme } from "@/lib/theme";

export default function AccountsScreen() {
  const { data: accounts = [], isLoading, isError, refetch, isRefetching } =
    useAccounts();
  const deleteAccount = useDeleteAccount();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Calculate Net Worth across all active accounts
  const netWorth = useMemo(() => {
    return accounts.reduce((acc, account) => acc + account.balance, 0);
  }, [accounts]);

  const defaultCurrency = accounts[0]?.currency ?? "USD";

  // Filter accounts by type
  const filteredAccounts = useMemo(() => {
    if (activeFilter === "all") return accounts;
    return accounts.filter((a) => a.type === activeFilter);
  }, [accounts, activeFilter]);

  // Account Type Counts for Filter Pills
  const filters = useMemo(() => {
    const counts: Record<string, number> = { all: accounts.length };
    accounts.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });

    const list = [{ key: "all", label: `All (${counts.all || 0})` }];
    Object.keys(ACCOUNT_TYPE_LABELS).forEach((typeKey) => {
      if (counts[typeKey]) {
        list.push({
          key: typeKey,
          label: `${ACCOUNT_TYPE_LABELS[typeKey as AccountType]} (${counts[typeKey]})`,
        });
      }
    });
    return list;
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
      `Delete "${account.name}"?`,
      "All transactions associated with this account will remain, but the account will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync(account._id);
            } catch {
              Alert.alert("Error", "Could not delete account.");
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="w-full border-b border-border bg-background">
        <View className="w-full max-w-5xl mx-auto flex-row items-center justify-between px-5 md:px-8 pt-16 pb-4">
          <View>
            <Text className="font-heading text-2xl text-foreground">Accounts</Text>
            <Text className="text-xs text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? "account" : "accounts"} active
            </Text>
          </View>
          <Pressable
            onPress={handleAddAccount}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 shrink-0 active:opacity-80"
          >
            <Feather name="plus" size={16} color={theme.primaryForeground} />
            <Text className="text-xs font-semibold text-primary-foreground">
              Add Account
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="items-center px-4 md:px-8 py-6 pb-32"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        <View className="w-full max-w-5xl gap-6">
          {isLoading && !isRefetching ? (
            <AccountsSkeleton />
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
            <View className="items-center justify-center rounded-2xl bg-card border border-border p-8 text-center">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-3">
                <Feather name="credit-card" size={24} color={theme.primary} />
              </View>
              <Text className="font-heading text-lg text-foreground">
                No accounts found
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground mb-5 max-w-xs">
                {activeFilter !== "all"
                  ? "No accounts match this filter. Switch filters or add a new account."
                  : "Link your bank, credit cards, or digital wallets to begin tracking your finances."}
              </Text>
              <Button onPress={handleAddAccount}>Add First Account</Button>
            </View>
          ) : (
            <View className="gap-6">
              {/* Net Worth Hero Card */}
              <Card className="bg-card border border-border/80">
                <CardContent className="gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total Net Worth
                    </Text>
                    <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <Feather name="trending-up" size={14} color={theme.primary} />
                    </View>
                  </View>
                  <Text className="font-mono text-3xl font-bold tracking-tight text-foreground">
                    {formatCurrency(netWorth, defaultCurrency)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Aggregated balance from {accounts.length} active account
                    {accounts.length === 1 ? "" : "s"}
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
                          className={`rounded-full px-3.5 py-1.5 border shrink-0 ${
                            isActive
                              ? "bg-primary border-primary"
                              : "bg-card border-border"
                          }`}
                        >
                          <Text
                            numberOfLines={1}
                            className={`text-xs font-medium shrink-0 ${
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

              {/* Accounts List (2-column on tablet / landscape) */}
              <View className="flex-col md:flex-row md:flex-wrap gap-3">
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
                      className="w-full md:w-[calc(50%-6px)] flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-4 shadow-sm"
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

                      <View className="items-end gap-1.5">
                        <Text
                          className={`font-mono text-base font-bold ${
                            isNegative ? "text-negative" : "text-foreground"
                          }`}
                        >
                          {formatCurrency(account.balance, account.currency)}
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                          <Pressable
                            onPress={() => handleEditAccount(account)}
                            hitSlop={6}
                            className="h-7 w-7 items-center justify-center rounded-lg bg-muted"
                          >
                            <Feather
                              name="edit-2"
                              size={12}
                              color={theme.foreground}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteAccount(account)}
                            hitSlop={6}
                            className="h-7 w-7 items-center justify-center rounded-lg bg-negative/10"
                          >
                            <Feather
                              name="trash-2"
                              size={12}
                              color={theme.negative}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create / Edit Account Modal */}
      <AccountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        account={selectedAccount}
        defaultCurrency={defaultCurrency}
      />
    </View>
  );
}
