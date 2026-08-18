"use client";

import { PersonaChatView } from "@personaai/ui";
import { useAuth } from "@/lib/auth-provider";

const AGENT_ID = "6a83ea6bb3d55db9792763a6";

const STARTER_PROMPTS = [
  {
    title: "Safe-to-Spend",
    prompt:
      "What is my current safe-to-spend balance and how much runway do I have left for discretionary spending this week?",
    icon: "🛡️",
  },
  {
    title: "Spending Breakdown",
    prompt:
      "Analyze my top spending categories for this month. Where did most of my money go?",
    icon: "📊",
  },
  {
    title: "Budget 50/30/20",
    prompt:
      "Based on my income and spending habits, suggest realistic 50/30/20 budget adjustments.",
    icon: "🎯",
  },
  {
    title: "Subscriptions",
    prompt:
      "List all my upcoming recurring bills and subscriptions due this week.",
    icon: "🔄",
  },
];

export default function CopilotPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full p-4 md:p-6">
      <PersonaChatView
        agentId={AGENT_ID}
        title="Financial Copilot"
        greeting={`Good to see you, ${firstName}. How can I help with your finances today?`}
        starterPrompts={STARTER_PROMPTS}
        showSidebar
        showFilesDrawer
      />
    </div>
  );
}
