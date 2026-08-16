"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleAlert,
  Calendar,
  FileText,
  ShieldAlert,
  Info,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  usePushNotificationManager,
  type NotificationItem,
} from "./hooks";

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "BUDGET_ALERT":
      return <CircleAlert className="size-4 text-destructive" />;
    case "DAILY_REMINDER":
      return <Calendar className="size-4 text-primary" />;
    case "MONTHLY_REPORT":
      return <FileText className="size-4 text-emerald-500" />;
    case "SECURITY":
      return <ShieldAlert className="size-4 text-amber-500" />;
    default:
      return <Info className="size-4 text-muted-foreground" />;
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { permissionStatus, isRegistering, enablePushNotifications } = usePushNotificationManager();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function handleNotificationClick(item: NotificationItem) {
    if (!item.read) {
      markRead.mutate(item._id);
    }
    if (item.actionUrl) {
      setOpen(false);
      router.push(item.actionUrl);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative flex size-8 items-center justify-center rounded-none border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label="Open notification center"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center bg-destructive font-mono text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 sm:w-96">
        <PopoverHeader className="flex flex-row items-center justify-between border-b border-border p-3">
          <div className="flex items-center gap-2">
            <PopoverTitle className="font-heading text-sm">Notifications</PopoverTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </PopoverHeader>

        {/* Push Notification Opt-in Prompt */}
        {permissionStatus === "default" && (
          <div className="flex flex-col gap-2 border-b border-border bg-accent/40 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="font-medium text-foreground">Stay on track</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Turn on notifications for budget alerts and daily reminders even when Pocketly is closed.
            </p>
            <Button
              size="sm"
              variant="default"
              className="mt-1 h-7 text-xs"
              onClick={enablePushNotifications}
              disabled={isRegistering}
            >
              {isRegistering ? <Spinner className="mr-1 size-3" /> : <Bell className="mr-1 size-3" />}
              Turn on notifications
            </Button>
          </div>
        )}

        {/* Notification Feed */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner className="size-5" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <Empty>
                <EmptyHeader>
                  <EmptyTitle className="text-sm">All caught up!</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    You have no new notifications right now.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className={`flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/50 ${
                  !item.read ? "bg-accent/20 font-medium" : ""
                }`}
              >
                <div className="mt-0.5 shrink-0">{getNotificationIcon(item.type)}</div>
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-foreground">{item.title}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border p-2 text-center">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:underline"
          >
            Notification settings & devices →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
