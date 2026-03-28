begin;

create unique index if not exists uq_task_claims_active_task
  on public.task_claims(task_id)
  where claim_status = 'claimed';

commit;
