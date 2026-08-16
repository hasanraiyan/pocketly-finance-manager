import type { Metadata } from "next";
import { getServerSession } from "@/lib/get-session";
import { McpGuideView } from "@/features/mcp/mcp-guide-view";

export const metadata: Metadata = {
  title: "Connect a client",
};

export default async function McpGuidePage() {
  const session = await getServerSession();
  return <McpGuideView authenticated={Boolean(session)} />;
}
