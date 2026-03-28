-- TaskAI V1 Supabase Schema
-- Date: 2026-03-26
-- Scope: Web App V1 (Owner/Member, Goals, Tasks, Groups, Leaderboard, Activity, Notifications, AI task generation)
-- Notes:
--   1) Existing auth flows are already in project and are not recreated here.
--   2) This schema is designed for Supabase Postgres.

begin;

-- =========================
-- Extensions
-- =========================
create extension if not exists "pgcrypto";

-- =========================
-- Common updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- Enums
-- =========================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_member_role') then
    create type public.org_member_role as enum ('owner', 'member');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('active', 'invited', 'removed');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_type') then
    create type public.task_type as enum ('one_time', 'recurring');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_recurring_frequency') then
    create type public.task_recurring_frequency as enum ('daily', 'weekly', 'monthly');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('open', 'in_progress', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'claim_status') then
    create type public.claim_status as enum ('claimed', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'invite_status') then
    create type public.invite_status as enum ('active', 'revoked', 'expired');
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'new_task',
      'task_claimed',
      'task_completed',
      'rank_changed',
      'member_joined',
      'system'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_job_status') then
    create type public.ai_job_status as enum ('pending', 'running', 'done', 'failed');
  end if;
end $$;

-- =========================
-- Core profile table
-- =========================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text default 'zh-CN',
  timezone text default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =========================
-- Organization domain
-- =========================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- 9-digit invite code; auto-filled by trigger on insert when null
  invite_code text,
  points_pool_total integer,
  points_pool_remaining integer,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_org_points_pool_non_negative
    check (
      (points_pool_total is null and points_pool_remaining is null)
      or
      (points_pool_total is not null and points_pool_remaining is not null and points_pool_total >= 0 and points_pool_remaining >= 0 and points_pool_remaining <= points_pool_total)
    )
);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_member_role not null default 'member',
  status public.membership_status not null default 'active',
  points_balance integer not null default 0,
  points_earned_total integer not null default 0,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id),
  constraint chk_membership_points_non_negative check (points_balance >= 0 and points_earned_total >= 0)
);

drop trigger if exists trg_organization_memberships_updated_at on public.organization_memberships;
create trigger trg_organization_memberships_updated_at
before update on public.organization_memberships
for each row execute function public.set_updated_at();

-- Ensure one owner per org (active owner only)
create unique index if not exists uq_org_single_owner
on public.organization_memberships (org_id)
where role = 'owner' and status = 'active';

-- =========================
-- Goals and tasks
-- =========================
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  target_points integer,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_goals_target_points_non_negative check (target_points is null or target_points >= 0)
);

drop trigger if exists trg_goals_updated_at on public.goals;
create trigger trg_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  points integer not null,
  type public.task_type not null default 'one_time',
  recurring_frequency public.task_recurring_frequency,
  status public.task_status not null default 'open',
  category text,
  assignee_user_id uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz,
  last_claimed_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_tasks_points_positive check (points > 0),
  constraint chk_recurring_frequency_consistency check (
    (type = 'recurring' and recurring_frequency is not null)
    or
    (type = 'one_time' and recurring_frequency is null)
  )
);

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create table if not exists public.task_claims (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  claim_status public.claim_status not null default 'claimed',
  claimed_at timestamptz not null default now(),
  completed_at timestamptz,
  points_awarded integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_claim_points_non_negative check (points_awarded >= 0)
);

drop trigger if exists trg_task_claims_updated_at on public.task_claims;
create trigger trg_task_claims_updated_at
before update on public.task_claims
for each row execute function public.set_updated_at();

-- =========================
-- Groups
-- =========================
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

drop trigger if exists trg_groups_updated_at on public.groups;
create trigger trg_groups_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.task_visible_groups (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id, group_id)
);

-- =========================
-- Activity and notifications
-- =========================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  points_delta integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  content text not null,
  is_read boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- =========================
-- Invites
-- =========================
create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique,
  status public.invite_status not null default 'active',
  expires_at timestamptz,
  max_uses integer,
  used_count integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_invite_max_uses check (max_uses is null or max_uses > 0),
  constraint chk_invite_used_count_non_negative check (used_count >= 0)
);

