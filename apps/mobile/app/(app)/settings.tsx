import React, { useEffect, useMemo, useState } from "react";
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
import { GuestUpgradeCard } from "@/components/GuestUpgradeCard";
import { TextField } from "@/components/TextField";
import { CategoryModal } from "@/features/categories/CategoryModal";
import {
  useCategories,
  useDeleteCategory,
  type Category,
} from "@/features/categories/hooks";
import { ChangePasswordModal } from "@/features/settings/ChangePasswordModal";
import { useSendTestNotification } from "@/features/notifications/hooks";
import {
  SCOPE_LABELS,
  SUPPORTED_CURRENCIES,
  useActiveSessions,
  useDeleteMyAccount,
  useDisconnectOAuthClient,
  useOAuthConnections,
  useRevokeOtherSessions,
  useRevokeSession,
  useUpdateProfile,
  useUserProfile,
  type ActiveSession,
  type OAuthConnection,
} from "@/features/settings/hooks";
import { SettingsSkeleton } from "@/features/settings/SettingsSkeleton";
import { ExportModal } from "@/features/transactions/ExportModal";
import { useAuth } from "@/lib/auth-provider";
import { formatDate } from "@/lib/format";
import { theme } from "@/lib/theme";

export default function SettingsScreen() {
  const { user: authUser, logout, isGuest } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
    isRefetching: profileRefetching,
  } = useUserProfile();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
    isRefetching: categoriesRefetching,
  } = useCategories();

  const {
    data: sessions = [],
    isLoading: sessionsLoading,
    refetch: refetchSessions,
    isRefetching: sessionsRefetching,
  } = useActiveSessions();

  const {
    data: connections = [],
    isLoading: connectionsLoading,
    refetch: refetchConnections,
    isRefetching: connectionsRefetching,
  } = useOAuthConnections();

  const updateProfile = useUpdateProfile();
  const deleteCategory = useDeleteCategory();
  const revokeSession = useRevokeSession();
  const revokeOthers = useRevokeOtherSessions();
  const disconnectClient = useDisconnectOAuthClient();
  const sendTestNotification = useSendTestNotification();
  const deleteAccount = useDeleteMyAccount();

  async function handleSendTestNotification() {
    try {
      await sendTestNotification.mutateAsync();
      Alert.alert(
        "Test Notification Sent",
        "A push notification has been dispatched to your registered devices!",
      );
    } catch {
      Alert.alert("Notification Error", "Could not dispatch test push alert.");
    }
  }

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Modals state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryDefaultType, setCategoryDefaultType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setCurrency(profile.currency ?? "USD");
    } else if (authUser) {
      setName(authUser.name ?? "");
      setCurrency(authUser.currency ?? "USD");
    }
  }, [profile, authUser]);

  const isRefetching =
    profileRefetching ||
    categoriesRefetching ||
    sessionsRefetching ||
    connectionsRefetching;

  const isLoading =
    (profileLoading ||
      categoriesLoading ||
      sessionsLoading ||
      connectionsLoading) &&
    !isRefetching;

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income"),
    [categories],
  );

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  async function handleSaveProfile() {
    if (!name.trim()) {
      setProfileMsg("Name cannot be empty.");
      return;
    }

    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({
        name: name.trim(),
        currency,
      });
      setProfileMsg("Profile preferences saved successfully!");
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    }
  }

  function handleAddCategory(type: "expense" | "income") {
    setSelectedCategory(null);
    setCategoryDefaultType(type);
    setCategoryModalVisible(true);
  }

  function handleEditCategory(cat: Category) {
    setSelectedCategory(cat);
    setCategoryDefaultType(cat.type as "expense" | "income");
    setCategoryModalVisible(true);
  }

  function handleDeleteCategory(cat: Category) {
    Alert.alert(
      `Delete "${cat.name}"?`,
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(cat._id);
            } catch {
              Alert.alert("Error", "Could not delete category.");
            }
          },
        },
      ],
    );
  }

  function handleDisconnectApp(connection: OAuthConnection) {
    Alert.alert(
      `Disconnect ${connection.clientName}?`,
      "It will immediately lose access to your Pocketly financial data via MCP.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              await disconnectClient.mutateAsync({
                clientId: connection.clientId,
              });
            } catch {
              Alert.alert("Error", "Could not disconnect client.");
            }
          },
        },
      ],
    );
  }

  function handleRevokeSession(session: ActiveSession) {
    Alert.alert(
      "Revoke Session?",
      "This device will be logged out of Pocketly.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeSession.mutateAsync({ sessionId: session.id });
            } catch {
              Alert.alert("Error", "Could not revoke session.");
            }
          },
        },
      ],
    );
  }

  function handleRevokeAllOtherSessions() {
    Alert.alert(
      "Sign Out Other Devices?",
      `This will log out ${otherSessionsCount} other active session${
        otherSessionsCount > 1 ? "s" : ""
      }. Only this device will stay signed in.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out Others",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeOthers.mutateAsync();
            } catch {
              Alert.alert("Error", "Could not revoke other sessions.");
            }
          },
        },
      ],
    );
  }

  function handleSignOut() {
    Alert.alert(
      isGuest ? "Exit Guest Mode" : "Sign Out",
      isGuest
        ? "Are you sure you want to exit guest mode?"
        : "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isGuest ? "Exit Guest Mode" : "Sign Out",
          style: "destructive",
          onPress: () => logout(),
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      isGuest ? "Reset All Local Data?" : "Delete Account Permanently?",
      isGuest
        ? "This will permanently erase all locally stored accounts, transactions, and categories on this device. This cannot be undone."
        : "All your accounts, transactions, budgets, goals, and records will be permanently erased. This action CANNOT be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isGuest ? "Reset Local Data" : "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
            } catch {
              Alert.alert("Error", "Could not delete data.");
            }
          },
        },
      ],
    );
  }

  async function handleRefresh() {
    await Promise.all([
      refetchProfile(),
      refetchCategories(),
      refetchSessions(),
      refetchConnections(),
    ]);
  }

  const initials = (name || authUser?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="w-full border-b border-border bg-background">
        <View className="w-full max-w-5xl mx-auto px-5 md:px-8 pt-16 pb-4">
          <Text className="font-heading text-2xl text-foreground">Settings</Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            Profile, categories, MCP connections & security
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="items-center px-4 md:px-8 py-5 pb-32"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View className="w-full max-w-5xl gap-5">
          <GuestUpgradeCard />

          {isLoading ? (
            <SettingsSkeleton />
          ) : (
            <View className="flex-col md:flex-row gap-5">
              {/* Left Column: Profile & Categories */}
              <View className="flex-1 gap-5">
                {/* 1. Profile Preferences Card */}
                <Card>
                  <CardContent className="gap-4">
                    <View className="flex-row items-center gap-3.5">
                      <View className="h-13 w-13 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                        <Text className="font-heading text-lg text-primary">
                          {initials}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-foreground">
                          {name || authUser?.name || "Pocketly User"}
                        </Text>
                        <Text className="text-xs text-muted-foreground mt-0.5">
                          {profile?.email ?? authUser?.email ?? "user@pocketly.app"}
                        </Text>
                      </View>
                    </View>

                    {/* Name */}
                    <TextField
                      label="Display Name"
                      placeholder="Your full name"
                      value={name}
                      onChangeText={setName}
                    />

                    {/* Email (Read Only) */}
                    <View className="gap-1.5">
                      <Text className="text-sm font-medium text-foreground">
                        Email Address
                      </Text>
                      <View className="flex-row items-center justify-between h-11 rounded-lg border border-border bg-muted/40 px-3">
                        <Text className="text-sm text-muted-foreground">
                          {profile?.email ?? authUser?.email ?? ""}
                        </Text>
                        <View className="flex-row items-center gap-1 rounded bg-positive/10 px-1.5 py-0.5">
                          <Feather name="check" size={10} color={theme.positive} />
                          <Text className="text-[10px] font-semibold text-positive">
                            Verified
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Base Currency */}
                    <View className="gap-2">
                      <Text className="text-sm font-medium text-foreground">
                        Base Ledger Currency
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="-mx-1"
                      >
                        <View className="flex-row gap-2 px-1">
                          {SUPPORTED_CURRENCIES.map((c) => {
                            const isSelected = currency === c.code;
                            return (
                              <Pressable
                                key={c.code}
                                onPress={() => setCurrency(c.code)}
                                className={`rounded-xl px-3.5 py-2 border ${
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
                                  {c.code} ({c.symbol})
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>

                    {profileMsg && (
                      <View
                        className={`rounded-lg p-3 ${
                          profileMsg.includes("success")
                            ? "bg-positive/10 border border-positive/20"
                            : "bg-negative/10 border border-negative/20"
                        }`}
                      >
                        <Text
                          className={`text-xs text-center ${
                            profileMsg.includes("success")
                              ? "text-positive font-medium"
                              : "text-negative"
                          }`}
                        >
                          {profileMsg}
                        </Text>
                      </View>
                    )}

                    <Button
                      loading={updateProfile.isPending}
                      onPress={handleSaveProfile}
                      className="mt-1"
                    >
                      Save Profile Changes
                    </Button>
                  </CardContent>
                </Card>

                {/* 2. Categories Management Card */}
                <Card>
                  <CardContent className="gap-5">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <Feather name="tag" size={14} color={theme.primary} />
                        </View>
                        <Text className="text-sm font-semibold text-foreground">
                          Categories
                        </Text>
                      </View>

                      <Text className="font-mono text-xs font-semibold text-muted-foreground">
                        {categories.length} total
                      </Text>
                    </View>

                    {/* Expense Categories Section */}
                    <View className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Expense Categories ({expenseCategories.length})
                        </Text>
                        <Pressable
                          onPress={() => handleAddCategory("expense")}
                          hitSlop={6}
                          className="flex-row items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 shrink-0 active:opacity-75"
                        >
                          <Feather name="plus" size={13} color={theme.primary} />
                          <Text className="text-xs font-semibold text-primary">
                            Add Expense
                          </Text>
                        </Pressable>
                      </View>

                      {expenseCategories.length === 0 ? (
                        <Text className="text-xs text-muted-foreground italic py-1">
                          No expense categories added yet.
                        </Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-2">
                          {expenseCategories.map((cat) => (
                            <Pressable
                              key={cat._id}
                              onPress={() => handleEditCategory(cat)}
                              className="flex-row items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 active:opacity-75 shadow-2xs"
                            >
                              <View
                                style={{ backgroundColor: cat.color ?? theme.primary }}
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                              />
                              <Text
                                numberOfLines={1}
                                className="text-xs font-medium text-foreground max-w-[150px]"
                              >
                                {cat.name}
                              </Text>
                              <Pressable
                                onPress={() => handleDeleteCategory(cat)}
                                hitSlop={8}
                                className="ml-0.5 shrink-0 p-0.5"
                              >
                                <Feather name="x" size={12} color={theme.mutedForeground} />
                              </Pressable>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* Income Categories Section */}
                    <View className="gap-3 pt-4 border-t border-border/50">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Income Categories ({incomeCategories.length})
                        </Text>
                        <Pressable
                          onPress={() => handleAddCategory("income")}
                          hitSlop={6}
                          className="flex-row items-center gap-1.5 rounded-lg bg-positive/10 px-3 py-1.5 shrink-0 active:opacity-75"
                        >
                          <Feather name="plus" size={13} color={theme.positive} />
                          <Text className="text-xs font-semibold text-positive">
                            Add Income
                          </Text>
                        </Pressable>
                      </View>

                      {incomeCategories.length === 0 ? (
                        <Text className="text-xs text-muted-foreground italic py-1">
                          No income categories added yet.
                        </Text>
                      ) : (
                        <View className="flex-row flex-wrap gap-2">
                          {incomeCategories.map((cat) => (
                            <Pressable
                              key={cat._id}
                              onPress={() => handleEditCategory(cat)}
                              className="flex-row items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 active:opacity-75 shadow-2xs"
                            >
                              <View
                                style={{ backgroundColor: cat.color ?? theme.positive }}
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                              />
                              <Text
                                numberOfLines={1}
                                className="text-xs font-medium text-foreground max-w-[150px]"
                              >
                                {cat.name}
                              </Text>
                              <Pressable
                                onPress={() => handleDeleteCategory(cat)}
                                hitSlop={8}
                                className="ml-0.5 shrink-0 p-0.5"
                              >
                                <Feather name="x" size={12} color={theme.mutedForeground} />
                              </Pressable>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  </CardContent>
                </Card>
              </View>

              {/* Right Column: Connected Apps, Push Notifications, Export, Security, Sessions & Danger Zone */}
              <View className="flex-1 gap-5">
                {/* 3. Connected Apps & MCP Connections Card (Cloud Only) */}
                {!isGuest && (
                  <Card>
                    <CardContent className="gap-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="cpu" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Connected Apps & MCP
                          </Text>
                        </View>

                        <Text className="font-mono text-xs font-semibold text-muted-foreground">
                          {connections.length} active
                        </Text>
                      </View>

                      <Text className="text-xs text-muted-foreground leading-relaxed">
                        External AI agents and IDEs (Cursor, Claude Desktop, Antigravity) authorized to access your financial ledger via MCP.
                      </Text>

                      {connections.length === 0 ? (
                        <View className="items-center justify-center py-6 px-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                          <View className="h-10 w-10 items-center justify-center rounded-xl bg-muted border border-border mb-2">
                            <Feather name="cpu" size={18} color={theme.mutedForeground} />
                          </View>
                          <Text className="text-xs font-medium text-foreground">
                            No MCP clients connected
                          </Text>
                          <Text className="text-[11px] text-muted-foreground text-center mt-0.5 max-w-[220px]">
                            Connect Cursor or Claude to analyze your finances with AI.
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-2.5">
                          {connections.map((conn) => {
                            const clientName = conn.clientName || "AI Assistant";
                            const lower = clientName.toLowerCase();
                            const iconName: keyof typeof Feather.glyphMap =
                              lower.includes("cursor") || lower.includes("code") || lower.includes("vscode")
                                ? "code"
                                : lower.includes("terminal") || lower.includes("cli")
                                ? "terminal"
                                : lower.includes("antigravity")
                                ? "zap"
                                : lower.includes("claude") || lower.includes("anthropic") || lower.includes("ai")
                                ? "cpu"
                                : lower.includes("web") || lower.includes("browser")
                                ? "globe"
                                : "box";

                            return (
                              <View
                                key={conn.id}
                                className="flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-3.5 shadow-2xs"
                              >
                                <View className="flex-row items-center gap-3 flex-1 pr-2">
                                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                                    <Feather name={iconName} size={16} color={theme.primary} />
                                  </View>
                                  <View className="flex-1">
                                    <Text
                                      numberOfLines={1}
                                      className="text-xs font-semibold text-foreground"
                                    >
                                      {clientName}
                                    </Text>
                                    <View className="flex-row flex-wrap gap-1 mt-1">
                                      {conn.scopes.slice(0, 2).map((s) => (
                                        <View
                                          key={s}
                                          className="rounded bg-muted/60 px-1.5 py-0.5 border border-border/50"
                                        >
                                          <Text className="text-[9px] font-medium text-muted-foreground">
                                            {SCOPE_LABELS[s] || s}
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                </View>

                                <Pressable
                                  onPress={() => handleDisconnectApp(conn)}
                                  hitSlop={6}
                                  className="flex-row items-center gap-1 rounded-lg bg-negative/10 px-2.5 py-1.5 active:opacity-75"
                                >
                                  <Feather name="trash-2" size={12} color={theme.negative} />
                                  <Text className="text-xs font-medium text-negative">
                                    Disconnect
                                  </Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 4. Export Reports Card */}
                <Card>
                  <CardContent className="gap-3">
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Feather name="download" size={14} color={theme.primary} />
                      </View>
                      <Text className="text-sm font-semibold text-foreground">
                        Export Ledger Reports
                      </Text>
                    </View>

                    <Text className="text-xs text-muted-foreground leading-relaxed">
                      Generate formatted PDF transaction reports or CSV spreadsheets for personal accounting and tax prep.
                    </Text>

                    <Button
                      variant="outline"
                      onPress={() => setExportModalVisible(true)}
                      className="mt-1 flex-row items-center gap-2"
                    >
                      <Feather name="file-text" size={16} color={theme.foreground} />
                      <Text className="text-sm font-medium text-foreground">
                        Export PDF / CSV Report
                      </Text>
                    </Button>
                  </CardContent>
                </Card>

                {/* 5. Push Notifications Card (Cloud Only) */}
                {!isGuest && (
                  <Card>
                    <CardContent className="gap-3">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="bell" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Push Notifications
                          </Text>
                        </View>

                        <View className="flex-row items-center gap-1 rounded bg-positive/10 px-2 py-0.5">
                          <Feather name="check" size={10} color={theme.positive} />
                          <Text className="text-[10px] font-semibold text-positive">
                            Enabled
                          </Text>
                        </View>
                      </View>

                      <Text className="text-xs text-muted-foreground leading-relaxed">
                        Receive instant alerts for budget overspends, low account balances, and automated money rules.
                      </Text>

                      <Button
                        variant="outline"
                        loading={sendTestNotification.isPending}
                        onPress={handleSendTestNotification}
                        className="mt-1"
                      >
                        Send Test Notification
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* 6. Security Card (Cloud Only) */}
                {!isGuest && (
                  <Card>
                    <CardContent className="gap-3">
                      <View className="flex-row items-center gap-2">
                        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <Feather name="lock" size={14} color={theme.primary} />
                        </View>
                        <Text className="text-sm font-semibold text-foreground">
                          Security & Authentication
                        </Text>
                      </View>

                      <Text className="text-xs text-muted-foreground leading-relaxed">
                        Protect your Pocketly account with an 8+ character password and monitor your active login sessions.
                      </Text>

                      <Button
                        variant="outline"
                        onPress={() => setPasswordModalVisible(true)}
                        className="mt-1"
                      >
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* 7. Active Sessions Card (Cloud Only) */}
                {!isGuest && (
                  <Card>
                    <CardContent className="gap-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="smartphone" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Active Login Sessions
                          </Text>
                        </View>

                        <Text className="font-mono text-xs font-semibold text-muted-foreground">
                          {sessions.length} device{sessions.length === 1 ? "" : "s"}
                        </Text>
                      </View>

                      <View className="gap-2.5">
                        {sessions.map((session) => (
                          <View
                            key={session.id}
                            className={`flex-row items-center justify-between rounded-xl p-3.5 border ${
                              session.isCurrent
                                ? "bg-primary/5 border-primary/40"
                                : "bg-muted/30 border-border/70"
                            }`}
                          >
                            <View className="flex-1 pr-2">
                              <View className="flex-row items-center gap-2">
                                <Feather
                                  name={
                                    session.userAgent?.toLowerCase().includes("mobile")
                                      ? "smartphone"
                                      : "monitor"
                                  }
                                  size={14}
                                  color={session.isCurrent ? theme.primary : theme.foreground}
                                />
                                <Text className="text-xs font-semibold text-foreground">
                                  {session.userAgent
                                    ? session.userAgent.slice(0, 30)
                                    : "Active Device"}
                                </Text>
                                {session.isCurrent && (
                                  <View className="rounded bg-primary/15 px-1.5 py-0.5">
                                    <Text className="text-[10px] font-bold text-primary">
                                      This Device
                                    </Text>
                                  </View>
                                )}
                              </View>

                              <Text className="text-[11px] text-muted-foreground mt-1">
                                {session.ipAddress ? `IP: ${session.ipAddress} • ` : ""}
                                Active since {formatDate(session.createdAt)}
                              </Text>
                            </View>

                            {!session.isCurrent && (
                              <Pressable
                                onPress={() => handleRevokeSession(session)}
                                hitSlop={6}
                                className="rounded-md bg-negative/10 px-2.5 py-1"
                              >
                                <Text className="text-xs font-medium text-negative">
                                  Revoke
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        ))}
                      </View>

                      {otherSessionsCount > 0 && (
                        <Button
                          variant="outline"
                          onPress={handleRevokeAllOtherSessions}
                          loading={revokeOthers.isPending}
                          className="mt-1"
                        >
                          Sign Out Other Devices ({otherSessionsCount})
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* 8. Account Actions / Danger Zone */}
                <Card>
                  <CardContent className="gap-3">
                    <Button variant="outline" onPress={handleSignOut}>
                      {isGuest ? "Exit Guest Mode" : "Sign Out of Pocketly"}
                    </Button>

                    <Pressable
                      onPress={handleDeleteAccount}
                      className="items-center justify-center py-2"
                    >
                      <Text className="text-xs font-medium text-negative">
                        {isGuest ? "Reset All Local Ledger Data" : "Delete Account Permanently"}
                      </Text>
                    </Pressable>
                  </CardContent>
                </Card>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      {/* Category Modal */}
      <CategoryModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        category={selectedCategory}
        defaultType={categoryDefaultType}
      />

      {/* Export Report Modal */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />
    </View>
  );
}
