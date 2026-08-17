"use client";

import { ShieldAlert, User, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { useAdminAuditLogs } from "./hooks";

export function AdminAuditLogView() {
  const { data, isLoading } = useAdminAuditLogs({ limit: 50 });
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Security & Administrative Audit Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable record of administrative changes, status updates, and role modifications
              </CardDescription>
            </div>
            <ShieldAlert className="size-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
              No administrative audit entries logged yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((log) => (
                <div
                  key={log._id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-2xs uppercase">
                        {log.action}
                      </Badge>
                      <span className="font-medium text-foreground">
                        Target: {log.targetType} ({log.targetId.slice(-6)})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-2xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="size-3" />
                        {log.adminEmail}
                      </span>
                      {log.ip && (
                        <span className="flex items-center gap-1 font-mono">
                          <Terminal className="size-3" />
                          {log.ip}
                        </span>
                      )}
                    </div>
                    {Object.keys(log.details || {}).length > 0 && (
                      <div className="font-mono text-2xs bg-muted/60 px-2 py-1 rounded max-w-lg truncate">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </div>

                  <div className="text-2xs text-muted-foreground font-mono shrink-0 sm:text-right">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
