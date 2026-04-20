import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ReactNode } from "react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-secondary/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0 sticky top-0 z-20">
            <div className="flex items-center gap-3 min-w-0">
              <SidebarTrigger className="h-8 w-8" />
              <div className="min-w-0">
                <h1 className="font-display text-base font-bold text-foreground leading-tight truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="font-body text-xs text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
