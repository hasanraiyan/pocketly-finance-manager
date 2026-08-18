"use client";

import { ShieldAlert, User, Terminal } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { formatDate } from "@/lib/format";
import { useAdminAuditLogs, useLoadMoreAdminAuditLogs } from "./hooks";

export function AdminAuditLogView() {
  const { data, isLoading } = useAdminAuditLogs();
  const loadMore = useLoadMoreAdminAuditLogs({});
  const items = data?.items ?? [];

  return (
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
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            No administrative audit entries logged yet.
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-2xs uppercase">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.targetType} <span className="font-mono">({log.targetId.slice(-6)})</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <User className="size-3" />
                        {log.adminEmail}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {log.ip ? (
                        <span className="flex items-center gap-1">
                          <Terminal className="size-3" />
                          {log.ip}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-2xs text-muted-foreground">
                      {Object.keys(log.details || {}).length > 0
                        ? JSON.stringify(log.details)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data?.nextCursor && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMore.mutate(data.nextCursor as string)}
                  disabled={loadMore.isPending}
                  className="gap-1.5 text-xs"
                >
                  {loadMore.isPending && <Spinner className="size-3.5" />}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
