"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { CloudUpload, ShieldAlert, X } from "lucide-react";

export function GuestBanner() {
  const { isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isGuest || dismissed) return null;

  return (
    <div className="relative mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground shadow-sm">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="size-4 shrink-0 text-amber-500" />
        <div>
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            Guest Mode (Local Offline Storage)
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your accounts and records are stored safely in this browser. Create an account to sync across devices & enable AI Copilot.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="default" render={<Link href="/sign-up" />} className="h-8 text-xs font-medium">
          <CloudUpload className="mr-1.5 size-3.5" />
          Sign Up & Sync
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setDismissed(true)}
          className="size-7 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
