-- 1. Currency + precision + revision
alter table public.cases add column if not exists base_currency text not null default 'EUR';
alter table public.cases add column if not exists revision integer not null default 1;

alter table public.case_transactions add column if not exists currency text not null default 'EUR';
alter table public.case_transactions alter column amount type numeric(18,2);
alter table public.case_transactions add column if not exists revision integer not null default 1;
alter table public.case_entities add column if not exists revision integer not null default 1;
alter table public.case_relations add column if not exists revision integer not null default 1;
alter table public.case_weapons add column if not exists revision integer not null default 1;
alter table public.case_events add column if not exists revision integer not null default 1;

alter table public.cases add constraint cases_base_currency_chk check (base_currency ~ '^[A-Z]{3}$');
alter table public.case_transactions add constraint case_transactions_currency_chk check (currency ~ '^[A-Z]{3}$');
alter table public.case_transactions add constraint case_transactions_amount_nonzero_chk check (amount <> 0);

-- 2. Revision bump on update
create or replace function public.bump_revision()
returns trigger language plpgsql set search_path = public as $$
begin
  new.revision := coalesce(old.revision, 0) + 1;
  return new;
end;
$$;

create trigger bump_cases_revision before update on public.cases for each row execute function public.bump_revision();
create trigger bump_case_entities_revision before update on public.case_entities for each row execute function public.bump_revision();
create trigger bump_case_transactions_revision before update on public.case_transactions for each row execute function public.bump_revision();
create trigger bump_case_relations_revision before update on public.case_relations for each row execute function public.bump_revision();
create trigger bump_case_weapons_revision before update on public.case_weapons for each row execute function public.bump_revision();
create trigger bump_case_events_revision before update on public.case_events for each row execute function public.bump_revision();

-- 3. Referential integrity: case rows cascade, entity references restricted
alter table public.case_entities drop constraint case_entities_case_id_fkey,
  add constraint case_entities_case_id_fkey foreign key (case_id) references public.cases(id) on delete cascade;
alter table public.case_transactions drop constraint case_transactions_case_id_fkey,
  add constraint case_transactions_case_id_fkey foreign key (case_id) references public.cases(id) on delete cascade;
alter table public.case_relations drop constraint case_relations_case_id_fkey,
  add constraint case_relations_case_id_fkey foreign key (case_id) references public.cases(id) on delete cascade;
alter table public.case_weapons drop constraint case_weapons_case_id_fkey,
  add constraint case_weapons_case_id_fkey foreign key (case_id) references public.cases(id) on delete cascade;
alter table public.case_events drop constraint case_events_case_id_fkey,
  add constraint case_events_case_id_fkey foreign key (case_id) references public.cases(id) on delete cascade;

alter table public.case_transactions drop constraint case_transactions_from_id_fkey,
  add constraint case_transactions_from_id_fkey foreign key (from_id) references public.case_entities(id) on delete restrict;
alter table public.case_transactions drop constraint case_transactions_to_id_fkey,
  add constraint case_transactions_to_id_fkey foreign key (to_id) references public.case_entities(id) on delete restrict;
alter table public.case_transactions drop constraint case_transactions_payer_id_fkey,
  add constraint case_transactions_payer_id_fkey foreign key (payer_id) references public.case_entities(id) on delete restrict;
alter table public.case_relations drop constraint case_relations_from_id_fkey,
  add constraint case_relations_from_id_fkey foreign key (from_id) references public.case_entities(id) on delete restrict;
alter table public.case_relations drop constraint case_relations_to_id_fkey,
  add constraint case_relations_to_id_fkey foreign key (to_id) references public.case_entities(id) on delete restrict;
alter table public.case_weapons drop constraint case_weapons_holder_id_fkey,
  add constraint case_weapons_holder_id_fkey foreign key (holder_id) references public.case_entities(id) on delete restrict;
alter table public.case_weapons drop constraint case_weapons_supplier_id_fkey,
  add constraint case_weapons_supplier_id_fkey foreign key (supplier_id) references public.case_entities(id) on delete restrict;