drop trigger if exists trg_invite_links_updated_at on public.invite_links;
create trigger trg_invite_links_updated_at
before update on public.invite_links
for each row execute function public.set_updated_at();

-- =========================
-- Organization invite_code (9 digits, unique; auto on org insert)
-- (Placed after invite_links so uniqueness can consider legacy codes.)
-- =========================
alter table public.organizations add column if not exists invite_code text;

create or replace function public.generate_org_invite_code()
returns text
language plpgsql
as $$
declare
  c text;
  attempts int := 0;
begin
  loop
    c := lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');
    attempts := attempts + 1;
    if attempts > 60 then
      raise exception 'failed to generate unique organization invite code';
    end if;
    exit when not exists (select 1 from public.organizations o where o.invite_code = c)
      and not exists (select 1 from public.invite_links il where il.code = c);
  end loop;
  return c;
end;
$$;

create or replace function public.trg_organizations_set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null or btrim(new.invite_code) = '' then
    new.invite_code := public.generate_org_invite_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_organizations_invite_code on public.organizations;
create trigger trg_organizations_invite_code
before insert on public.organizations
for each row execute function public.trg_organizations_set_invite_code();

do $$
declare
  r record;
begin
  for r in select id from public.organizations where invite_code is null or btrim(invite_code) = '' loop
    update public.organizations
    set invite_code = public.generate_org_invite_code()
    where id = r.id;
  end loop;
end $$;

create unique index if not exists uq_organizations_invite_code
  on public.organizations (invite_code)
  where invite_code is not null;

-- =========================
-- AI task generation
-- =========================
create table if not exists public.ai_task_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_type text not null, -- 'text' | 'file'
  source_file_name text,
  source_text text,
  status public.ai_job_status not null default 'pending',
  model_name text,
  prompt_tokens integer,
  completion_tokens integer,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ai_task_generation_jobs_updated_at on public.ai_task_generation_jobs;
create trigger trg_ai_task_generation_jobs_updated_at
before update on public.ai_task_generation_jobs
for each row execute function public.set_updated_at();

create table if not exists public.ai_task_suggestions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_task_generation_jobs(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  suggested_goal_id uuid references public.goals(id) on delete set null,
  title text not null,
  description text,
  suggested_points integer not null default 10,
  selected boolean not null default false,
  imported_task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chk_ai_suggested_points_positive check (suggested_points > 0)
);

-- =========================
-- TaskAI conversation + summary
-- =========================
create table if not exists public.taskai_task_conversations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_message_text text not null default '',
  ai_response_text text not null default '',
  user_sent_at timestamptz not null default now(),
  ai_responded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.taskai_task_summaries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  generated_by uuid not null references auth.users(id) on delete restrict,
  summary text not null,
  key_points jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_taskai_task_summaries_updated_at on public.taskai_task_summaries;
create trigger trg_taskai_task_summaries_updated_at
before update on public.taskai_task_summaries
for each row execute function public.set_updated_at();

-- =========================
-- Indexes
-- =========================
create index if not exists idx_memberships_org_user on public.organization_memberships(org_id, user_id);
create index if not exists idx_memberships_org_points_desc on public.organization_memberships(org_id, points_earned_total desc);

create index if not exists idx_goals_org_created_at on public.goals(org_id, created_at desc);

create index if not exists idx_tasks_org_status_goal on public.tasks(org_id, status, goal_id);
create index if not exists idx_tasks_org_created_at on public.tasks(org_id, created_at desc);
create index if not exists idx_tasks_assignee on public.tasks(assignee_user_id);

create index if not exists idx_task_claims_task_created_at on public.task_claims(task_id, created_at desc);
create index if not exists idx_task_claims_org_user on public.task_claims(org_id, user_id);

create index if not exists idx_group_memberships_org_user on public.group_memberships(org_id, user_id);
create index if not exists idx_task_visible_groups_task_group on public.task_visible_groups(task_id, group_id);

create index if not exists idx_activities_org_created_at on public.activities(org_id, created_at desc);
create index if not exists idx_notifications_user_read_created_at on public.notifications(user_id, is_read, created_at desc);

