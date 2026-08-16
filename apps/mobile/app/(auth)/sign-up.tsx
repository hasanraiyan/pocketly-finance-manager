import { AuthView } from "@clerk/expo/native";

/** See app/(auth)/sign-in.tsx for why this uses Clerk's native AuthView. */
export default function SignUpScreen() {
  return <AuthView mode="signUp" isDismissible={false} />;
}
