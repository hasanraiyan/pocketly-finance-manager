import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about using Pocketly.",
};

const FAQS: Array<{
  question: string;
  answerText: string;
  answer: React.ReactNode;
}> = [
  {
    question: "Is Pocketly free?",
    answerText: "Yes, Pocketly is free to use.",
    answer: "Yes, Pocketly is free to use.",
  },
  {
    question: "I forgot my password. How do I get back in?",
    answerText:
      "Use Forgot password on the sign-in page. We'll send a reset link to your email.",
    answer: (
      <>
        Use <Link href="/forgot-password">Forgot password</Link> on the
        sign-in page. We&apos;ll send a reset link to your email.
      </>
    ),
  },
  {
    question: "How do I delete my account?",
    answerText:
      "In Settings, open Danger Zone and confirm the deletion. This permanently removes your accounts, records, budgets, and categories, and disconnects any AI clients you'd connected. It can't be undone.",
    answer:
      "In Settings, open Danger Zone and confirm the deletion. This permanently removes your accounts, records, budgets, and categories, and disconnects any AI clients you'd connected. It can't be undone.",
  },
  {
    question:
      "Can I connect Pocketly to Claude, ChatGPT, or another AI assistant?",
    answerText:
      "Yes, over MCP (Model Context Protocol). Follow the connection guide at /mcp-guide -- you add a server URL in your client, sign in, and approve exactly what it can read or change.",
    answer: (
      <>
        Yes, over MCP (Model Context Protocol). Follow the{" "}
        <Link href="/mcp-guide">connection guide</Link> -- you add a server
        URL in your client, sign in, and approve exactly what it can read
        or change.
      </>
    ),
  },
  {
    question: "What happens if I disconnect a connected AI client?",
    answerText:
      "It loses access immediately. Pocketly rejects that client's access right away rather than waiting for its existing session to expire on its own.",
    answer:
      "It loses access immediately. Pocketly rejects that client's access right away rather than waiting for its existing session to expire on its own.",
  },
  {
    question: "Is my financial data shared with anyone?",
    answerText:
      "No, except an AI client you've personally connected and approved. See the Privacy Policy for the full picture.",
    answer: (
      <>
        No, except an AI client you&apos;ve personally connected and
        approved. See the <Link href="/privacy">Privacy Policy</Link> for
        the full picture.
      </>
    ),
  },
  {
    question: "Is Pocketly available on Android or iOS?",
    answerText:
      "Not yet -- Pocketly is web-only today, with Android and iOS apps coming soon.",
    answer:
      "Not yet -- Pocketly is web-only today, with Android and iOS apps coming soon.",
  },
];

export default async function FaqPage() {
  const session = await getServerSession();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answerText,
      },
    })),
  };

  return (
    <LegalPageShell title="FAQ" authenticated={Boolean(session)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {FAQS.map((faq) => (
        <section key={faq.question}>
          <h2>{faq.question}</h2>
          <p>{faq.answer}</p>
        </section>
      ))}
    </LegalPageShell>
  );
}
