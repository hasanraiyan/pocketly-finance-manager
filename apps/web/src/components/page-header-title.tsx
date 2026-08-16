"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/app-sidebar";

export function PageHeaderTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.url));

  return (
    <span className="font-heading text-sm text-foreground">
      {current?.title ?? "Pocketly"}
    </span>
  );
}
