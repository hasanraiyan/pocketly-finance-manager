import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { getServerApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboardView } from "@/features/admin/admin-dashboard-view";

export const metadata = {
  title: "Admin Operations | Pocketly",
  description: "Administrative dashboard and platform operations for Pocketly.",
};

export default async function AdminPage() {
  const client = await getServerApiClient();

  // Check user role server-side
  const profileRes = await client.GET("/users/me");
  const profile = profileRes.data?.data;

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader className="space-y-2">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="size-6" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              Administrator privileges are required to view the Pocketly platform operations dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              If you believe you should have access to this area, please contact the system owner to grant your account administrative permissions.
            </p>
            <Button render={<Link href="/dashboard" />} variant="outline" className="gap-2">
              <ArrowLeft className="size-4" />
              <span>Return to Dashboard</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch initial analytics
  const analyticsRes = await client.GET("/admin/analytics");

  return (
    <AdminDashboardView
      initialAnalytics={analyticsRes.data?.data}
    />
  );
}
