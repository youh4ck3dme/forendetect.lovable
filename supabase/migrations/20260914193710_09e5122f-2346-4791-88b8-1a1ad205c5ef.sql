alter table public.ai_usage drop constraint ai_usage_task_check;
alter table public.ai_usage add constraint ai_usage_task_check check (task in ('explain_finding','case_summary','normalize_descriptions','alt_devil','admiss_audit','forensic_autopilot','ocr_extraction'));

create or replace function public.reserve_ai_call(
  _user uuid, _case uuid, _task text, _model text, _prompt_version text,
  _input_revision text, _daily_limit integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _used integer;
  _id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('ai_budget', 0), hashtextextended(_user::text, 0));

  select count(*) into _used
  from public.ai_usage
  where user_id = _user
    and created_at > now() - interval '24 hours'
    and status <> 'failed';

  if _used >= _daily_limit then
    raise exception 'Denný limit AI volaní (%) bol vyčerpaný.', _daily_limit using errcode = '53400';
  end if;

  insert into public.ai_usage (user_id, case_id, task, model, prompt_version, input_revision)
  values (_user, _case, _task, _model, _prompt_version, _input_revision)
  returning id into _id;

  return _id;
end;
$$;

revoke all on function public.reserve_ai_call(uuid, uuid, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid, uuid, text, text, text, text, integer) to service_role;