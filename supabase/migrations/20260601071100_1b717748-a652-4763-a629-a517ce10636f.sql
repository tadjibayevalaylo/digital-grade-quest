
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

DROP POLICY "anyone can update session" ON public.student_sessions;
CREATE POLICY "anyone can finalize own session"
  ON public.student_sessions FOR UPDATE TO anon, authenticated
  USING (finished_at IS NULL)
  WITH CHECK (true);
