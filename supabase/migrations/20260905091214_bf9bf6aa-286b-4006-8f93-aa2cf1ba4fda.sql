
alter table public.cases add column if not exists is_demo boolean not null default false;

create table if not exists public.subscriptions (
  user_id uuid primary key,
  provider text not null default 'stripe',
  customer_id text,
  subscription_id text,
  price_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
drop policy if exists "Users read own subscription" on public.subscriptions;
create policy "Users read own subscription" on public.subscriptions
  for select to authenticated using (auth.uid() = user_id);

drop trigger if exists update_subscriptions_updated_at on public.subscriptions;
create trigger update_subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.update_updated_at_column();

create table if not exists public.billing_events (
  event_id text primary key,
  provider text not null default 'stripe',
  type text not null,
  user_id uuid,
  event_created_at timestamptz,
  processed_at timestamptz not null default now(),
  result text not null default 'processed'
);
grant all on public.billing_events to service_role;
alter table public.billing_events enable row level security;

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scope text not null,
  target_case_id uuid,
  status text not null default 'running',
  steps jsonb not null default '[]'::jsonb,
  error_detail text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
grant select on public.deletion_requests to authenticated;
grant all on public.deletion_requests to service_role;
alter table public.deletion_requests enable row level security;
drop policy if exists "Users read own deletion requests" on public.deletion_requests;
create policy "Users read own deletion requests" on public.deletion_requests
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.current_plan(_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.plan from public.subscriptions s
      where s.user_id = _user
        and s.status in ('active','trialing','past_due')
        and (s.current_period_end is null or s.current_period_end > now() - interval '1 day')
      limit 1),
    'free')
$$;
grant execute on function public.current_plan(uuid) to authenticated, service_role;
