import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-session";
import { AppContent } from "@/components/app-content";
import { AppSidebar } from "@/components/app-sidebar";
import { CopilotLauncher } from "@/components/copilot-launcher";
import { PageHeaderTitle } from "@/components/page-header-title";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { NotificationCenter } from "@/features/notifications/notification-center";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resource-based auth check: redirects to sign-in if not authenticated.
  // Covers every route under this layout in one place.
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      {/* h-svh + overflow-hidden: a real, viewport-relative height ceiling
          for the whole shell. Without one, everything below here (body is
          min-h-full, SidebarProvider's own wrapper is min-h-svh — both
          "at least", not "exactly") has nothing to divide flex-1/overflow
          against, so long content just grows the whole page instead of
          scrolling inside AppContent — most visible on /copilot, where a
          long conversation scrolled the entire tab instead of the message
          list. AppContent now owns the one real scroll area beneath the
          fixed header. */}
      <SidebarInset className="h-svh overflow-hidden">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <PageHeaderTitle />
          </div>
          <NotificationCenter />
        </header>
        <AppContent>{children}</AppContent>
      </SidebarInset>
      <CopilotLauncher />
    </SidebarProvider>
  );
}
