-- Training & Support is fixed standard content; stakeholders must justify any edit.
alter table public.requests add column if not exists ts_edit_justification text;
