import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Pocketly stores, why, and how you can delete it.",
};

export default async function PrivacyPage() {
  const session = await getServerSession();

  return (
    <LegalPageShell
      title="Privacy Policy"
      updated="16 August 2026"
      authenticated={Boolean(session)}
    >
      <p>
        This describes what Pocketly actually stores about you and why --
        not a generic template. If a claim here stops being true, this page
        is what needs to change.
      </p>

      <section>
        <h2>What we store</h2>
        <ul>
          <li>
            Account details: your name, email, and password. Your password
            is hashed -- we never store or can see it in plain text.
          </li>
          <li>Preferences: your timezone and default currency.</li>
          <li>
            The financial data you enter: accounts, transactions, budgets,
            and categories.
          </li>
        </ul>
        <p>We don&apos;t collect anything beyond what the product needs to run. There are no analytics or advertising trackers on Pocketly today.</p>
      </section>

      <section>
        <h2>Why we store it</h2>
        <p>
          Solely to provide the product: to show your balances, log your
          records, calculate your budgets, and personalize dates and
          currency formatting to you.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Pocketly sets a session cookie to keep you signed in. That&apos;s
          it -- no tracking or marketing cookies.
        </p>
      </section>

      <section>
        <h2>AI assistants (MCP)</h2>
        <p>
          Pocketly doesn&apos;t send your data to any AI provider on its
          own. Your data only reaches an AI assistant if you explicitly
          connect one (see the <Link href="/mcp-guide">connection guide</Link>
          ) and approve what it can access -- read-only, or read and write.
          Disconnecting takes effect immediately: Pocketly rejects that
          client&apos;s access right away, not just the next time it would
          have expired. You can review and disconnect any connected client
          from Settings at any time.
        </p>
      </section>

      <section>
        <h2>Who we share data with</h2>
        <p>
          We don&apos;t sell your data, and we don&apos;t share it with
          third parties -- except an AI client you&apos;ve personally
          connected and approved, as described above. Data is stored with
          our database provider (MongoDB) purely as infrastructure; they
          don&apos;t use it for anything of their own.
        </p>
      </section>

      <section>
        <h2>Deleting your data</h2>
        <p>
          You can permanently delete your account from Settings &rarr;
          Danger Zone. This removes your accounts, records, budgets, and
          categories, and disconnects any AI clients -- it can&apos;t be
          undone.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Passwords are hashed, and AI client access is scoped and
          revocable rather than an all-or-nothing API key. No online
          service can guarantee perfect security, but we don&apos;t take
          shortcuts on the basics.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>Pocketly isn&apos;t directed at children under 13, and we don&apos;t knowingly collect data from them.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If what Pocketly stores or does with it changes, we&apos;ll
          update this page and the date at the top.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions, or want your data deleted and can&apos;t access your
          account:{" "}
          <a href="mailto:raiyanhasan2006@gmail.com">
            raiyanhasan2006@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
