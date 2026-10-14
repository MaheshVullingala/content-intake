-- Applied 2026-10-14 via Supabase MCP (migration: allow_testuser_com_domain_for_testing)
-- TEMPORARY, for the closed test with @testuser.com accounts: the auth.users domain trigger
-- function and invite_user() now accept @cadence.com AND @testuser.com; everything else is blocked.
-- The self-registration screen (components/auth/Register.js) still only offers @cadence.com.
--
-- REVERT after testing: re-run this with the '@testuser.com' conditions removed, i.e.
--   enforce_email_domain(): only  lower(new.email) not like '%@cadence.com'
--   invite_user():          only  v_email not like '%@cadence.com'
-- (full original bodies: sql/33-fix-invite-user-roles.sql for invite_user; enforce_email_domain was
--  "IF NEW.email IS NOT NULL AND lower(NEW.email) NOT LIKE '%@cadence.com' THEN RAISE EXCEPTION ...")
create or replace function public.enforce_email_domain()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.email is not null
     and lower(new.email) not like '%@cadence.com'
     and lower(new.email) not like '%@testuser.com' then
    raise exception 'Registration is limited to approved email domains.' using errcode = 'P0001';
  end if;
  return new;
end;
$function$;
-- invite_user(): same as sql/33 but the domain check is
--   (v_email not like '%@cadence.com' and v_email not like '%@testuser.com')
