-- Revoke EXECUTE from anon/public on SECURITY DEFINER functions.
-- None of these are needed by unauthenticated users; trigger functions
-- need no API execute grants at all.

-- Trigger-only functions: revoke from everyone (triggers run regardless of grants).
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_activity_status_change() FROM PUBLIC, anon, authenticated;

-- Functions callable from the app, but only for signed-in users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_due_notifications_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_due_notifications_for_me() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_ai_daily_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_ai_daily_today() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_exists() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_student_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_overview() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_sparklines_14d() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_sparklines_14d() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_global_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_global_metrics() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_student_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_detail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_weekly_trend() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_weekly_trend() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_subject_distribution() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_subject_distribution() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_impact_comparison() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_impact_comparison() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_activity_heatmap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_activity_heatmap() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_student_streaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_streaks() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_student_pending_activities(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_student_pending_activities(uuid) TO authenticated;