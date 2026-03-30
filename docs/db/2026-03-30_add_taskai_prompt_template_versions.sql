begin;

create table if not exists public.taskai_prompt_template_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  content text not null,
  result_source text not null,
  action text not null,
  created_by uuid references auth.users(id) on delete set null,
  restored_from_version_id uuid references public.taskai_prompt_template_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint chk_taskai_prompt_template_versions_key
    check (prompt_key in (
      'taskai_rtc_tutor_template',
      'taskai_rtc_fallback',
      'taskai_task_summary'
    )),
  constraint chk_taskai_prompt_template_versions_source
    check (result_source in ('default', 'database')),
  constraint chk_taskai_prompt_template_versions_action
    check (action in ('saved', 'reset_to_default', 'rolled_back'))
);

create index if not exists idx_taskai_prompt_template_versions_prompt_key_created_at
  on public.taskai_prompt_template_versions (prompt_key, created_at desc);

alter table public.taskai_prompt_template_versions enable row level security;

commit;
