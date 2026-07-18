"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

/**
 * Header bell — polls /api/notifications on mount, on every dropdown open,
 * and every 60s in between. A 401 (signed out, or keyless with no seeded
 * demo operator) is treated the same as "no notifications": the bell just
 * renders with no dot, no console noise, no retry storm.
 */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [unread, setUnread] = React.useState(0);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        // Signed out / keyless without a seeded user — same as "nothing yet".
        setUnread(0);
        setNotifications([]);
        return;
      }
      const data = (await res.json()) as {
        unread?: number;
        notifications?: NotificationItem[];
      };
      setUnread(typeof data.unread === "number" ? data.unread : 0);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Offline or a blip — degrade silently and let the next poll retry.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleSelect = React.useCallback(
    (item: NotificationItem) => {
      if (!item.readAt) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n)),
        );
        setUnread((prev) => Math.max(0, prev - 1));
        void markNotificationRead(item.id);
      }
      if (item.href) router.push(item.href);
    },
    [router],
  );

  const handleMarkAllRead = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
      setUnread(0);
      void markAllNotificationsRead().then(() => fetchNotifications());
    },
    [fetchNotifications],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-info ring-2 ring-card" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-[380px] overflow-y-auto p-1">
          {loading ? (
            <div className="space-y-3 p-2.5">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing yet — activity on your tasks will land here.
            </p>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.readAt;
              return (
                <DropdownMenuItem
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  className="flex flex-col items-start gap-0.5 whitespace-normal rounded-md px-2.5 py-2.5"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    <span
                      className={cn(
                        "text-sm",
                        isUnread ? "font-medium text-foreground" : "font-normal text-foreground/80",
                      )}
                    >
                      {item.title}
                    </span>
                    {isUnread && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
                    )}
                  </div>
                  {item.body && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                  )}
                  <span className="text-[11px] text-muted-foreground/70">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
