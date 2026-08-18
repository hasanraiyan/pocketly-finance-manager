"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
        "flex flex-1 flex-col",
        isFullBleed ? "min-h-0 overflow-hidden" : "gap-6 p-4 md:p-8"
      )}
    >
      {children}
    </div>
  );
}
