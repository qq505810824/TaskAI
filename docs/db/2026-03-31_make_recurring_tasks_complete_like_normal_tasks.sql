begin;

alter table public.tasks
  add column if not exists available_from timestamptz;

create index if not exists idx_tasks_org_status_available_from
  on public.tasks (org_id, status, available_from);

create or replace function public.complete_task(_task_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_task public.tasks%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_claim_id uuid;
  v_next_task_id uuid;
  v_next_available_at timestamptz;
begin
  select * into v_task
  from public.tasks
  where id = _task_id
  for update;

  if v_task.id is null then
    raise exception 'task not found';
  end if;

  if not public.is_org_member(v_task.org_id) then
    raise exception 'permission denied';
  end if;

  if v_task.assignee_user_id is distinct from auth.uid() then
    raise exception 'only assignee can complete';
  end if;

  if v_task.status is distinct from 'in_progress' then
    if v_task.status = 'completed' then
      raise exception 'task already completed';
    end if;
    raise exception 'task is not in progress';
  end if;

  select * into v_membership
  from public.organization_memberships
  where org_id = v_task.org_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if v_membership.id is null then
    raise exception 'membership not found';
  end if;

  update public.tasks
  set
    status = 'completed',
    completed_at = now(),
    last_completed_at = now(),
    assignee_user_id = auth.uid(),
    updated_at = now()
  where id = v_task.id;

  if v_task.type = 'recurring' then
    v_next_available_at :=
      case v_task.recurring_frequency
        when 'daily' then now() + interval '1 day'
        when 'weekly' then now() + interval '1 week'
        when 'monthly' then now() + interval '1 month'
        else now() + interval '1 week'
      end;

    insert into public.tasks (
      org_id,
      goal_id,
      project_id,
      title,
      description,
      points,
      type,
      recurring_frequency,
      status,
      category,
      assignee_user_id,
      created_by,
      completed_at,
      last_claimed_at,
      last_completed_at,
      available_from,
      created_at,
      updated_at
    )
    values (
      v_task.org_id,
      v_task.goal_id,
      v_task.project_id,
      v_task.title,
      v_task.description,
      v_task.points,
      v_task.type,
      v_task.recurring_frequency,
      'open',
      v_task.category,
      null,
      v_task.created_by,
      null,
      null,
      null,
      v_next_available_at,
      now(),
      now()
    )
    returning id into v_next_task_id;

    insert into public.task_visible_groups(task_id, group_id, org_id, created_at)
    select
      v_next_task_id,
      group_id,
      org_id,
      now()
    from public.task_visible_groups
    where task_id = v_task.id;

    insert into public.taskai_task_context_snapshots (
      task_id,
      org_id,
      objective_id,
      generation_run_id,
      objective_snapshot,
      document_summary_snapshot,
      project_id,
      project_snapshot,
      created_at,
      updated_at
    )
    select
      v_next_task_id,
      org_id,
      objective_id,
      generation_run_id,
      objective_snapshot,
      document_summary_snapshot,
      project_id,
      project_snapshot,
      now(),
      now()
    from public.taskai_task_context_snapshots
    where task_id = v_task.id
    on conflict (task_id) do nothing;
  end if;

  select id into v_claim_id
  from public.task_claims
  where task_id = v_task.id
    and user_id = auth.uid()
    and claim_status = 'claimed'
  order by claimed_at desc
  limit 1
  for update;

  if v_claim_id is not null then
    update public.task_claims
    set
      claim_status = 'completed',
      completed_at = now(),
      points_awarded = v_task.points,
      updated_at = now()
    where id = v_claim_id;
  end if;

  update public.organization_memberships
  set
    points_balance = points_balance + v_task.points,
    points_earned_total = points_earned_total + v_task.points,
    updated_at = now()
  where id = v_membership.id;

  update public.organizations
  set
    points_pool_remaining = case
      when points_pool_remaining is null then null
      when points_pool_remaining - v_task.points < 0 then 0
      else points_pool_remaining - v_task.points
    end,
    updated_at = now()
  where id = v_task.org_id;

  insert into public.activities(org_id, actor_user_id, event_type, entity_type, entity_id, points_delta, meta)
  values (
    v_task.org_id,
    auth.uid(),
    'task_completed',
    'task',
    v_task.id,
    v_task.points,
    jsonb_build_object('task_title', v_task.title, 'task_type', v_task.type)
  );
end;
$function$;

grant execute on function public.complete_task(uuid) to authenticated;

commit;
