import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Start keeping your money like a ledger.",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignUp />
    </main>
  );
}
