"use client";

import { useState, useEffect } from "react";
import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { usePushNotificationManager } from "./hooks";

const DISMISS_KEY = "pocketly_notif_prompt_dismissed_at";

export function NotificationPromptBanner() {
  const [visible, setVisible] = useState(false);
  const { permissionStatus, isRegistering, enablePushNotifications } =
    usePushNotificationManager();

  useEffect(() => {
    if (permissionStatus !== "default") {
      return;
    }

    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSinceDismiss =
        (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return;
      }
    }

    // Show prompt after 1.5s on dashboard
    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [permissionStatus]);

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
  }

  async function handleEnable() {
    await enablePushNotifications();
    setVisible(false);
  }

  if (!visible || permissionStatus !== "default") return null;

  return (
    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border bg-accent/40 p-4 transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-foreground">
            Stay on top of your money
          </span>
          <p className="text-xs text-muted-foreground">
            Enable instant alerts for budget limits and daily streak reminders even when Pocketly is closed.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Maybe later
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleEnable}
          disabled={isRegistering}
          className="h-8 px-3 text-xs font-medium"
        >
          {isRegistering ? (
            <Spinner className="mr-1.5 size-3.5" />
          ) : (
            <Bell className="mr-1.5 size-3.5" />
          )}
          Enable notifications
        </Button>
      </div>
    </div>
  );
}
