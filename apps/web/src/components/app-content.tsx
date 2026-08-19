"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GuestBanner } from "@/components/guest-banner";

// Routes that manage their own height/scrolling and must not get the
// default page padding (e.g. full-height chat UIs).
const FULL_BLEED_PREFIXES = ["/copilot"];

export function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed = FULL_BLEED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        isFullBleed
          ? "overflow-hidden"
          : "gap-4 sm:gap-6 overflow-y-auto p-3 sm:p-4 md:p-8"
      )}
    >
      {!isFullBleed && <GuestBanner />}
      {children}
    </div>
  );
}
