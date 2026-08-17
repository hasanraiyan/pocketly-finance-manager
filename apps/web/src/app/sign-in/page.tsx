import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/features/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Pocketly ledger.",
};

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-b from-background via-background to-muted/30">
      {/* useSearchParams (for ?redirect=) needs a Suspense boundary for static rendering. */}
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </main>
  );
}
