import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { useLanguage } from "@/lib/useLanguage";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH', credentials: 'include' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const typeColors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('justNow') || 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-testid="button-notifications"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-violet-50 transition-all duration-200"
        >
          <Bell className="w-[18px] h-[18px] text-violet-600 fill-violet-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm" data-testid="text-notifications-title">{t('notifications') || 'Notifications'}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllRead}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              {t('markAllRead') || 'Mark all read'}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
              {t('noNotifications') || 'No notifications'}
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-accent/50 transition-colors",
                  !n.is_read && "bg-primary/5"
                )}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", typeColors[n.type] || typeColors.info)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm leading-snug", !n.is_read && "font-medium")}>{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <button className="shrink-0 p-1 hover:bg-accent rounded" onClick={(e) => { e.stopPropagation(); markRead(n.id); }}>
                    <Check className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
