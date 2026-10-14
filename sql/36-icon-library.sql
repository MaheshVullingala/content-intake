-- Icon library for Key Benefits (picker). Files live in the public
-- 'icon-library' storage bucket (our Supabase, not hotlinked from Cadence/DAM);
-- this table holds searchable metadata. Admin-managed via Admin -> Icons.
create table if not exists public.icon_library (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  keywords    text[] not null default '{}',   -- related key benefit titles / search terms
  category    text,
  file_path   text not null unique,
  public_url  text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.icon_library enable row level security;

drop policy if exists icon_library_select on public.icon_library;
create policy icon_library_select on public.icon_library for select
  using (auth.uid() is not null and (active or public.get_user_role() = 'admin'));
drop policy if exists icon_library_admin_write on public.icon_library;
create policy icon_library_admin_write on public.icon_library for all
  using (public.get_user_role() = 'admin') with check (public.get_user_role() = 'admin');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('icon-library', 'icon-library', true, 524288, array['image/svg+xml','image/png'])
on conflict (id) do nothing;

drop policy if exists icon_library_objects_admin on storage.objects;
create policy icon_library_objects_admin on storage.objects for all
  using (bucket_id = 'icon-library' and public.get_user_role() = 'admin')
  with check (bucket_id = 'icon-library' and public.get_user_role() = 'admin');
