-- R4 Phase B — notification preferences table for Settings → Notifikasi
-- Per-user toggle for each notification event type. Defaults to enabled.
--
-- Apply via:  supabase db push  (or `supabase migration up`)
-- Owner action: run after R4 PR merges.

CREATE TABLE IF NOT EXISTS public.notif_prefs (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'assigned',
    'status_done',
    'deadline_h3',
    'deadline_h1',
    'overdue',
    'mentioned',
    'escalation',
    'digest'
  )),
  enabled boolean NOT NULL DEFAULT true,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_type, channel)
);

COMMENT ON TABLE public.notif_prefs IS
  'Per-user × event-type × channel toggle for notifications. R4 Phase B.';

ALTER TABLE public.notif_prefs ENABLE ROW LEVEL SECURITY;

-- Each user reads + updates their own prefs only
CREATE POLICY notif_prefs_self_read ON public.notif_prefs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notif_prefs_self_update ON public.notif_prefs
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY notif_prefs_self_insert ON public.notif_prefs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RPC: get prefs for current user (creates defaults if missing)
CREATE OR REPLACE FUNCTION public.get_notif_prefs()
RETURNS TABLE(event_type text, enabled boolean, channel text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Lazy-create default rows for any missing event_type
  INSERT INTO public.notif_prefs (user_id, event_type, channel, enabled)
  SELECT uid, et, 'in_app', true
  FROM unnest(ARRAY[
    'assigned', 'status_done', 'deadline_h3', 'deadline_h1',
    'overdue', 'mentioned', 'escalation', 'digest'
  ]) AS et
  ON CONFLICT DO NOTHING;

  RETURN QUERY
  SELECT np.event_type, np.enabled, np.channel
  FROM public.notif_prefs np
  WHERE np.user_id = uid
  ORDER BY np.event_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notif_prefs() TO authenticated;

-- RPC: update single pref (used by toggle UI)
CREATE OR REPLACE FUNCTION public.update_notif_pref(
  p_event_type text,
  p_enabled boolean,
  p_channel text DEFAULT 'in_app'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.notif_prefs (user_id, event_type, channel, enabled)
  VALUES (uid, p_event_type, p_channel, p_enabled)
  ON CONFLICT (user_id, event_type, channel)
  DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_notif_pref(text, boolean, text) TO authenticated;
