-- Applied 2026-10-14 via Supabase MCP (migration: fix_invite_user_role_whitelist_4_role_model)
-- invite_user() still validated against the pre-consolidation role list, so inviting an
-- editorial_team or general user failed with "Invalid role". Aligned with the 4-role model.
create or replace function public.invite_user(
  p_email text, p_name text, p_department text, p_role text, p_can_assign boolean default false)
returns users language plpgsql security definer set search_path to 'public' as $function$
declare
  v_email text := lower(trim(p_email));
  v_row   public.users;
begin
  if get_user_role() not in ('admin', 'super_admin') then
    raise exception 'Only admins can invite users.' using errcode = '42501';
  end if;
  if v_email is null or v_email = '' or v_email not like '%@cadence.com' then
    raise exception 'Invites are limited to @cadence.com email addresses.' using errcode = 'P0001';
  end if;
  if p_role not in ('stakeholder', 'editorial_team', 'general', 'admin') then
    raise exception 'Invalid role: %', p_role using errcode = 'P0001';
  end if;
  if exists (select 1 from public.users where lower(email) = v_email) then
    raise exception 'A user with this email already exists.' using errcode = 'P0001';
  end if;
  insert into public.users (email, name, department, role, can_assign, created_at)
  values (v_email, coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
          coalesce(p_department, ''), p_role, coalesce(p_can_assign, false), now())
  returning * into v_row;
  return v_row;
end;
$function$;
