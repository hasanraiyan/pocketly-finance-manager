"use client";

import { useState } from "react";
import {
  Activity,
  MessageSquare,
  Users,
  ShieldAlert,
  Gauge,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAnalyticsView } from "./admin-analytics-view";
import { AdminFeedbackView } from "./admin-feedback-view";
import { AdminUsersView } from "./admin-users-view";
import { AdminAuditLogView } from "./admin-audit-log-view";
import type { AdminAnalytics } from "./hooks";

export function AdminDashboardView({
  initialAnalytics,
}: {
  initialAnalytics?: AdminAnalytics;
}) {
  const [activeTab, setActiveTab] = useState<
    "analytics" | "feedback" | "users" | "audit"
  >("analytics");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="size-6 text-primary" />
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Platform Operations & Admin Control
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Monitor platform health, track aggregate usage, triage user feedback, and manage system operations.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-6"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto p-1 gap-1">
          <TabsTrigger value="analytics" className="gap-2 py-2 text-xs sm:text-sm">
            <Activity className="size-4 text-primary" />
            <span>Platform Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 py-2 text-xs sm:text-sm">
            <MessageSquare className="size-4 text-amber-500" />
            <span>Feedback & Roadmap</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 py-2 text-xs sm:text-sm">
            <Users className="size-4 text-blue-500" />
            <span>User Directory</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2 py-2 text-xs sm:text-sm">
            <ShieldAlert className="size-4 text-rose-500" />
            <span>Audit Trail</span>
          </TabsTrigger>
        </TabsList>

        {activeTab === "analytics" && (
          <AdminAnalyticsView initialData={initialAnalytics} />
        )}
        {activeTab === "feedback" && <AdminFeedbackView />}
        {activeTab === "users" && <AdminUsersView />}
        {activeTab === "audit" && <AdminAuditLogView />}
      </Tabs>
    </div>
  );
}
