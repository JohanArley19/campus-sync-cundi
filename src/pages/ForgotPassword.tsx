import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import AuthLayout from "@/components/auth/AuthLayout";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
      toast.success("Correo de recuperación enviado");
    }
  };

  return (
    <AuthLayout>
      <SEOHead title="Recuperar contraseña — CampusSync" />
      <div className="text-center space-y-1.5">
        <h1 className="font-display text-2xl font-bold text-foreground">Recuperar contraseña</h1>
        <p className="font-body text-sm text-muted-foreground">
          Te enviaremos un enlace seguro con expiración para restablecerla.
        </p>
      </div>

      {sent ? (
        <div className="rounded-lg bg-primary-soft border border-primary/20 p-4 text-center">
          <p className="font-body text-sm text-foreground">
            Revisa <strong>{email}</strong>. El enlace expira pronto, úsalo cuanto antes.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="font-body text-xs uppercase tracking-wider text-muted-foreground font-semibold">Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required />
          </div>
          <Button type="submit" className="w-full font-body shadow-sm" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}

      <p className="text-center font-body text-sm text-muted-foreground">
        <Link to="/login" className="text-primary font-medium hover:underline">Volver a iniciar sesión</Link>
      </p>
    </AuthLayout>
  );
}
