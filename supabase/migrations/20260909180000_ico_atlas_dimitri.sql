-- ============ COMPANY REGISTRY PROFILES (ICO ATLAS) ============
create table public.company_registry_profiles (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null,
  entity_id uuid references public.case_entities(id) on delete set null,
  ico text not null,
  legal_name text not null,
  legal_form text,
  registered_address text,
  country text not null default 'SK',
  status text,
  incorporated_at date,
  dissolved_at date,
  statutory_persons jsonb not null default '[]'::jsonb,
  business_activities jsonb not null default '[]'::jsonb,
  address_history jsonb not null default '[]'::jsonb,
  source text not null default 'ico-atlas',
  source_url text,
  source_hash text,
  captured_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.company_registry_profiles to authenticated;
grant all on public.company_registry_profiles to service_role;

alter table public.company_registry_profiles enable row level security;

create policy "Users manage own company registry profiles"
  on public.company_registry_profiles for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger update_company_registry_profiles_updated_at
  before update on public.company_registry_profiles
  for each row execute function public.update_updated_at_column();

create trigger bump_company_registry_profiles_revision
  before update on public.company_registry_profiles
  for each row execute function public.bump_revision();

create trigger assert_company_registry_profiles_owner
  before insert or update on public.company_registry_profiles
  for each row execute function public.assert_case_owner();

create trigger audit_company_registry_profiles
  after insert or update or delete on public.company_registry_profiles
  for each row execute function public.write_audit_log();

create index company_registry_profiles_case_id_idx on public.company_registry_profiles (case_id);
create index company_registry_profiles_case_ico_idx on public.company_registry_profiles (case_id, ico);

-- Unikátny profil pre prípad, IČO a hash zdroja (ak je k dispozícii hash)
create unique index company_registry_profiles_unique_hash_idx
  on public.company_registry_profiles (case_id, ico, source_hash)
  where source_hash is not null;


-- ============ CROSS BORDER ANALYSES (DIMITRI CHECKER) ============
create table public.cross_border_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null,
  report_id text not null,
  source text not null default 'dimitri-checker',
  captured_at timestamptz not null default now(),
  countries jsonb not null default '[]'::jsonb,
  routes jsonb not null default '[]'::jsonb,
  intermediaries jsonb not null default '[]'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  nominee_indicators jsonb not null default '[]'::jsonb,
  source_url text,
  source_hash text,
  raw_payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.cross_border_analyses to authenticated;
grant all on public.cross_border_analyses to service_role;

alter table public.cross_border_analyses enable row level security;

create policy "Users manage own cross border analyses"
  on public.cross_border_analyses for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger update_cross_border_analyses_updated_at
  before update on public.cross_border_analyses
  for each row execute function public.update_updated_at_column();

create trigger bump_cross_border_analyses_revision
  before update on public.cross_border_analyses
  for each row execute function public.bump_revision();

create trigger assert_cross_border_analyses_owner
  before insert or update on public.cross_border_analyses
  for each row execute function public.assert_case_owner();

create trigger audit_cross_border_analyses
  after insert or update or delete on public.cross_border_analyses
  for each row execute function public.write_audit_log();

create index cross_border_analyses_case_id_idx on public.cross_border_analyses (case_id);
create index cross_border_analyses_report_id_idx on public.cross_border_analyses (report_id);

-- Unikátny report v rámci prípadu
create unique index cross_border_analyses_case_report_idx
  on public.cross_border_analyses (case_id, report_id);
