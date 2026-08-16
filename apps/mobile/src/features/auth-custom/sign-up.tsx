import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/expo";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const router = useRouter();
  const [step, setStep] = useState<"details" | "verify">("details");
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: createError } = await signUp.password({
        emailAddress,
        password,
      });
      if (createError) {
        setError(createError.longMessage ?? createError.message);
        return;
      }
      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError(sendError.longMessage ?? sendError.message);
        return;
      }
      setStep("verify");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: verifyError } =
        await signUp.verifications.verifyEmailCode({ code });
      if (verifyError) {
        setError(verifyError.longMessage ?? verifyError.message);
        return;
      }
      if (signUp.status === "complete") {
        await signUp.finalize({
          navigate: () => router.replace("/(app)/dashboard"),
        });
      } else {
        setError("Couldn't finish signing up. Try again.");
      }
    } finally {
      setSubmitting(false);
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
        {step === "details" ? (
          <>
            <Text className="mb-2 font-heading text-3xl text-foreground">
              Start your ledger
            </Text>
            <Text className="mb-8 text-base text-muted-foreground">
              Takes less than a minute.
            </Text>
            <View className="gap-4">
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={emailAddress}
                onChangeText={setEmailAddress}
              />
              <TextField
                label="Password"
                secureTextEntry
                autoComplete="new-password"
                value={password}
                onChangeText={setPassword}
              />
              {error && <Text className="text-sm text-negative">{error}</Text>}
              <Button loading={submitting} onPress={handleCreate}>
                Continue
              </Button>
            </View>
            <View className="mt-8 flex-row justify-center gap-1.5">
              <Text className="text-sm text-muted-foreground">
                Already have an account?
              </Text>
              <Link href="/(auth)/sign-in">
                <Text className="text-sm font-medium text-primary">
                  Sign in
                </Text>
              </Link>
            </View>
          </>
        ) : (
          <>
            <Text className="mb-2 font-heading text-3xl text-foreground">
              Check your email
            </Text>
            <Text className="mb-8 text-base text-muted-foreground">
              Enter the code we sent to {emailAddress}.
            </Text>
            <View className="gap-4">
              <TextField
                label="Verification code"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                value={code}
                onChangeText={setCode}
              />
              {error && <Text className="text-sm text-negative">{error}</Text>}
              <Button loading={submitting} onPress={handleVerify}>
                Verify
              </Button>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
