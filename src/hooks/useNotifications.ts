import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Notification = {
  id: string;
  user_id: string;
  type: "due_soon" | "overdue" | "ai_daily" | "info";
  title: string;
  body: string | null;
  link: string | null;
  activity_id: string | null;
  due_at: string | null;
  read_at: string | null;
  created_at: string;
  dedupe_key: string;
};

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/**
 * Genera notificaciones de vencimientos próximos y dispara la sugerencia IA
 * diaria. Idempotente por día (lo controla el backend).
 * Se ejecuta una vez por sesión cuando el usuario abre la app.
 */
export function useEnsureDailyNotifications() {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || !session?.access_token || ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        await supabase.rpc("generate_due_notifications_for_me");
      } catch {
        /* noop */
      }
      try {
        await supabase.functions.invoke("daily-ai-suggestion");
      } catch {
        /* noop: sesión expirada o fallo de red, no rompe la UI */
      }
      qc.invalidateQueries({ queryKey: ["notifications"] });
    })();
  }, [user, session, qc]);
}
