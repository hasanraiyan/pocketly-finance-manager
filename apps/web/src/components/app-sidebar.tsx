"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  LineChart,
  Target,
  Flag,
  Settings,
  MessageSquarePlus,
  Gauge,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useUserProfile } from "@/features/settings/hooks";

export const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Records", url: "/records", icon: Receipt },
  { title: "Analysis", url: "/analysis", icon: LineChart },
  { title: "Goals", url: "/goals", icon: Flag },
  { title: "Planning", url: "/planning", icon: Target },
  { title: "Feedback", url: "/feedback", icon: MessageSquarePlus },
  { title: "Settings", url: "/settings", icon: Settings },
];

/**
 * Swaps the nav icon for a spinner while that route is in flight, so a tap
 * gets an answer immediately instead of the page sitting still until the
 * new segment arrives. Has to live inside the `Link` for `useLinkStatus` to
 * see the navigation; the sidebar's `[&_svg]:size-4` rule sizes both marks
 * identically, so the swap doesn't shift the row.
 */
function NavIcon({ icon: Icon }: { icon: (typeof NAV_ITEMS)[number]["icon"] }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : <Icon />;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: profile } = useUserProfile();
  const isAdmin = profile?.role === "admin";

  const allNavItems = isAdmin
    ? [...NAV_ITEMS, { title: "Admin Panel", url: "/admin", icon: Gauge }]
    : NAV_ITEMS;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="font-heading text-xl text-sidebar-primary group-data-[collapsible=icon]:hidden">
            Pocketly
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {allNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname.startsWith(item.url)}
                    tooltip={item.title}
                  >
                    <NavIcon icon={item.icon} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {/*
          Clerk's own menu, rather than a hand-rolled one: it adds "Manage
          account" (password, devices, connected accounts) next to Sign out,
          and it owns the identity display, so a long email is truncated by
          Clerk instead of overflowing the popover as it did before.
        */}
        <UserButton
          showName
          appearance={{
            elements: {
              rootBox: "w-full",
              userButtonTrigger:
                "w-full rounded-md px-2 py-1.5 hover:bg-sidebar-accent focus:shadow-none",
              userButtonBox: "w-full flex-row justify-start gap-2",
              userButtonOuterIdentifier:
                "min-w-0 truncate pl-0 text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden",
              userButtonPopoverCard: "max-w-[min(20rem,calc(100vw-2rem))]",
              userPreviewMainIdentifier: "truncate",
              userPreviewSecondaryIdentifier: "truncate",
            },
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
