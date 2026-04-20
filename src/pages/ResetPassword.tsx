import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import AuthLayout from "@/components/auth/AuthLayout";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setValidToken(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidToken(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Contraseña actualizada");
      navigate("/app");
    }
  };

  return (
    <AuthLayout>
      <SEOHead title="Restablecer contraseña — Sistema Académico" />
      <div className="text-center space-y-1.5">
        <h1 className="font-display text-2xl font-bold text-foreground">Nueva contraseña</h1>
        <p className="font-body text-sm text-muted-foreground">Define la contraseña que usarás de ahora en adelante.</p>
      </div>

      {!validToken ? (
        <p className="text-center font-body text-sm text-muted-foreground py-4">Validando enlace…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nueva contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full font-body shadow-sm" disabled={loading}>
            {loading ? "Guardando…" : "Actualizar contraseña"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
