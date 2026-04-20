import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import AuthLayout from "@/components/auth/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/app", { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/app");
    }
  };

  return (
    <AuthLayout>
      <SEOHead title="Iniciar sesión — Sistema Académico" />
      <div className="text-center space-y-1.5">
        <h1 className="font-display text-2xl font-bold text-foreground">Bienvenido de vuelta</h1>
        <p className="font-body text-sm text-muted-foreground">Ingresa para continuar con tu semestre</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Correo</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Contraseña</Label>
            <Link to="/forgot-password" className="font-body text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
          </div>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <Button type="submit" className="w-full font-body shadow-sm" disabled={loading}>
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </form>

      <p className="font-body text-center text-sm text-muted-foreground">
        ¿Aún no tienes cuenta?{" "}
        <Link to="/signup" className="text-primary font-medium hover:underline">Crear cuenta</Link>
      </p>
    </AuthLayout>
  );
}
