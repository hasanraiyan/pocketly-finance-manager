import type { PersonaCustomTheme, StarterPromptItem } from "@personaai/ui";

export const COPILOT_AGENT_ID = "6a83ea6bb3d55db9792763a6";

// Every value here is a reference into Pocketly's own CSS custom properties
// (see globals.css), not a literal color -- @personaai/ui's --persona-* vars
// become indirections into ours, so they pick up our light/dark toggling for
// free instead of needing separate light/dark values here.
export const COPILOT_THEME: PersonaCustomTheme = {
  primaryColor: "var(--primary)",
  backgroundColor: "var(--background)",
  cardBackgroundColor: "var(--card)",
  textColor: "var(--foreground)",
  mutedTextColor: "var(--muted-foreground)",
  borderColor: "var(--border)",
  userMessageBg: "var(--primary)",
  userMessageText: "var(--primary-foreground)",
  assistantMessageBg: "var(--card)",
  assistantMessageText: "var(--card-foreground)",
  userAvatarBg: "var(--secondary)",
  userAvatarText: "var(--secondary-foreground)",
  assistantAvatarBg: "var(--accent)",
  assistantAvatarText: "var(--accent-foreground)",
};

export const COPILOT_STARTER_PROMPTS: StarterPromptItem[] = [
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