create index if not exists idx_invite_links_org_status on public.invite_links(org_id, status);
create index if not exists idx_ai_jobs_org_created_at on public.ai_task_generation_jobs(org_id, created_at desc);
create index if not exists idx_ai_suggestions_job on public.ai_task_suggestions(job_id);
create index if not exists idx_taskai_task_conversations_task_created on public.taskai_task_conversations(task_id, created_at asc);
create index if not exists idx_taskai_task_conversations_org_task on public.taskai_task_conversations(org_id, task_id);
create index if not exists idx_taskai_task_summaries_org_task on public.taskai_task_summaries(org_id, task_id);

-- =========================
-- Helper functions for RLS
-- =========================
create or replace function public.is_org_member(_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.org_id = _org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_org_owner(_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.org_id = _org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = 'owner'
  );
$$;

-- =========================
-- RLS enable
-- =========================
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.goals enable row level security;
alter table public.tasks enable row level security;
alter table public.task_claims enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.task_visible_groups enable row level security;
alter table public.activities enable row level security;
alter table public.notifications enable row level security;
alter table public.invite_links enable row level security;
alter table public.ai_task_generation_jobs enable row level security;
alter table public.ai_task_suggestions enable row level security;

-- =========================
-- RLS policies
-- =========================

-- profiles
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles for insert
with check (id = auth.uid());

-- organizations
drop policy if exists "org_select_member" on public.organizations;
create policy "org_select_member"
on public.organizations for select
using (public.is_org_member(id));

drop policy if exists "org_insert_authenticated" on public.organizations;
create policy "org_insert_authenticated"
on public.organizations for insert
with check (created_by = auth.uid());

drop policy if exists "org_update_owner" on public.organizations;
create policy "org_update_owner"
on public.organizations for update
using (public.is_org_owner(id))
with check (public.is_org_owner(id));

-- organization_memberships
drop policy if exists "membership_select_member" on public.organization_memberships;
create policy "membership_select_member"
on public.organization_memberships for select
using (public.is_org_member(org_id));

drop policy if exists "membership_insert_owner_only" on public.organization_memberships;
create policy "membership_insert_owner_only"
on public.organization_memberships for insert
with check (public.is_org_owner(org_id));

drop policy if exists "membership_update_owner_only" on public.organization_memberships;
create policy "membership_update_owner_only"
on public.organization_memberships for update
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- goals
drop policy if exists "goals_select_member" on public.goals;
create policy "goals_select_member"
on public.goals for select
using (public.is_org_member(org_id));

drop policy if exists "goals_write_owner" on public.goals;
create policy "goals_write_owner"
on public.goals for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- tasks
drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member"
on public.tasks for select
using (public.is_org_member(org_id));

drop policy if exists "tasks_insert_owner" on public.tasks;
create policy "tasks_insert_owner"
on public.tasks for insert
with check (public.is_org_owner(org_id));

drop policy if exists "tasks_update_owner_or_assignee" on public.tasks;
create policy "tasks_update_owner_or_assignee"
on public.tasks for update
using (
  public.is_org_owner(org_id)
  or assignee_user_id = auth.uid()
)
with check (
  public.is_org_owner(org_id)
  or assignee_user_id = auth.uid()
);

drop policy if exists "tasks_delete_owner" on public.tasks;
create policy "tasks_delete_owner"
on public.tasks for delete
using (public.is_org_owner(org_id));

-- task_claims
drop policy if exists "task_claims_select_member" on public.task_claims;
create policy "task_claims_select_member"
on public.task_claims for select
using (public.is_org_member(org_id));

drop policy if exists "task_claims_insert_member" on public.task_claims;
create policy "task_claims_insert_member"
on public.task_claims for insert
with check (public.is_org_member(org_id) and user_id = auth.uid());

drop policy if exists "task_claims_update_owner_or_self" on public.task_claims;
create policy "task_claims_update_owner_or_self"
on public.task_claims for update
using (public.is_org_owner(org_id) or user_id = auth.uid())
with check (public.is_org_owner(org_id) or user_id = auth.uid());

-- groups
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
on public.groups for select
using (public.is_org_member(org_id));

drop policy if exists "groups_write_owner" on public.groups;
create policy "groups_write_owner"
on public.groups for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- group_memberships
drop policy if exists "group_memberships_select_member" on public.group_memberships;
create policy "group_memberships_select_member"
on public.group_memberships for select
using (public.is_org_member(org_id));

drop policy if exists "group_memberships_write_owner" on public.group_memberships;
create policy "group_memberships_write_owner"
on public.group_memberships for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- task_visible_groups
drop policy if exists "task_visible_groups_select_member" on public.task_visible_groups;
create policy "task_visible_groups_select_member"
on public.task_visible_groups for select
using (public.is_org_member(org_id));

drop policy if exists "task_visible_groups_write_owner" on public.task_visible_groups;
create policy "task_visible_groups_write_owner"
on public.task_visible_groups for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- activities
drop policy if exists "activities_select_member" on public.activities;
create policy "activities_select_member"
on public.activities for select
using (public.is_org_member(org_id));

drop policy if exists "activities_insert_member" on public.activities;
create policy "activities_insert_member"
on public.activities for insert
with check (public.is_org_member(org_id));

-- notifications
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
on public.notifications for select
using (user_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
on public.notifications for update
using (user_id = auth.uid() and public.is_org_member(org_id))
with check (user_id = auth.uid() and public.is_org_member(org_id));

drop policy if exists "notifications_insert_owner" on public.notifications;
create policy "notifications_insert_owner"
on public.notifications for insert
with check (public.is_org_owner(org_id));

-- invite_links
drop policy if exists "invite_links_select_owner" on public.invite_links;
create policy "invite_links_select_owner"
on public.invite_links for select
using (public.is_org_owner(org_id));

drop policy if exists "invite_links_write_owner" on public.invite_links;
create policy "invite_links_write_owner"
on public.invite_links for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- ai jobs
drop policy if exists "ai_jobs_select_member" on public.ai_task_generation_jobs;
create policy "ai_jobs_select_member"
on public.ai_task_generation_jobs for select
using (public.is_org_member(org_id));

drop policy if exists "ai_jobs_insert_owner" on public.ai_task_generation_jobs;
create policy "ai_jobs_insert_owner"
on public.ai_task_generation_jobs for insert
with check (public.is_org_owner(org_id));

drop policy if exists "ai_jobs_update_owner" on public.ai_task_generation_jobs;
create policy "ai_jobs_update_owner"
on public.ai_task_generation_jobs for update
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- ai suggestions
drop policy if exists "ai_suggestions_select_member" on public.ai_task_suggestions;
create policy "ai_suggestions_select_member"
on public.ai_task_suggestions for select
using (public.is_org_member(org_id));

drop policy if exists "ai_suggestions_write_owner" on public.ai_task_suggestions;
create policy "ai_suggestions_write_owner"
on public.ai_task_suggestions for all
using (public.is_org_owner(org_id))
with check (public.is_org_owner(org_id));

-- =========================
-- Business function: complete task
-- =========================
create or replace function public.complete_task(_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_membership public.organization_memberships%rowtype;
  v_claim_id uuid;
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

  select * into v_membership
  from public.organization_memberships
  where org_id = v_task.org_id
    and user_id = auth.uid()
    and status = 'active'
  for update;

  if v_membership.id is null then
    raise exception 'membership not found';
  end if;

  -- update task status
  if v_task.type = 'one_time' then
    update public.tasks
    set
      status = 'completed',
      completed_at = now(),
      last_completed_at = now(),
      assignee_user_id = auth.uid(),
      updated_at = now()
    where id = v_task.id;
  else
    update public.tasks
    set
      status = 'open',
      completed_at = null,
      last_completed_at = now(),
      assignee_user_id = null,
      updated_at = now()
    where id = v_task.id;
  end if;

  -- close latest claimed record
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

  -- add points
  update public.organization_memberships
  set
    points_balance = points_balance + v_task.points,
    points_earned_total = points_earned_total + v_task.points,
    updated_at = now()
  where id = v_membership.id;

  -- deduct org pool if configured
  update public.organizations
  set
    points_pool_remaining = case
      when points_pool_remaining is null then null
      when points_pool_remaining - v_task.points < 0 then 0
      else points_pool_remaining - v_task.points
    end,
    updated_at = now()
  where id = v_task.org_id;

  -- write activity
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
$$;

-- Allow logged-in users to call complete_task (uses auth.uid() inside; security definer)
grant execute on function public.complete_task(uuid) to authenticated;

commit;
