import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404: ruta inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary px-4 text-center">
      <SEOHead title="Página no encontrada — CampusSync" />
      <div className="h-12 w-12 rounded-lg gradient-hero flex items-center justify-center shadow-emerald mb-6">
        <GraduationCap className="h-7 w-7 text-primary-foreground" />
      </div>
      <h1 className="font-display text-6xl font-black text-foreground">404</h1>
      <p className="font-body text-lg text-muted-foreground mt-2 mb-6">
        La página que buscas no existe.
      </p>
      <Link to="/">
        <Button className="font-body">Volver al inicio</Button>
      </Link>
    </div>
  );
}
