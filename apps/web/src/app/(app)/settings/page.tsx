import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <ComingSoon
      icon={SettingsIcon}
      title="Settings"
      description="Update your currency, timezone, and account here soon."
    />
  );
}
