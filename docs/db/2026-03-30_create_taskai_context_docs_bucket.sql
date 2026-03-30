-- Create Supabase Storage bucket for TaskAI context documents
-- Date: 2026-03-30

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'taskai-context-docs',
  'taskai-context-docs',
  false,
  10485760,
  array[
    'text/plain',
    'text/markdown',
    'application/json',
    'text/csv',
    'text/html'
  ]
)
on conflict (id) do nothing;