-- 4. Same-case / same-owner invariants enforced in the database
create or replace function public.entity_belongs(_entity uuid, _case uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select _entity is null or exists (
    select 1 from public.case_entities e
    where e.id = _entity and e.case_id = _case and e.user_id = _user
  );
$$;

create or replace function public.assert_case_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cases c where c.id = new.case_id and c.user_id = new.user_id) then
    raise exception 'case_id % does not belong to user %', new.case_id, new.user_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.assert_tx_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cases c where c.id = new.case_id and c.user_id = new.user_id) then
    raise exception 'case_id % does not belong to user %', new.case_id, new.user_id using errcode = '42501';
  end if;
  if not (public.entity_belongs(new.from_id, new.case_id, new.user_id)
      and public.entity_belongs(new.to_id, new.case_id, new.user_id)
      and public.entity_belongs(new.payer_id, new.case_id, new.user_id)) then
    raise exception 'referenced entity is not part of case %', new.case_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.assert_relation_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cases c where c.id = new.case_id and c.user_id = new.user_id) then
    raise exception 'case_id % does not belong to user %', new.case_id, new.user_id using errcode = '42501';
  end if;
  if not (public.entity_belongs(new.from_id, new.case_id, new.user_id)
      and public.entity_belongs(new.to_id, new.case_id, new.user_id)) then
    raise exception 'referenced entity is not part of case %', new.case_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.assert_weapon_refs()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cases c where c.id = new.case_id and c.user_id = new.user_id) then
    raise exception 'case_id % does not belong to user %', new.case_id, new.user_id using errcode = '42501';
  end if;
  if not (public.entity_belongs(new.holder_id, new.case_id, new.user_id)
      and public.entity_belongs(new.supplier_id, new.case_id, new.user_id)) then
    raise exception 'referenced entity is not part of case %', new.case_id using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger assert_case_entities_owner before insert or update on public.case_entities for each row execute function public.assert_case_owner();
create trigger assert_case_events_owner before insert or update on public.case_events for each row execute function public.assert_case_owner();
create trigger assert_case_transactions_refs before insert or update on public.case_transactions for each row execute function public.assert_tx_refs();
create trigger assert_case_relations_refs before insert or update on public.case_relations for each row execute function public.assert_relation_refs();
create trigger assert_case_weapons_refs before insert or update on public.case_weapons for each row execute function public.assert_weapon_refs();

-- 5. Append-only audit log written by the database
create table public.case_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  actor_id uuid,
  case_id uuid,
  table_name text not null,
  record_id uuid,
  operation text not null,
  changed_fields text[] not null default '{}',
  revision integer,
  created_at timestamptz not null default now()
);

grant select on public.case_audit_log to authenticated;
grant all on public.case_audit_log to service_role;

alter table public.case_audit_log enable row level security;

create policy "Users can read own audit log"
  on public.case_audit_log for select to authenticated
  using (auth.uid() = user_id);

create index case_audit_log_case_idx on public.case_audit_log (case_id, created_at desc);

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec record;
  changed text[] := '{}';
  k text;
begin
  if tg_op = 'DELETE' then rec := old; else rec := new; end if;

  if tg_op = 'UPDATE' then
    for k in select key from jsonb_each(to_jsonb(new)) loop
      if to_jsonb(new) -> k is distinct from to_jsonb(old) -> k and k <> 'updated_at' and k <> 'revision' then
        changed := array_append(changed, k);
      end if;
    end loop;
    if array_length(changed, 1) is null then
      return null;
    end if;
  end if;

  insert into public.case_audit_log (user_id, actor_id, case_id, table_name, record_id, operation, changed_fields, revision)
  values (
    rec.user_id,
    auth.uid(),
    case when tg_table_name = 'cases' then rec.id else rec.case_id end,
    tg_table_name,
    rec.id,
    tg_op,
    changed,
    case when tg_op = 'DELETE' then null else new.revision end
  );
  return null;
end;
$$;

create trigger audit_cases after insert or update or delete on public.cases for each row execute function public.write_audit_log();
create trigger audit_case_entities after insert or update or delete on public.case_entities for each row execute function public.write_audit_log();
create trigger audit_case_transactions after insert or update or delete on public.case_transactions for each row execute function public.write_audit_log();
create trigger audit_case_relations after insert or update or delete on public.case_relations for each row execute function public.write_audit_log();
create trigger audit_case_weapons after insert or update or delete on public.case_weapons for each row execute function public.write_audit_log();
create trigger audit_case_events after insert or update or delete on public.case_events for each row execute function public.write_audit_log();