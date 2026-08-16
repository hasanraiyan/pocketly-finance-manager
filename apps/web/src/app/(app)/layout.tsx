import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-session";
import { AppSidebar } from "@/components/app-sidebar";
import { PageHeaderTitle } from "@/components/page-header-title";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <PageHeaderTitle />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
