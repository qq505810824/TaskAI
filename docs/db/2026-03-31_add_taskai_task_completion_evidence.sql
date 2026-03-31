begin;

create table if not exists public.taskai_task_completion_evidence (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null,
  text_content text,
  file_name text,
  mime_type text,
  storage_bucket text,
  storage_path text,
  file_size bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_task_completion_evidence_type check (evidence_type in ('text', 'file')),
  constraint chk_taskai_task_completion_evidence_payload check (
    (evidence_type = 'text' and nullif(text_content, '') is not null and storage_path is null)
    or
    (evidence_type = 'file' and nullif(file_name, '') is not null and nullif(storage_path, '') is not null)
  )
);

drop trigger if exists trg_taskai_task_completion_evidence_updated_at on public.taskai_task_completion_evidence;
create trigger trg_taskai_task_completion_evidence_updated_at
before update on public.taskai_task_completion_evidence
for each row execute function public.set_updated_at();

create index if not exists idx_taskai_task_completion_evidence_task_created
  on public.taskai_task_completion_evidence (task_id, created_at desc);

create index if not exists idx_taskai_task_completion_evidence_user_created
  on public.taskai_task_completion_evidence (user_id, created_at desc);

alter table public.taskai_task_completion_evidence enable row level security;

drop policy if exists "taskai_task_completion_evidence_select_member" on public.taskai_task_completion_evidence;
create policy "taskai_task_completion_evidence_select_member"
on public.taskai_task_completion_evidence for select
using (
  exists (
    select 1
    from public.organization_memberships m
    where m.org_id = taskai_task_completion_evidence.org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  )
);

drop policy if exists "taskai_task_completion_evidence_insert_assignee_or_owner" on public.taskai_task_completion_evidence;
create policy "taskai_task_completion_evidence_insert_assignee_or_owner"
on public.taskai_task_completion_evidence for insert
with check (
  exists (
    select 1
    from public.tasks t
    join public.organization_memberships m
      on m.org_id = t.org_id
     and m.user_id = auth.uid()
     and m.status = 'active'
    where t.id = taskai_task_completion_evidence.task_id
      and t.org_id = taskai_task_completion_evidence.org_id
      and (
        m.role = 'owner'
        or (t.assignee_user_id = auth.uid() and t.status = 'in_progress')
      )
  )
);

drop policy if exists "taskai_task_completion_evidence_delete_assignee_or_owner" on public.taskai_task_completion_evidence;
create policy "taskai_task_completion_evidence_delete_assignee_or_owner"
on public.taskai_task_completion_evidence for delete
using (
  exists (
    select 1
    from public.tasks t
    join public.organization_memberships m
      on m.org_id = t.org_id
     and m.user_id = auth.uid()
     and m.status = 'active'
    where t.id = taskai_task_completion_evidence.task_id
      and t.org_id = taskai_task_completion_evidence.org_id
      and (
        m.role = 'owner'
        or (t.assignee_user_id = auth.uid() and t.status = 'in_progress')
      )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'taskai-task-evidence',
  'taskai-task-evidence',
  false,
  20971520,
  array[
    'text/plain',
    'text/markdown',
    'application/json',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

commit;
