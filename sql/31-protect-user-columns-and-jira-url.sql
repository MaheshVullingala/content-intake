-- Applied 2026-10-12 via Supabase MCP (migration: protect_user_privileged_columns_and_jira_url)
-- 1) Block self-service privilege escalation on public.users.
-- 2) Only http(s) URLs may be stored in requests.jira_ticket_url.
create or replace function public.protect_user_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- service role / signup trigger / SQL editor
  if (new.role is distinct from old.role
   or new.can_assign is distinct from old.can_assign
   or new.auth_id is distinct from old.auth_id
   or new.email is distinct from old.email)
     and coalesce(public.get_user_role(), '') not in ('admin', 'super_admin') then
    raise exception 'Only an administrator can change role, can_assign, email or auth_id' using errcode = '42501';
  end if;
  return new;
end; $$;
revoke execute on function public.protect_user_privileged_columns() from public, anon, authenticated;
drop trigger if exists trg_protect_user_privileged_columns on public.users;
create trigger trg_protect_user_privileged_columns before update on public.users
  for each row execute function public.protect_user_privileged_columns();

alter table public.requests drop constraint if exists requests_jira_ticket_url_http_chk;
alter table public.requests add constraint requests_jira_ticket_url_http_chk
  check (jira_ticket_url is null or jira_ticket_url ~* '^https?://');
