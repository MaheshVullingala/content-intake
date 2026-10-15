-- Security review fixes (2026-10-15)

-- 1) attachments bucket: any signed-in user could delete ANY file. Now only the
--    uploader, an admin or the editorial team (who replace mapped files) can.
--    (The bucket is public-read, so reads are by URL; names are not listed to users beyond SELECT below.)
drop policy if exists storage_delete on storage.objects;
create policy storage_delete on storage.objects for delete
  using (bucket_id = 'attachments' and auth.uid() is not null and (
    owner_id = auth.uid()::text
    or public.get_user_role() in ('admin', 'editorial_team')
  ));

-- 3) notifications: any signed-in user could notify any user with arbitrary text
--    (phishing). Now an insert must reference a request the sender can already
--    see (the sub-select runs under the sender's own RLS on requests).
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check (
    auth.uid() is not null
    and request_id is not null
    and exists (select 1 from public.requests r where r.id = notifications.request_id)
  );

-- 5) Pin search_path on SECURITY DEFINER helpers; drop dead web-team function.
alter function public.get_user_role()                set search_path = public;
alter function public.get_user_id()                  set search_path = public;
alter function public.get_user_can_assign()          set search_path = public;
alter function public.get_password_login_enabled()   set search_path = public;
drop function if exists public.check_web_team_unlock(uuid);
