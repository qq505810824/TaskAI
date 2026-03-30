-- TaskAI Objective + Project Documents + AI Task Generation (V1 foundation)
-- Date: 2026-03-30

create table if not exists public.taskai_objectives (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  project_name text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_objectives_status check (status in ('draft', 'active', 'archived'))
);

drop trigger if exists trg_taskai_objectives_updated_at on public.taskai_objectives;
create trigger trg_taskai_objectives_updated_at
before update on public.taskai_objectives
for each row execute function public.set_updated_at();

create table if not exists public.taskai_context_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  objective_id uuid references public.taskai_objectives(id) on delete set null,
  scope text not null default 'organization',
  project_name text,
  title text not null,
  file_name text not null,
  mime_type text,
  storage_bucket text not null,
  storage_path text not null,
  file_size bigint,
  raw_text text,
  summary text,
  summary_payload jsonb not null default '{}'::jsonb,
  summary_status text not null default 'pending',
  summary_error text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_context_documents_scope check (scope in ('organization', 'project', 'objective')),
  constraint chk_taskai_context_documents_summary_status check (summary_status in ('pending', 'processing', 'ready', 'failed'))
);

drop trigger if exists trg_taskai_context_documents_updated_at on public.taskai_context_documents;
create trigger trg_taskai_context_documents_updated_at
before update on public.taskai_context_documents
for each row execute function public.set_updated_at();

create table if not exists public.taskai_task_generation_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  objective_id uuid references public.taskai_objectives(id) on delete set null,
  provider text not null default 'ark',
  prompt_key text not null,
  model_target text,
  status text not null default 'pending',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_task_generation_runs_provider check (provider in ('ark', 'dify')),
  constraint chk_taskai_task_generation_runs_status check (status in ('pending', 'running', 'ready', 'failed', 'published'))
);

drop trigger if exists trg_taskai_task_generation_runs_updated_at on public.taskai_task_generation_runs;
create trigger trg_taskai_task_generation_runs_updated_at
before update on public.taskai_task_generation_runs
for each row execute function public.set_updated_at();

create table if not exists public.taskai_task_generation_run_documents (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.taskai_task_generation_runs(id) on delete cascade,
  document_id uuid not null references public.taskai_context_documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (run_id, document_id)
);

create table if not exists public.taskai_task_generation_run_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.taskai_task_generation_runs(id) on delete cascade,
  sort_order integer not null default 0,
  title text not null,
  description text,
  points integer not null,
  type public.task_type not null default 'one_time',
  recurring_frequency public.task_recurring_frequency,
  category text,
  source_payload jsonb not null default '{}'::jsonb,
  published_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_task_generation_run_items_points check (points >= 10 and points <= 500),
  constraint chk_taskai_task_generation_run_items_frequency check (
    (type = 'recurring' and recurring_frequency is not null)
    or
    (type = 'one_time' and recurring_frequency is null)
  )
);

drop trigger if exists trg_taskai_task_generation_run_items_updated_at on public.taskai_task_generation_run_items;
create trigger trg_taskai_task_generation_run_items_updated_at
before update on public.taskai_task_generation_run_items
for each row execute function public.set_updated_at();

create table if not exists public.taskai_task_context_snapshots (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  objective_id uuid references public.taskai_objectives(id) on delete set null,
  generation_run_id uuid references public.taskai_task_generation_runs(id) on delete set null,
  objective_snapshot jsonb not null default '{}'::jsonb,
  document_summary_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_taskai_task_context_snapshots_updated_at on public.taskai_task_context_snapshots;
create trigger trg_taskai_task_context_snapshots_updated_at
before update on public.taskai_task_context_snapshots
for each row execute function public.set_updated_at();

create index if not exists idx_taskai_objectives_org_updated on public.taskai_objectives(org_id, updated_at desc);
create index if not exists idx_taskai_context_documents_org_updated on public.taskai_context_documents(org_id, updated_at desc);
create index if not exists idx_taskai_context_documents_objective on public.taskai_context_documents(objective_id);
create index if not exists idx_taskai_task_generation_runs_org_created on public.taskai_task_generation_runs(org_id, created_at desc);
create index if not exists idx_taskai_task_generation_items_run_order on public.taskai_task_generation_run_items(run_id, sort_order asc);
create index if not exists idx_taskai_task_context_snapshots_org on public.taskai_task_context_snapshots(org_id);

alter table public.taskai_objectives enable row level security;
alter table public.taskai_context_documents enable row level security;
alter table public.taskai_task_generation_runs enable row level security;
alter table public.taskai_task_generation_run_documents enable row level security;
alter table public.taskai_task_generation_run_items enable row level security;
alter table public.taskai_task_context_snapshots enable row level security;

drop policy if exists "taskai_objectives_select_member" on public.taskai_objectives;
create policy "taskai_objectives_select_member"
on public.taskai_objectives for select
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_objectives.org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_objectives_owner_write" on public.taskai_objectives;
create policy "taskai_objectives_owner_write"
on public.taskai_objectives for all
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_objectives.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_objectives.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

drop policy if exists "taskai_context_documents_select_member" on public.taskai_context_documents;
create policy "taskai_context_documents_select_member"
on public.taskai_context_documents for select
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_context_documents.org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_context_documents_owner_write" on public.taskai_context_documents;
create policy "taskai_context_documents_owner_write"
on public.taskai_context_documents for all
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_context_documents.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_context_documents.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_runs_select_member" on public.taskai_task_generation_runs;
create policy "taskai_task_generation_runs_select_member"
on public.taskai_task_generation_runs for select
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_generation_runs.org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_runs_owner_write" on public.taskai_task_generation_runs;
create policy "taskai_task_generation_runs_owner_write"
on public.taskai_task_generation_runs for all
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_generation_runs.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_generation_runs.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_run_documents_select_member" on public.taskai_task_generation_run_documents;
create policy "taskai_task_generation_run_documents_select_member"
on public.taskai_task_generation_run_documents for select
using (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_documents.run_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_run_documents_owner_write" on public.taskai_task_generation_run_documents;
create policy "taskai_task_generation_run_documents_owner_write"
on public.taskai_task_generation_run_documents for all
using (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_documents.run_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_documents.run_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_run_items_select_member" on public.taskai_task_generation_run_items;
create policy "taskai_task_generation_run_items_select_member"
on public.taskai_task_generation_run_items for select
using (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_items.run_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_task_generation_run_items_owner_write" on public.taskai_task_generation_run_items;
create policy "taskai_task_generation_run_items_owner_write"
on public.taskai_task_generation_run_items for all
using (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_items.run_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1
  from public.taskai_task_generation_runs r
  join public.organization_memberships m on m.org_id = r.org_id
  where r.id = taskai_task_generation_run_items.run_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));

drop policy if exists "taskai_task_context_snapshots_select_member" on public.taskai_task_context_snapshots;
create policy "taskai_task_context_snapshots_select_member"
on public.taskai_task_context_snapshots for select
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_context_snapshots.org_id
    and m.user_id = auth.uid()
    and m.status = 'active'
));

drop policy if exists "taskai_task_context_snapshots_owner_write" on public.taskai_task_context_snapshots;
create policy "taskai_task_context_snapshots_owner_write"
on public.taskai_task_context_snapshots for all
using (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_context_snapshots.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
))
with check (exists (
  select 1 from public.organization_memberships m
  where m.org_id = taskai_task_context_snapshots.org_id
    and m.user_id = auth.uid()
    and m.role = 'owner'
    and m.status = 'active'
));
