import { GraduationCap, LogOut, BookOpen, ListChecks, LayoutDashboard, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard, end: true },
  { title: "Materias", url: "/app/materias", icon: BookOpen, end: false },
  { title: "Actividades", url: "/app/actividades", icon: ListChecks, end: false },
  { title: "Asistente IA", url: "/app/asistente", icon: Sparkles, end: false },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { signOut, user } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 border-b-2 border-accent/40">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-hero flex items-center justify-center shrink-0 shadow-sm ring-2 ring-accent/30">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-display text-sm font-bold text-foreground leading-tight truncate">
                CampusSync
              </span>
              <span className="font-body text-[10px] text-accent leading-tight truncate font-semibold">
                U. Cundinamarca
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 font-body font-semibold">
            Menú
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={collapsed ? item.title : undefined}
                      className={active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                    >
                      <NavLink to={item.url} end={item.end}>
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span className="font-body text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="my-1.5" />
        {!collapsed && user && (
          <p className="px-2 py-1 font-body text-xs text-muted-foreground truncate">
            {user.email}
          </p>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
              tooltip={collapsed ? "Cerrar sesión" : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="font-body text-sm">Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
