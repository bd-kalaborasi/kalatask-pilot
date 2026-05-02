-- R4 Phase B — user invites table for Settings → Anggota tim → "+ Undang"
-- Admin creates invite, member redeems via signup link (Sprint 7+).
-- For pilot: invite row stores intended role + email; admin lists pending.
--
-- Apply via:  supabase db push
-- Owner action: run after R4 PR merges.

CREATE TABLE IF NOT EXISTS public.user_invites (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS user_invites_email_idx ON public.user_invites (lower(email));
CREATE INDEX IF NOT EXISTS user_invites_status_idx ON public.user_invites (status);

COMMENT ON TABLE public.user_invites IS
  'Pending invitations to join workspace. Admin creates, signup flow redeems by token. R4 Phase B.';

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Admin reads/writes all invites
CREATE POLICY user_invites_admin_all ON public.user_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- RPC: create invite (admin only)
CREATE OR REPLACE FUNCTION public.create_user_invite(
  p_email text,
  p_role text,
  p_team_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  caller_role text;
  invite_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role INTO caller_role FROM public.users WHERE id = uid;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  IF p_email IS NULL OR length(trim(p_email)) < 3 OR position('@' in p_email) = 0 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'member', 'viewer') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;

  INSERT INTO public.user_invites (email, role, team_id, invited_by)
  VALUES (lower(trim(p_email)), p_role, p_team_id, uid)
  RETURNING id INTO invite_id;

  RETURN invite_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_invite(text, text, uuid) TO authenticated;

-- RPC: list pending invites (admin only)
CREATE OR REPLACE FUNCTION public.list_user_invites()
RETURNS TABLE(
  id uuid,
  email text,
  role text,
  team_id uuid,
  team_name text,
  invited_by uuid,
  invited_by_name text,
  status text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  caller_role text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role INTO caller_role FROM public.users WHERE id = uid;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  SELECT
    i.id, i.email, i.role, i.team_id, t.name AS team_name,
    i.invited_by, u.full_name AS invited_by_name,
    i.status, i.expires_at, i.created_at
  FROM public.user_invites i
  LEFT JOIN public.teams t ON t.id = i.team_id
  LEFT JOIN public.users u ON u.id = i.invited_by
  ORDER BY i.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_user_invites() TO authenticated;

-- RPC: revoke invite (admin only)
CREATE OR REPLACE FUNCTION public.revoke_user_invite(p_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  caller_role text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT role INTO caller_role FROM public.users WHERE id = uid;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  UPDATE public.user_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_user_invite(uuid) TO authenticated;
