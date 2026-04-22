import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Sparkles, AlertTriangle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
} from "@/hooks/useNotifications";

const ICONS: Record<Notification["type"], React.ReactNode> = {
  ai_daily: <Sparkles className="h-4 w-4 text-accent" />,
  due_soon: <Clock className="h-4 w-4 text-accent" />,
  overdue: <AlertTriangle className="h-4 w-4 text-destructive" />,
  info: <Info className="h-4 w-4 text-primary" />,
};

const TONE: Record<Notification["type"], string> = {
  ai_daily: "bg-accent-soft",
  due_soon: "bg-accent-soft",
  overdue: "bg-destructive/10",
  info: "bg-primary-soft",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function NotificationBell() {
  const { data: items = [] } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const navigate = useNavigate();

  const unread = items.filter((n) => !n.read_at).length;

  const handleClick = (n: Notification) => {
    if (!n.read_at) markOne.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={`Notificaciones${unread > 0 ? `, ${unread} sin leer` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-4 text-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <p className="font-display text-sm font-bold">Notificaciones</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs font-body"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-body text-sm text-muted-foreground">
              Sin notificaciones por ahora.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !n.read_at ? "bg-accent-soft/30" : ""
                  }`}
                  onClick={() => handleClick(n)}
                >
                  <div className="flex gap-2.5">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${TONE[n.type]}`}
                    >
                      {ICONS[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-body text-sm font-semibold text-foreground truncate">
                          {n.title}
                        </p>
                        <span className="font-body text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                    </div>
                    {!n.read_at && (
                      <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
