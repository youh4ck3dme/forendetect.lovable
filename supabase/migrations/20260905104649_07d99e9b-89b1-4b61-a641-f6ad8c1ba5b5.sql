
alter table public.subscriptions add column if not exists environment text not null default 'sandbox';
alter table public.subscriptions drop constraint if exists subscriptions_pkey;
alter table public.subscriptions add primary key (user_id, environment);
create index if not exists idx_subscriptions_subscription_id on public.subscriptions(subscription_id);
