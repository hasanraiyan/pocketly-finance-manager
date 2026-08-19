import { useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useObserve } from "expo-observe";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { PasswordInput } from "@/components/PasswordInput";
import { TextField } from "@/components/TextField";
import { DataMigrationModal } from "@/components/DataMigrationModal";
import { getLocalDataSummary, type MigrationSummary } from "@/lib/migration-service";
import { useAuth } from "@/lib/auth-provider";
import { theme } from "@/lib/theme";

export default function SignInScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();
  const { markInteractive } = useObserve();

  useEffect(() => {
    markInteractive();
  }, [markInteractive]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Migration modal state
  const [migrationVisible, setMigrationVisible] = useState(false);
  const [migrationSummary, setMigrationSummary] = useState<MigrationSummary>({
    hasData: false,
    transactionCount: 0,
    accountCount: 0,
    categoryCount: 0,
    budgetCount: 0,
    goalCount: 0,
  });

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email.trim(), password);

      // Check if user had local guest records before logging in
      const summary = await getLocalDataSummary();
      if (summary.hasData) {
        setMigrationSummary(summary);
        setMigrationVisible(true);
      } else {
        router.replace("/(app)/dashboard");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8 items-center">
          <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border shadow-sm overflow-hidden p-2">
            <Image
              source={require("../../assets/pocketly-icon.png")}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>
          <Text className="font-heading text-3xl text-foreground text-center">
            Pocketly
          </Text>
          <Text className="mt-1 font-heading text-xl text-foreground text-center">
            Welcome back
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground px-4">
            Sign in to access your ledger, budgets, and financial intelligence
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError(null);
            }}
          />
          <PasswordInput
            label="Password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError(null);
            }}
          />

          {error && (
            <View className="rounded-lg bg-negative/10 border border-negative/20 p-3">
              <Text className="text-sm text-negative text-center">{error}</Text>
            </View>
          )}

          <Button loading={loading} onPress={handleSignIn} className="mt-2">
            Sign in
          </Button>

          {/* Guest / Local-First Mode */}
          <View className="flex-row items-center my-1">
            <View className="flex-1 h-[1px] bg-border" />
            <Text className="mx-3 text-xs text-muted-foreground uppercase font-medium">
              or
            </Text>
            <View className="flex-1 h-[1px] bg-border" />
          </View>

          <Button
            variant="outline"
            onPress={async () => {
              await continueAsGuest();
              router.replace("/(app)/dashboard");
            }}
            className="flex-row items-center gap-2"
          >
            <Feather name="user-check" size={15} color={theme.foreground} />
            <Text className="text-sm font-medium text-foreground">
              Continue as Guest (No Sign Up)
            </Text>
          </Button>
        </View>

        <View className="mt-8 flex-row justify-center gap-1.5">
          <Text className="text-sm text-muted-foreground">
            Don&apos;t have an account?
          </Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-sm font-semibold text-primary">
              Create one
            </Text>
          </Link>
        </View>

        <View className="mt-10 flex-row items-center justify-center gap-2 border-t border-border pt-6">
          <Feather name="shield" size={14} color={theme.primary} />
          <Text className="text-xs text-muted-foreground">
            Local-first & private • Cloud backup optional
          </Text>
        </View>
      </ScrollView>

      {/* Migration Modal */}
      <DataMigrationModal
        visible={migrationVisible}
        summary={migrationSummary}
        onComplete={() => {
          setMigrationVisible(false);
          router.replace("/(app)/dashboard");
        }}
      />
    </KeyboardAvoidingView>
  );
}
