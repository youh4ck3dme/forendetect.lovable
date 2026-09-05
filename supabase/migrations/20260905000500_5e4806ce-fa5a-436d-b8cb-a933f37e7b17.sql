create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_case_id uuid;
  v_user_id uuid;
  v_changed text[] := '{}';
  v_revision integer;
  old_json jsonb;
  new_json jsonb;
  k text;
begin
  rec := case when tg_op = 'DELETE' then old else new end;

  if tg_table_name = 'cases' then
    v_case_id := rec.id;
  else
    v_case_id := rec.case_id;
  end if;
  v_user_id := rec.user_id;
  begin
    v_revision := rec.revision;
  exception when others then
    v_revision := null;
  end;

  if tg_op = 'UPDATE' then
    old_json := to_jsonb(old) - 'updated_at' - 'revision';
    new_json := to_jsonb(new) - 'updated_at' - 'revision';
    for k in select jsonb_object_keys(new_json) loop
      if (new_json -> k) is distinct from (old_json -> k) then
        v_changed := array_append(v_changed, k);
      end if;
    end loop;
    if array_length(v_changed, 1) is null then
      return new;
    end if;
  end if;

  insert into public.case_audit_log (
    user_id, actor_id, case_id, table_name, record_id, operation, changed_fields, revision
  ) values (
    v_user_id, auth.uid(), v_case_id, tg_table_name, rec.id, tg_op, v_changed, v_revision
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.write_audit_log() from public, anon, authenticated;