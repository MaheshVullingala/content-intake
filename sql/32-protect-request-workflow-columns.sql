-- Applied 2026-10-12 via Supabase MCP (migrations: protect_request_workflow_columns_for_stakeholders,
-- then simplify_stakeholder_status_rule_editorial_only)
-- requests_update lets a stakeholder update any column of their own request. Keep that for
-- content, but stop stakeholders driving the workflow directly. Role 'stakeholder' with a JWT
-- only; admin / editorial_team / service role / SQL editor are unaffected.
create or replace function public.protect_request_workflow_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or coalesce(public.get_user_role(), '') <> 'stakeholder' then return new; end if;

  if new.published_at is distinct from old.published_at
  or new.admin_reviewed_by is distinct from old.admin_reviewed_by
  or new.admin_reviewed_at is distinct from old.admin_reviewed_at
  or new.assigned_by is distinct from old.assigned_by
  or new.assigned_at is distinct from old.assigned_at
  or new.priority_override_reason is distinct from old.priority_override_reason then
    raise exception 'Stakeholders cannot change review, assignment or publish fields' using errcode = '42501';
  end if;

  if new.assigned_to is distinct from old.assigned_to
     and not exists (select 1 from public.users where auth_id = auth.uid() and can_assign) then
    raise exception 'You do not have permission to assign requests' using errcode = '42501';
  end if;

  -- Editorial-only workflow (simplified 2026-10-12): the only status write a
  -- stakeholder may make is the submit transition. Writes that leave the
  -- status unchanged (e.g. syncOverallStatus re-writing 'in_progress') are not
  -- a change and stay allowed.
  if new.overall_status is distinct from old.overall_status then
    if new.overall_status = 'pending_admin'
       and (old.overall_status is null or old.overall_status = 'pending_admin') then
      null;
    else
      raise exception 'Stakeholders cannot change the request status' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function public.protect_request_workflow_columns() from public, anon, authenticated;
drop trigger if exists trg_protect_request_workflow_columns on public.requests;
create trigger trg_protect_request_workflow_columns before update on public.requests
  for each row execute function public.protect_request_workflow_columns();
