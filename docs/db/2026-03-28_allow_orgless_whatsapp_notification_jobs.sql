begin;

alter table public.taskai_notification_jobs
  alter column org_id drop not null;

commit;
