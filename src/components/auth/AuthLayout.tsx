import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4 py-10">
      <Link to="/" className="flex items-center justify-center gap-2 mb-6">
        <div className="h-10 w-10 rounded-lg gradient-hero flex items-center justify-center shadow-emerald">
          <GraduationCap className="h-6 w-6 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <span className="font-display text-lg font-bold text-foreground leading-tight">CampusSync</span>
          <span className="font-body text-[11px] text-muted-foreground leading-tight">Universidad de Cundinamarca</span>
        </div>
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-md p-8 space-y-6 animate-fade-in">
        {children}
      </div>
    </div>
  );
}
