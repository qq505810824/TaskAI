begin;

alter table public.taskai_notification_preferences
  add column if not exists allow_task_claimed boolean not null default true;

alter table public.taskai_notification_jobs
  drop constraint if exists chk_taskai_notification_jobs_event_type;

alter table public.taskai_notification_jobs
  add constraint chk_taskai_notification_jobs_event_type
  check (event_type in (
    'task_new_available',
    'task_claimed',
    'task_claimed_no_ai_started',
    'task_claimed_stalled',
    'task_completed_encourage',
    'leaderboard_rank_up',
    'points_milestone',
    'test_message',
    'binding_verification_code'
  ));

commit;
