begin;

create table if not exists public.taskai_whatsapp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null default 'whatsapp',
  phone_number text not null,
  normalized_phone_number text not null,
  verification_code text not null,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null,
  verified_at timestamptz,
  verified_from_jid text,
  verified_message_id text,
  last_attempted_at timestamptz,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_whatsapp_verifications_channel
    check (channel in ('whatsapp')),
  constraint chk_taskai_whatsapp_verifications_status
    check (status in ('pending', 'verified', 'expired', 'cancelled'))
);

drop trigger if exists trg_taskai_whatsapp_verifications_updated_at on public.taskai_whatsapp_verifications;
create trigger trg_taskai_whatsapp_verifications_updated_at
before update on public.taskai_whatsapp_verifications
for each row execute function public.set_updated_at();

create index if not exists idx_taskai_whatsapp_verifications_user_created
  on public.taskai_whatsapp_verifications(user_id, created_at desc);

create index if not exists idx_taskai_whatsapp_verifications_phone_status
  on public.taskai_whatsapp_verifications(normalized_phone_number, status, created_at desc);

create unique index if not exists uq_taskai_whatsapp_verifications_pending_phone
  on public.taskai_whatsapp_verifications(normalized_phone_number)
  where status = 'pending';

alter table public.taskai_whatsapp_verifications enable row level security;

drop policy if exists "taskai_whatsapp_verifications_select_self" on public.taskai_whatsapp_verifications;
create policy "taskai_whatsapp_verifications_select_self"
on public.taskai_whatsapp_verifications for select
using (auth.uid() = user_id);

alter table public.taskai_notification_jobs
  drop constraint if exists chk_taskai_notification_jobs_event_type;

alter table public.taskai_notification_jobs
  add constraint chk_taskai_notification_jobs_event_type
  check (event_type in (
    'task_new_available',
    'task_claimed_no_ai_started',
    'task_claimed_stalled',
    'task_completed_encourage',
    'leaderboard_rank_up',
    'points_milestone',
    'test_message',
    'binding_verification_code'
  ));

commit;
