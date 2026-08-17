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
        onValueChange={(val) =>
          setActiveTab(val as "analytics" | "feedback" | "users" | "audit")
        }
        className="w-full space-y-6"
      >
        {/* Horizontal scroll rather than a forced grid on narrow screens --
            a 2x2 grid splits the segmented control into disjointed boxes
            instead of one continuous strip. */}
        <div className="overflow-x-auto">
          <TabsList className="h-9 w-fit min-w-full sm:min-w-0">
            <TabsTrigger value="analytics" className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm">
              <Activity className="size-4 text-primary" />
              <span>Platform Metrics</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm">
              <MessageSquare className="size-4 text-amber-500" />
              <span>Feedback & Roadmap</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm">
              <Users className="size-4 text-blue-500" />
              <span>User Directory</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 px-3 py-1.5 text-xs sm:text-sm">
              <ShieldAlert className="size-4 text-rose-500" />
              <span>Audit Trail</span>
            </TabsTrigger>
          </TabsList>
        </div>

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
