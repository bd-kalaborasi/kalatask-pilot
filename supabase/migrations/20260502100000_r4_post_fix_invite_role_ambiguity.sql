-- R4 post-apply fix: list_user_invites + revoke_user_invite + create_user_invite
-- had `SELECT role INTO caller_role FROM public.users WHERE id = uid;` where
-- `role` is unqualified. For list_user_invites this collides with the OUT
-- column `role` declared by RETURNS TABLE(... role text ...) and raises
-- `column reference "role" is ambiguous` at runtime.
--
-- The other two functions don't use RETURNS TABLE so their lookups happen
-- to work — but we qualify them too for consistency and to prevent the
-- same bug if their signatures ever change.

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

  SELECT u.role INTO caller_role FROM public.users u WHERE u.id = uid;
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

  SELECT u.role INTO caller_role FROM public.users u WHERE u.id = uid;
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

  SELECT u.role INTO caller_role FROM public.users u WHERE u.id = uid;
  IF caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  UPDATE public.user_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND status = 'pending';
END;
$$;
