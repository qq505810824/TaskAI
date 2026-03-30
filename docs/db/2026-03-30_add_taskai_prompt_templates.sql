begin;

create table if not exists public.taskai_prompt_templates (
  prompt_key text primary key,
  content text not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_taskai_prompt_templates_key
    check (prompt_key in (
      'taskai_rtc_tutor_template',
      'taskai_rtc_fallback',
      'taskai_task_summary'
    ))
);

drop trigger if exists trg_taskai_prompt_templates_updated_at on public.taskai_prompt_templates;
create trigger trg_taskai_prompt_templates_updated_at
before update on public.taskai_prompt_templates
for each row execute function public.set_updated_at();

alter table public.taskai_prompt_templates enable row level security;

commit;
