"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronsUpDown,
  LogOut,
  Sparkles,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-provider";
import { useUserProfile } from "@/features/settings/hooks";

export const NAV_ITEMS = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "AI Copilot", url: "/copilot", icon: Sparkles },
  { title: "Accounts", url: "/accounts", icon: Wallet },
  { title: "Records", url: "/records", icon: Receipt },
  { title: "Analysis", url: "/analysis", icon: LineChart },
  { title: "Goals", url: "/goals", icon: Flag },
  { title: "Planning", url: "/planning", icon: Target },
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
        <UserMenu name={profile?.name} email={profile?.email} />
      </SidebarFooter>
    </Sidebar>
  );
}

/**
 * Hand-built replacement for Clerk's `<UserButton/>`. "Manage account"
 * (password, devices, connected apps) lives on the Settings page now
 * instead of a Clerk-hosted popover -- there's no separate identity
 * provider surface left to link out to.
 */
function UserMenu({ name, email }: { name?: string; email?: string }) {
  const router = useRouter();
  const { logout } = useAuth();
  const initial = (name || email || "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    await logout();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent">
            <Avatar className="size-6">
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate">{name || email || "Account"}</span>
            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/50" />
          </SidebarMenuButton>
        }
      />
      <DropdownMenuContent align="start" className="w-56">
        <div className="flex flex-col px-2 py-1.5">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/feedback" />}>
          <MessageSquarePlus />
          Feedback & Ideas
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleSignOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
