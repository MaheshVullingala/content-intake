-- OPS SCRIPT -- run manually in the Supabase SQL editor. NOT part of the schema bootstrap.
-- Deletes every user whose role is not admin / super_admin (public.users row + their login in
-- auth.users). Checked 2026-10-14: none of the 8 affected users own requests, tasks, comments,
-- attachments, audit rows, etc.; only 4 notification rows (which cascade) would go with them.
--
-- 1) Run the PREVIEW first and confirm the list.
-- 2) Then run the block below it. It ends with ROLLBACK so nothing is permanent; read the two
--    result tables, and if they are right change the last line to COMMIT and run it again.

-- ===== PREVIEW (read-only) =====
select id, name, email, role from public.users
where role not in ('admin', 'super_admin') order by role, email;

-- ===== DELETE (transaction) =====
begin;

create temp table doomed on commit drop as
  select id, auth_id from public.users where role not in ('admin', 'super_admin');

delete from public.users where id in (select id from doomed);
delete from auth.users   where id in (select auth_id from doomed where auth_id is not null);

-- Safety check: at least one admin must remain.
do $$ begin
  if (select count(*) from public.users where role in ('admin', 'super_admin')) < 1 then
    raise exception 'Refusing: no admin would remain';
  end if;
end $$;

-- Check these two results:
select email, role from public.users order by role, email;   -- should list only the admin(s)
select email from auth.users order by email;                 -- should match

rollback;   -- change to COMMIT; once the results above look right
