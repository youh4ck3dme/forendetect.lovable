create policy "Client access to billing events is denied"
on public.billing_events
for select
to authenticated
using (false);