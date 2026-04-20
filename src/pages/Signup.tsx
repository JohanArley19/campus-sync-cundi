import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import AuthLayout from "@/components/auth/AuthLayout";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/app`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cuenta creada. Revisa tu correo para confirmar.");
      navigate("/login");
    }
  };

  return (
    <AuthLayout>
      <SEOHead title="Crear cuenta — Sistema Académico" />
      <div className="text-center space-y-1.5">
        <h1 className="font-display text-2xl font-bold text-foreground">Crea tu cuenta</h1>
        <p className="font-body text-sm text-muted-foreground">Empieza a organizar tu semestre en minutos</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nombre</Label>
          <Input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre" required />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Correo</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
        </div>
        <div className="space-y-1.5">
          <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Contraseña</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
        </div>
        <Button type="submit" className="w-full font-body shadow-sm" disabled={loading}>
          {loading ? "Creando…" : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center font-body text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-primary font-medium hover:underline">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}
