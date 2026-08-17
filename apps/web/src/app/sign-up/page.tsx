import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Start keeping your money like a ledger.",
};

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-b from-background via-background to-muted/30">
      <SignUpForm />
    </main>
  );
}
