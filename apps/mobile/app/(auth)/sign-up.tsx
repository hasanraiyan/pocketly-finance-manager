import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
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

export default function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace("/(app)/dashboard");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't create your account. Please try again.",
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
          <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <Feather name="pocket" size={28} color={theme.primary} />
          </View>
          <Text className="font-heading text-3xl text-foreground text-center">
            Pocketly
          </Text>
          <Text className="mt-1 font-heading text-xl text-foreground text-center">
            Create your account
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground px-4">
            Start mastering your cash flow with double-entry precision tracking
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Full Name"
            autoCapitalize="words"
            autoComplete="name"
            placeholder="e.g. Alex Morgan"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(null);
            }}
          />
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

          <Button loading={loading} onPress={handleSignUp} className="mt-2">
            Create account
          </Button>
        </View>

        <View className="mt-8 flex-row justify-center gap-1.5">
          <Text className="text-sm text-muted-foreground">
            Already have an account?
          </Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-sm font-semibold text-primary">Sign in</Text>
          </Link>
        </View>

        <View className="mt-10 flex-row items-center justify-center gap-2 border-t border-border pt-6">
          <Feather name="shield" size={14} color={theme.primary} />
          <Text className="text-xs text-muted-foreground">
            Free ledger • AI financial analysis • No hidden fees
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
