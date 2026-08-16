import { AuthView } from "@clerk/expo/native";

/**
 * Clerk's prebuilt native auth UI (SwiftUI/Jetpack Compose) -- handles every
 * verification path (2FA, email code, etc.) that the hand-built screens in
 * src/features/auth-custom don't yet cover. Swap back to the custom screens
 * once that UI grows to match.
 */
export default function SignInScreen() {
  return <AuthView mode="signIn" isDismissible={false} />;
}
