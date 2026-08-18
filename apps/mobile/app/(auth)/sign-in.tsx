import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
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
import { useAuth } from "@/lib/auth-provider";
import { theme } from "@/lib/theme";

export default function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email.trim(), password);
      router.replace("/(app)/dashboard");
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
              source={require("../../../assets/pocketly-icon.png")}
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
            Encrypted financial ledger • 100% private
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
