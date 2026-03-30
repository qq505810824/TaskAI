begin;

create or replace function public.taskai_publish_generation_run(
  p_run_id uuid,
  p_org_id uuid,
  p_owner_id uuid,
  p_item_ids uuid[],
  p_project_id uuid,
  p_project_snapshot jsonb,
  p_document_summary_snapshot jsonb
)
returns table (
  item_id uuid,
  task_id uuid,
  title text,
  points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.taskai_task_generation_runs%rowtype;
  v_item public.taskai_task_generation_run_items%rowtype;
  v_task public.tasks%rowtype;
  v_remaining_count integer := 0;
begin
  select *
  into v_run
  from public.taskai_task_generation_runs
  where id = p_run_id
    and org_id = p_org_id
  limit 1;

  if v_run.id is null then
    raise exception 'Task generation run not found for org';
  end if;

  for v_item in
    select *
    from public.taskai_task_generation_run_items
    where run_id = p_run_id
      and published_task_id is null
      and (
        coalesce(array_length(p_item_ids, 1), 0) = 0
        or id = any(p_item_ids)
      )
    order by sort_order asc
  loop
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
      created_by
    )
    values (
      p_org_id,
      null,
      p_project_id,
      v_item.title,
      v_item.description,
      v_item.points,
      v_item.type,
      case when v_item.type = 'recurring' then v_item.recurring_frequency else null end,
      'open',
      v_item.category,
      null,
      p_owner_id
    )
    returning * into v_task;

    insert into public.taskai_task_context_snapshots (
      task_id,
      org_id,
      project_id,
      generation_run_id,
      project_snapshot,
      document_summary_snapshot
    )
    values (
      v_task.id,
      p_org_id,
      p_project_id,
      p_run_id,
      coalesce(p_project_snapshot, '{}'::jsonb),
      coalesce(p_document_summary_snapshot, '{}'::jsonb)
    );

    update public.taskai_task_generation_run_items
    set published_task_id = v_task.id
    where id = v_item.id;

    item_id := v_item.id;
    task_id := v_task.id;
    title := v_task.title;
    points := v_task.points;
    return next;
  end loop;

  select count(*)
  into v_remaining_count
  from public.taskai_task_generation_run_items
  where run_id = p_run_id
    and published_task_id is null;

  update public.taskai_task_generation_runs
  set status = case when v_remaining_count > 0 then 'ready' else 'published' end,
      updated_at = now()
  where id = p_run_id;

  return;
end;
$$;

commit;
