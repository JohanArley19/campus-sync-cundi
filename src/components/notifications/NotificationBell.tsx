import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Sparkles,
  AlertTriangle,
  Clock,
  Info,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  type Notification,
} from "@/hooks/useNotifications";

const TYPE_LABEL: Record<Notification["type"], string> = {
  ai_daily: "Sugerencia IA",
  due_soon: "Próxima a vencer",
  overdue: "Vencida",
  info: "Información",
};

const ICONS: Record<Notification["type"], React.ReactNode> = {
  ai_daily: <Sparkles className="h-4 w-4" />,
  due_soon: <Clock className="h-4 w-4" />,
  overdue: <AlertTriangle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const TONE: Record<
  Notification["type"],
  { icon: string; chip: string; bar: string }
> = {
  ai_daily: {
    icon: "bg-accent-soft text-accent",
    chip: "bg-accent-soft text-accent",
    bar: "bg-accent",
  },
  due_soon: {
    icon: "bg-accent-soft text-accent",
    chip: "bg-accent-soft text-accent",
    bar: "bg-accent",
  },
  overdue: {
    icon: "bg-destructive/10 text-destructive",
    chip: "bg-destructive/10 text-destructive",
    bar: "bg-destructive",
  },
  info: {
    icon: "bg-primary-soft text-primary",
    chip: "bg-primary-soft text-primary",
    bar: "bg-primary",
  },
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
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-4 text-center ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] p-0 overflow-hidden border-border shadow-xl"
      >
        {/* HEADER institucional */}
        <div className="relative bg-gradient-to-br from-primary to-primary/90 text-primary-foreground px-4 pt-3.5 pb-3">
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-8 w-8 rounded-lg bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold leading-tight">
                  Notificaciones
                </p>
                <p className="font-body text-[11px] text-primary-foreground/80 leading-tight">
                  {unread > 0
                    ? `${unread} sin leer · ${items.length} en total`
                    : `${items.length} en total · al día`}
                </p>
              </div>
            </div>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] font-body text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground shrink-0"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Marcar todas
              </Button>
            )}
          </div>
        </div>

        {/* BODY */}
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary-soft flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <p className="font-body text-sm font-semibold text-foreground">
              Todo en orden
            </p>
            <p className="font-body text-xs text-muted-foreground mt-1">
              Cuando tengas vencimientos próximos o sugerencias IA aparecerán aquí.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[440px]">
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const tone = TONE[n.type];
                const unreadItem = !n.read_at;
                return (
                  <li
                    key={n.id}
                    className={`relative px-3.5 py-3 cursor-pointer transition-colors hover:bg-muted/40 ${
                      unreadItem ? "bg-accent-soft/20" : ""
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    {unreadItem && (
                      <span
                        aria-hidden
                        className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${tone.bar}`}
                      />
                    )}
                    <div className="flex gap-3">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tone.icon}`}
                      >
                        {ICONS[n.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-body text-[9.5px] font-bold uppercase tracking-wide ${tone.chip}`}
                          >
                            {TYPE_LABEL[n.type]}
                          </span>
                          <span className="font-body text-[10px] text-muted-foreground ml-auto shrink-0">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p
                          className={`font-body text-sm text-foreground leading-snug ${
                            unreadItem ? "font-bold" : "font-semibold"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                            {n.body}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}

        {/* FOOTER institucional */}
        <div className="border-t border-border bg-secondary/40 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="font-body text-[10.5px] text-muted-foreground truncate">
                CampusSync · U. de Cundinamarca
              </p>
            </div>
            <span className="font-body text-[10px] text-muted-foreground shrink-0">
              Actualizado en vivo
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
