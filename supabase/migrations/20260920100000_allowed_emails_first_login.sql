-- Allowlisted accounts for first-login password flow.
create table public.allowed_emails (
  email text primary key,
  role public.app_role not null default 'user'::public.app_role,
  created_at timestamptz not null default now(),
  constraint allowed_emails_lower check (email = lower(email))
);

revoke all on public.allowed_emails from public, anon, authenticated;
grant all on public.allowed_emails to service_role;

alter table public.allowed_emails enable row level security;

insert into public.allowed_emails (email, role)
values
  ('erikbabcan@gmail.com', 'admin'),
  ('larsenevans@gmail.com', 'user')
on conflict (email) do update set role = excluded.role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.app_role;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  select role
    into assigned_role
  from public.allowed_emails
  where email = lower(new.email);

  insert into public.user_roles (user_id, role)
  values (new.id, coalesce(assigned_role, 'user'::public.app_role))
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.lookup_signup_email(_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(_email, '')));
  is_allowed boolean := false;
  is_registered boolean := false;
begin
  if normalized = '' then
    return jsonb_build_object('allowed', false, 'registered', false);
  end if;

  select exists (
    select 1 from public.allowed_emails where email = normalized
  ) into is_allowed;

  select exists (
    select 1 from public.profiles where lower(email) = normalized
  ) into is_registered;

  return jsonb_build_object('allowed', is_allowed, 'registered', is_registered);
end;
$$;

revoke all on function public.lookup_signup_email(text) from public;
grant execute on function public.lookup_signup_email(text) to anon, authenticated;
