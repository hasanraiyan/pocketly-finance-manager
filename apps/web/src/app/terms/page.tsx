import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-session";
import { LegalPageShell } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern using Pocketly.",
};

export default async function TermsPage() {
  const session = await getServerSession();

  return (
    <LegalPageShell
      title="Terms of Service"
      updated="16 August 2026"
      authenticated={Boolean(session)}
    >
      <p>
        These terms govern your use of Pocketly. By creating an account, you
        agree to them. Pocketly is an independently run, actively developed
        project -- if anything here doesn&apos;t match what the product
        actually does, the product is what&apos;s wrong, and you&apos;re
        welcome to tell us.
      </p>

      <section>
        <h2>What Pocketly is</h2>
        <p>
          Pocketly is a personal finance ledger: you record accounts,
          income, expenses, and transfers, set budgets, and review your
          spending. It is currently free to use. It is not a bank, a
          payment processor, or a licensed financial advisor, and nothing in
          the product is financial advice.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <ul>
          <li>You need accurate name and email details to sign up.</li>
          <li>You&apos;re responsible for keeping your password secret.</li>
          <li>
            You&apos;re responsible for the data you enter and for reviewing
            it before relying on it -- Pocketly reflects what you record, it
            doesn&apos;t independently verify it against your bank.
          </li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use Pocketly for anything illegal.</li>
          <li>
            Try to access another user&apos;s data, or probe, scan, or
            interfere with the service&apos;s security.
          </li>
          <li>
            Automate access to the API or scrape the service outside of the
            documented MCP integration described below.
          </li>
        </ul>
      </section>

      <section>
        <h2>Connecting AI assistants (MCP)</h2>
        <p>
          Pocketly can expose your data to an AI assistant (like Claude or
          ChatGPT) that you explicitly connect, using the Model Context
          Protocol. You choose what it can read or change when you approve
          the connection, and you can revoke access at any time -- see the{" "}
          <Link href="/mcp-guide">connection guide</Link> and our{" "}
          <Link href="/privacy">Privacy Policy</Link> for details on how that
          works.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          Pocketly is provided &quot;as is,&quot; without warranty of any
          kind. It&apos;s under active development: features may change, and
          we don&apos;t guarantee uninterrupted availability. To the extent
          permitted by law, we aren&apos;t liable for losses arising from
          your use of the service, including decisions made based on data
          you recorded in it.
        </p>
      </section>

      <section>
        <h2>Ending your account</h2>
        <p>
          You can delete your account at any time from Settings -- this
          permanently removes your financial data. We may suspend or
          terminate accounts that violate these terms.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update these terms as the product changes. Material
          changes will update the date at the top of this page.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="mailto:raiyanhasan2006@gmail.com">
            raiyanhasan2006@gmail.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
