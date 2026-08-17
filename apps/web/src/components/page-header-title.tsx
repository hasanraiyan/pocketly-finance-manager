"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/app-sidebar";

export function PageHeaderTitle() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) {
    return <span className="font-heading text-sm text-foreground">Admin Operations</span>;
  }
  if (pathname.startsWith("/feedback")) {
    return <span className="font-heading text-sm text-foreground">Feedback & Feature Requests</span>;
  }
  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.url));

  return (
    <span className="font-heading text-sm text-foreground">
      {current?.title ?? "Pocketly"}
    </span>
  );
}
