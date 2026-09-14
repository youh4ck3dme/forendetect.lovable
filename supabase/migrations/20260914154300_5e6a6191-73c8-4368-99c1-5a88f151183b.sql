create or replace function public.commit_import(_import uuid, _rows jsonb, _actor uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  _imp public.case_imports;
  _inserted integer := 0;
begin
  if _actor is null then
    raise exception 'Chýba identita používateľa.' using errcode = '42501';
  end if;

  select * into _imp from public.case_imports where id = _import for update;
  if _imp.id is null then
    raise exception 'Import sa nenašiel.' using errcode = '42501';
  end if;
  if _imp.user_id <> _actor then
    raise exception 'Nemáte oprávnenie na tento import.' using errcode = '42501';
  end if;
  if _imp.status <> 'pending' then
    raise exception 'Import už bol spracovaný.' using errcode = '55000';
  end if;

  insert into public.case_transactions (
    case_id, user_id, date, amount, currency, method,
    from_id, to_id, payer_id, origin_country, destination_country,
    description, import_id, source_row
  )
  select
    _imp.case_id,
    _imp.user_id,
    (r->>'date')::date,
    (r->>'amount')::numeric(18,2),
    upper(r->>'currency'),
    coalesce(r->>'method','transfer'),
    (r->>'from_id')::uuid,
    (r->>'to_id')::uuid,
    nullif(r->>'payer_id','')::uuid,
    upper(coalesce(r->>'origin_country','SK')),
    upper(coalesce(r->>'destination_country','SK')),
    coalesce(r->>'description',''),
    _import,
    (r->>'source_row')::integer
  from jsonb_array_elements(_rows) as r;

  get diagnostics _inserted = row_count;

  update public.case_imports
    set status = 'committed', imported_rows = _inserted
    where id = _import;

  return _inserted;
end;
$function$;

drop function if exists public.commit_import(uuid, jsonb);

revoke all on function public.commit_import(uuid, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.commit_import(uuid, jsonb, uuid) to service_role;

revoke all on table public.billing_events from anon, authenticated;
grant all on table public.billing_events to service_role;
alter table public.billing_events enable row level security;