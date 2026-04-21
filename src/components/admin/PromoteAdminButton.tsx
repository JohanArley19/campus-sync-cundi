import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminExists, useIsAdmin } from "@/hooks/useIsAdmin";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Botón visible sólo cuando NO existe ningún admin todavía.
 * Permite que el primer usuario de la plantilla se autoasigne el rol.
 * Una vez existe un admin, este componente no se muestra.
 */
export function PromoteAdminButton() {
  const { data: adminExists, isLoading: loadingExists } = useAdminExists();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (loadingExists || adminExists || isAdmin) return null;

  const promote = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("bootstrap_first_admin");
      if (error) throw error;
      if (!data) {
        toast.error("Ya existe un administrador.");
      } else {
        toast.success("Eres el administrador del sistema.");
        await qc.invalidateQueries({ queryKey: ["is-admin"] });
        await qc.invalidateQueries({ queryKey: ["admin-exists"] });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo asignar el rol.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-bold text-foreground">
          Aún no hay administrador
        </p>
        <p className="font-body text-xs text-muted-foreground mt-0.5">
          Esta es una plantilla. El primer usuario puede asignarse el rol Administrador para
          gestionar y monitorear la plataforma.
        </p>
      </div>
      <Button size="sm" onClick={promote} disabled={loading} className="font-body shrink-0">
        {loading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1" />}
        Asignarme admin
      </Button>
    </div>
  );
}
