begin;

create table if not exists public.taskai_channel_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  phone_number text,
  normalized_phone_number text,
  status text not null default 'pending',
  verified_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_channel_connections_channel
    check (channel in ('whatsapp', 'telegram')),
  constraint chk_taskai_channel_connections_status
    check (status in ('pending', 'active', 'paused', 'revoked')),
  unique (user_id, channel)
);

drop trigger if exists trg_taskai_channel_connections_updated_at on public.taskai_channel_connections;
create trigger trg_taskai_channel_connections_updated_at
before update on public.taskai_channel_connections
for each row execute function public.set_updated_at();

create unique index if not exists uq_taskai_channel_connections_whatsapp_number
  on public.taskai_channel_connections(channel, normalized_phone_number)
  where normalized_phone_number is not null;

create table if not exists public.taskai_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  enabled boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time,
  allow_new_task boolean not null default true,
  allow_claim_reminder boolean not null default true,
  allow_stalled_task boolean not null default true,
  allow_completion_message boolean not null default true,
  allow_rank_milestone boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_notification_preferences_channel
    check (channel in ('whatsapp', 'telegram')),
  unique (user_id, channel)
);

drop trigger if exists trg_taskai_notification_preferences_updated_at on public.taskai_notification_preferences;
create trigger trg_taskai_notification_preferences_updated_at
before update on public.taskai_notification_preferences
for each row execute function public.set_updated_at();

create table if not exists public.taskai_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  channel text not null,
  event_type text not null,
  template_key text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  rendered_message text,
  status text not null default 'queued',
  scheduled_for timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  retry_count integer not null default 0,
  provider text,
  provider_message_id text,
  error_message text,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_notification_jobs_channel
    check (channel in ('whatsapp', 'telegram')),
  constraint chk_taskai_notification_jobs_event_type
    check (event_type in (
      'task_new_available',
      'task_claimed_no_ai_started',
      'task_claimed_stalled',
      'task_completed_encourage',
      'leaderboard_rank_up',
      'points_milestone',
      'test_message'
    )),
  constraint chk_taskai_notification_jobs_status
    check (status in ('queued', 'sending', 'sent', 'failed', 'cancelled', 'skipped')),
  unique (dedupe_key)
);

drop trigger if exists trg_taskai_notification_jobs_updated_at on public.taskai_notification_jobs;
create trigger trg_taskai_notification_jobs_updated_at
before update on public.taskai_notification_jobs
for each row execute function public.set_updated_at();

create index if not exists idx_taskai_notification_jobs_channel_status_schedule
  on public.taskai_notification_jobs(channel, status, scheduled_for asc);

create index if not exists idx_taskai_notification_jobs_user_created
  on public.taskai_notification_jobs(user_id, created_at desc);

create index if not exists idx_taskai_notification_jobs_org_created
  on public.taskai_notification_jobs(org_id, created_at desc);

alter table public.taskai_channel_connections enable row level security;
alter table public.taskai_notification_preferences enable row level security;
alter table public.taskai_notification_jobs enable row level security;

drop policy if exists "taskai_channel_connections_select_self" on public.taskai_channel_connections;
create policy "taskai_channel_connections_select_self"
on public.taskai_channel_connections for select
using (auth.uid() = user_id);

drop policy if exists "taskai_channel_connections_insert_self" on public.taskai_channel_connections;
create policy "taskai_channel_connections_insert_self"
on public.taskai_channel_connections for insert
with check (auth.uid() = user_id);

drop policy if exists "taskai_channel_connections_update_self" on public.taskai_channel_connections;
create policy "taskai_channel_connections_update_self"
on public.taskai_channel_connections for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "taskai_notification_preferences_select_self" on public.taskai_notification_preferences;
create policy "taskai_notification_preferences_select_self"
on public.taskai_notification_preferences for select
using (auth.uid() = user_id);

drop policy if exists "taskai_notification_preferences_insert_self" on public.taskai_notification_preferences;
create policy "taskai_notification_preferences_insert_self"
on public.taskai_notification_preferences for insert
with check (auth.uid() = user_id);

drop policy if exists "taskai_notification_preferences_update_self" on public.taskai_notification_preferences;
create policy "taskai_notification_preferences_update_self"
on public.taskai_notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "taskai_notification_jobs_select_self" on public.taskai_notification_jobs;
create policy "taskai_notification_jobs_select_self"
on public.taskai_notification_jobs for select
using (auth.uid() = user_id);

drop policy if exists "taskai_notification_jobs_select_owner" on public.taskai_notification_jobs;
create policy "taskai_notification_jobs_select_owner"
on public.taskai_notification_jobs for select
using (
  exists (
    select 1
    from public.organization_memberships m
    where m.org_id = taskai_notification_jobs.org_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
  )
);

commit;
