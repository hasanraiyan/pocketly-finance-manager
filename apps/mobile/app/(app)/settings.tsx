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
import { TextField } from "@/components/TextField";
import { CategoryModal } from "@/features/categories/CategoryModal";
import {
  useCategories,
  useDeleteCategory,
  type Category,
} from "@/features/categories/hooks";
import { ChangePasswordModal } from "@/features/settings/ChangePasswordModal";
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
  const { user: authUser, logout } = useAuth();

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
  const deleteAccount = useDeleteMyAccount();

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
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account Permanently?",
      "All your accounts, transactions, budgets, goals, and records will be permanently erased. This action CANNOT be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync();
              await logout();
            } catch {
              Alert.alert("Error", "Could not delete account.");
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
      <View className="px-6 pt-16 pb-4 border-b border-border bg-background">
        <Text className="font-heading text-2xl text-foreground">Settings</Text>
        <Text className="text-xs text-muted-foreground mt-0.5">
          Profile, categories, MCP connections & security
        </Text>
      </View>

      <ScrollView
        contentContainerClassName="px-5 py-5 pb-32 gap-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {isLoading ? (
          <SettingsSkeleton />
        ) : (
          <View className="gap-4">
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
              <CardContent className="gap-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                      <Feather name="tag" size={14} color={theme.primary} />
                    </View>
                    <Text className="text-sm font-semibold text-foreground">
                      Categories
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleAddCategory("expense")}
                    hitSlop={6}
                    className="flex-row items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1"
                  >
                    <Feather name="plus" size={12} color={theme.primary} />
                    <Text className="text-xs font-semibold text-primary">
                      Add Category
                    </Text>
                  </Pressable>
                </View>

                {/* Expense Categories */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Expense Categories ({expenseCategories.length})
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {expenseCategories.map((cat) => (
                      <Pressable
                        key={cat._id}
                        onPress={() => handleEditCategory(cat)}
                        className="flex-row items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 active:opacity-75"
                      >
                        <View
                          style={{ backgroundColor: cat.color ?? theme.primary }}
                          className="h-2.5 w-2.5 rounded-full"
                        />
                        <Text className="text-xs font-medium text-foreground">
                          {cat.name}
                        </Text>
                        <Pressable
                          onPress={() => handleDeleteCategory(cat)}
                          hitSlop={8}
                          className="ml-1"
                        >
                          <Feather name="trash-2" size={11} color={theme.negative} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Income Categories */}
                <View className="gap-2 pt-2 border-t border-border/50">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Income Categories ({incomeCategories.length})
                    </Text>
                    <Pressable
                      onPress={() => handleAddCategory("income")}
                      hitSlop={6}
                    >
                      <Text className="text-xs font-medium text-primary">
                        + New Income Tag
                      </Text>
                    </Pressable>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {incomeCategories.map((cat) => (
                      <Pressable
                        key={cat._id}
                        onPress={() => handleEditCategory(cat)}
                        className="flex-row items-center gap-2 rounded-xl bg-card border border-border px-3 py-2 active:opacity-75"
                      >
                        <View
                          style={{ backgroundColor: cat.color ?? theme.positive }}
                          className="h-2.5 w-2.5 rounded-full"
                        />
                        <Text className="text-xs font-medium text-foreground">
                          {cat.name}
                        </Text>
                        <Pressable
                          onPress={() => handleDeleteCategory(cat)}
                          hitSlop={8}
                          className="ml-1"
                        >
                          <Feather name="trash-2" size={11} color={theme.negative} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* 3. Connected Apps & MCP Connections Card */}
            <Card>
              <CardContent className="gap-3">
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
                    {connections.length} connected
                  </Text>
                </View>

                <Text className="text-xs text-muted-foreground leading-relaxed">
                  AI tools and assistants (Claude, Cursor, Antigravity) authorized to interact with your Pocketly financial ledger via MCP.
                </Text>

                {connections.length === 0 ? (
                  <View className="items-center justify-center py-4 rounded-xl bg-muted/20 border border-border/40">
                    <Text className="text-xs text-muted-foreground text-center">
                      No external MCP clients connected yet.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-2.5 mt-1">
                    {connections.map((conn) => (
                      <View
                        key={conn.id}
                        className="flex-row items-center justify-between rounded-xl bg-card border border-border p-3"
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-xs font-semibold text-foreground">
                            {conn.clientName}
                          </Text>
                          <Text className="text-[11px] text-muted-foreground mt-0.5">
                            {conn.scopes
                              .map((s) => SCOPE_LABELS[s] || s)
                              .slice(0, 2)
                              .join(" • ")}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => handleDisconnectApp(conn)}
                          hitSlop={6}
                          className="rounded-md bg-negative/10 px-2.5 py-1"
                        >
                          <Text className="text-xs font-medium text-negative">
                            Disconnect
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>

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

            {/* 5. Security Card */}
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

            {/* 6. Active Sessions Card */}
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

            {/* 7. Account Actions / Danger Zone */}
            <Card>
              <CardContent className="gap-3">
                <Button variant="outline" onPress={handleSignOut}>
                  Sign Out of Pocketly
                </Button>

                <Pressable
                  onPress={handleDeleteAccount}
                  className="items-center justify-center py-2"
                >
                  <Text className="text-xs font-medium text-negative">
                    Delete Account Permanently
                  </Text>
                </Pressable>
              </CardContent>
            </Card>
          </View>
        )}
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
