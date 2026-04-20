import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, AlertTriangle, Info, ShieldAlert, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Alert = { level: "info" | "warning" | "danger"; text: string };

interface InsightsResult {
  summary: string;
  alerts: Alert[];
}

export function AIInsightsCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-insights", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult({
        summary: data.summary ?? "",
        alerts: data.alerts ?? [],
      });
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo generar el resumen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent-soft flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Resumen IA de tu semana
            </h3>
            <p className="font-body text-xs text-muted-foreground">
              Riesgos, racha y acciones sugeridas
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={result ? "outline" : "default"}
          onClick={generate}
          disabled={loading}
          className="font-body shrink-0"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : result ? (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1" />
          )}
          {result ? "Actualizar" : "Generar"}
        </Button>
      </div>

      {!result && !loading && (
        <p className="font-body text-sm text-muted-foreground">
          Pulsa "Generar" para que la IA analice tu carga académica y te dé un plan de acción.
        </p>
      )}

      {loading && !result && (
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-5/6" />
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.alerts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.alerts.map((a, i) => (
                <AlertChip key={i} alert={a} />
              ))}
            </div>
          )}
          <div className="prose prose-sm max-w-none font-body text-sm text-foreground prose-strong:text-foreground prose-p:my-1.5 prose-ul:my-1.5">
            <ReactMarkdown>{result.summary}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertChip({ alert }: { alert: Alert }) {
  const config = {
    info: { Icon: Info, cls: "bg-primary-soft text-primary border-primary/20" },
    warning: { Icon: AlertTriangle, cls: "bg-accent-soft text-accent border-accent/30" },
    danger: { Icon: ShieldAlert, cls: "bg-destructive/10 text-destructive border-destructive/30" },
  }[alert.level];
  const Icon = config.Icon;
  return (
    <Badge variant="outline" className={`font-body text-[11px] gap-1 ${config.cls}`}>
      <Icon className="h-3 w-3" />
      {alert.text}
    </Badge>
  );
}
