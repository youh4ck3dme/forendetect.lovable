revoke execute on function public.bump_revision() from public, anon, authenticated;
revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.entity_belongs(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.assert_case_owner() from public, anon, authenticated;
revoke execute on function public.assert_tx_refs() from public, anon, authenticated;
revoke execute on function public.assert_relation_refs() from public, anon, authenticated;
revoke execute on function public.assert_weapon_refs() from public, anon, authenticated;
revoke execute on function public.update_updated_at_column() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;