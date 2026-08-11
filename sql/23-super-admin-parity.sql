-- Fixes a real gap: several RLS policies (and the invite_user() RPC)
-- check for the literal role 'admin' only, not 'super_admin'. Everywhere
-- else in this schema (requests_insert/update/delete, tasks_insert/
-- update, audit_log_select) already treats super_admin as strictly
-- higher-privileged than admin — these six policies plus invite_user()
-- were the exceptions, discovered when a superadmin@gmail.com (role
-- super_admin) account got a silent "new row violates row-level
-- security policy" on a Settings save that a plain admin account could
-- do fine.

DROP POLICY IF EXISTS users_update ON public.users;
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (auth_id = auth.uid() OR get_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = comments.request_id
        AND (
          get_user_role() IN ('admin', 'super_admin')
          OR (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN ('editorial_qa','design_qa','web_team','brand_team','seo_team')
        )
    )
  );

DROP POLICY IF EXISTS comments_delete ON public.comments;
CREATE POLICY comments_delete ON public.comments
  FOR DELETE USING (get_user_role() IN ('admin', 'super_admin') OR user_id = get_user_id());

DROP POLICY IF EXISTS attachments_select ON public.attachments;
CREATE POLICY attachments_select ON public.attachments
  FOR SELECT USING (
    get_user_role() IN ('admin', 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = attachments.request_id
        AND (
          (get_user_role() = 'stakeholder' AND r.created_by = get_user_id())
          OR get_user_role() IN ('editorial_qa','design_qa','web_team','brand_team','seo_team')
        )
    )
  );

DROP POLICY IF EXISTS attachments_delete ON public.attachments;
CREATE POLICY attachments_delete ON public.attachments
  FOR DELETE USING (get_user_role() IN ('admin', 'super_admin') OR user_id = get_user_id());

DROP POLICY IF EXISTS settings_update ON public.settings;
CREATE POLICY settings_update ON public.settings
  FOR ALL USING (get_user_role() IN ('admin', 'super_admin'));

-- invite_user() RPC (sql/20) had the same literal-'admin'-only check.
CREATE OR REPLACE FUNCTION public.invite_user(
  p_email      TEXT,
  p_name       TEXT,
  p_department TEXT,
  p_role       TEXT,
  p_can_assign BOOLEAN DEFAULT false
)
RETURNS public.users
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_row   public.users;
BEGIN
  IF get_user_role() NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only admins can invite users.' USING ERRCODE = '42501';
  END IF;

  IF v_email IS NULL OR v_email = '' OR v_email NOT LIKE '%@cadence.com' THEN
    RAISE EXCEPTION 'Invites are limited to @cadence.com email addresses.' USING ERRCODE = 'P0001';
  END IF;

  IF p_role NOT IN ('stakeholder','editorial_qa','brand_team','seo_team','design_qa','web_team','admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'A user with this email already exists.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.users (email, name, department, role, can_assign, created_at)
  VALUES (
    v_email,
    COALESCE(NULLIF(trim(p_name), ''), split_part(v_email, '@', 1)),
    COALESCE(p_department, ''),
    p_role,
    COALESCE(p_can_assign, false),
    NOW()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
