-- ============ IMPORTY ============
create table public.case_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid not null references public.cases(id) on delete cascade,
  filename text not null,
  byte_size bigint not null check (byte_size >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  parser_version text not null,
  delimiter text not null,
  decimal_separator text not null,
  date_format text not null,
  encoding text not null default 'utf-8',
  column_mapping jsonb not null default '{}'::jsonb,
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  imported_rows integer not null default 0 check (imported_rows >= 0),
  partial boolean not null default false,
  status text not null default 'pending' check (status in ('pending','committed','failed')),
  original_stored boolean not null default false,
  storage_path text,
  error_detail text,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.case_imports to authenticated;
grant all on public.case_imports to service_role;

alter table public.case_imports enable row level security;

create policy "Users manage own case imports"
  on public.case_imports for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger update_case_imports_updated_at
  before update on public.case_imports
  for each row execute function public.update_updated_at_column();

create trigger bump_case_imports_revision
  before update on public.case_imports
  for each row execute function public.bump_revision();

create trigger assert_case_imports_owner
  before insert or update on public.case_imports
  for each row execute function public.assert_case_owner();

create trigger audit_case_imports
  after insert or update or delete on public.case_imports
  for each row execute function public.write_audit_log();

create index case_imports_case_idx on public.case_imports(case_id);

-- ============ PREPOJENIE TRANSAKCIÍ NA ZDROJ ============
alter table public.case_transactions
  add column import_id uuid references public.case_imports(id) on delete set null,
  add column source_row integer;

create index case_transactions_import_idx on public.case_transactions(import_id);

-- ============ ATOMICKÉ POTVRDENIE IMPORTU ============
create or replace function public.commit_import(_import uuid, _rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _imp public.case_imports;
  _inserted integer := 0;
begin
  select * into _imp from public.case_imports where id = _import for update;
  if _imp.id is null then
    raise exception 'Import sa nenašiel.' using errcode = '42501';
  end if;
  if _imp.user_id <> auth.uid() then
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
$$;

revoke all on function public.commit_import(uuid, jsonb) from public;
grant execute on function public.commit_import(uuid, jsonb) to authenticated;

-- ============ AI SPOTREBA A ROZPOČET ============
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  case_id uuid references public.cases(id) on delete set null,
  task text not null check (task in ('explain_finding','case_summary','normalize_descriptions')),
  model text not null,
  prompt_version text not null,
  input_revision text,
  status text not null default 'reserved'
    check (status in ('reserved','succeeded','failed','timeout','rate_limited','cancelled')),
  prompt_tokens integer,
  completion_tokens integer,
  error_code text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

grant select on public.ai_usage to authenticated;
grant all on public.ai_usage to service_role;

alter table public.ai_usage enable row level security;

create policy "Users read own ai usage"
  on public.ai_usage for select to authenticated
  using (auth.uid() = user_id);

create index ai_usage_user_time_idx on public.ai_usage(user_id, created_at desc);

-- Denný limit sa vynucuje atómovo: serializovateľné počítanie cez advisory lock na používateľa.
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

revoke all on function public.reserve_ai_call(uuid, uuid, text, text, text, text, integer) from public;
grant execute on function public.reserve_ai_call(uuid, uuid, text, text, text, text, integer) to service_role;