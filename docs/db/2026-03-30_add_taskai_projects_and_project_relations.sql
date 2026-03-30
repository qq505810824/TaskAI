begin;

create table if not exists public.taskai_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  objective text,
  description text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_projects_status check (status in ('draft', 'active', 'archived'))
);

drop trigger if exists trg_taskai_projects_updated_at on public.taskai_projects;
create trigger trg_taskai_projects_updated_at
before update on public.taskai_projects
for each row execute function public.set_updated_at();

create index if not exists idx_taskai_projects_org_updated
  on public.taskai_projects (org_id, updated_at desc);

alter table public.taskai_projects enable row level security;

drop policy if exists "taskai_projects_select_member" on public.taskai_projects;
create policy "taskai_projects_select_member"
on public.taskai_projects for select
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_projects.org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_projects_owner_write" on public.taskai_projects;
create policy "taskai_projects_owner_write"
on public.taskai_projects for all
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_projects.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_projects.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

insert into public.taskai_projects (
  id,
  org_id,
  name,
  objective,
  description,
  status,
  created_by,
  created_at,
  updated_at
)
select
  id,
  org_id,
  coalesce(nullif(project_name, ''), title),
  case
    when nullif(title, '') is null then null
    when coalesce(nullif(project_name, ''), '') = title then null
    else title
  end,
  description,
  status,
  created_by,
  created_at,
  updated_at
from public.taskai_objectives
on conflict (id) do update set
  org_id = excluded.org_id,
  name = excluded.name,
  objective = excluded.objective,
  description = excluded.description,
  status = excluded.status,
  created_by = excluded.created_by,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

alter table public.taskai_context_documents
  add column if not exists project_id uuid references public.taskai_projects(id) on delete cascade;

update public.taskai_context_documents
set project_id = objective_id
where project_id is null
  and objective_id is not null;

create index if not exists idx_taskai_context_documents_project
  on public.taskai_context_documents (project_id);

alter table public.taskai_task_generation_runs
  add column if not exists project_id uuid references public.taskai_projects(id) on delete set null;

update public.taskai_task_generation_runs
set project_id = objective_id
where project_id is null
  and objective_id is not null;

create index if not exists idx_taskai_task_generation_runs_project
  on public.taskai_task_generation_runs (project_id, created_at desc);

alter table public.taskai_task_context_snapshots
  add column if not exists project_id uuid references public.taskai_projects(id) on delete set null;

alter table public.taskai_task_context_snapshots
  add column if not exists project_snapshot jsonb not null default '{}'::jsonb;

update public.taskai_task_context_snapshots
set project_id = objective_id
where project_id is null
  and objective_id is not null;

update public.taskai_task_context_snapshots
set project_snapshot = objective_snapshot
where coalesce(project_snapshot, '{}'::jsonb) = '{}'::jsonb
  and coalesce(objective_snapshot, '{}'::jsonb) <> '{}'::jsonb;

create index if not exists idx_taskai_task_context_snapshots_project
  on public.taskai_task_context_snapshots (project_id);

alter table public.tasks
  add column if not exists project_id uuid references public.taskai_projects(id) on delete set null;

update public.tasks as t
set project_id = coalesce(s.project_id, s.objective_id)
from public.taskai_task_context_snapshots as s
where s.task_id = t.id
  and t.project_id is null
  and coalesce(s.project_id, s.objective_id) is not null;

update public.tasks as t
set project_id = g.id
from public.taskai_projects as g
where t.project_id is null
  and t.goal_id = g.id;

create index if not exists idx_tasks_org_project_status
  on public.tasks (org_id, project_id, status);

commit;
