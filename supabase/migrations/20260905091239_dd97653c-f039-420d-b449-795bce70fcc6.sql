
revoke execute on function public.current_plan(uuid) from public;
revoke execute on function public.current_plan(uuid) from anon;
revoke execute on function public.current_plan(uuid) from authenticated;
grant execute on function public.current_plan(uuid) to service_role;
