begin;

alter table public.taskai_prompt_templates
  drop constraint if exists chk_taskai_prompt_templates_key;

alter table public.taskai_prompt_template_versions
  drop constraint if exists chk_taskai_prompt_template_versions_key;

update public.taskai_prompt_templates
set prompt_key = 'taskai_ai_chat_summary_prompt'
where prompt_key = 'taskai_task_summary';

update public.taskai_prompt_templates
set prompt_key = 'taskai_project_document_summary_prompt'
where prompt_key = 'taskai_document_summary';

update public.taskai_prompt_templates
set prompt_key = 'taskai_generate_todos_from_project_and_objective'
where prompt_key = 'taskai_task_generation';

update public.taskai_prompt_template_versions
set prompt_key = 'taskai_ai_chat_summary_prompt'
where prompt_key = 'taskai_task_summary';

update public.taskai_prompt_template_versions
set prompt_key = 'taskai_project_document_summary_prompt'
where prompt_key = 'taskai_document_summary';

update public.taskai_prompt_template_versions
set prompt_key = 'taskai_generate_todos_from_project_and_objective'
where prompt_key = 'taskai_task_generation';

update public.taskai_task_generation_runs
set prompt_key = 'taskai_generate_todos_from_project_and_objective'
where prompt_key = 'taskai_task_generation';

alter table public.taskai_prompt_templates
  add constraint chk_taskai_prompt_templates_key
  check (prompt_key in (
    'taskai_rtc_tutor_template',
    'taskai_rtc_fallback',
    'taskai_ai_chat_summary_prompt',
    'taskai_project_document_summary_prompt',
    'taskai_generate_todos_from_project_and_objective'
  ));

alter table public.taskai_prompt_template_versions
  add constraint chk_taskai_prompt_template_versions_key
  check (prompt_key in (
    'taskai_rtc_tutor_template',
    'taskai_rtc_fallback',
    'taskai_ai_chat_summary_prompt',
    'taskai_project_document_summary_prompt',
    'taskai_generate_todos_from_project_and_objective'
  ));

commit;
