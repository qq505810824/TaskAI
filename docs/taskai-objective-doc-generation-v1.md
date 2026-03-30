# TaskAI Project Documents + AI Task Generation（V1）

最後更新：2026-03-30

本文件只記錄目前已採用、已落地的最終設計與實作結果，不記錄中途嘗試。

## 1. 目標

TaskAI 現在已經有一條 Owner 專用的 `project-first` AI 任務生成主流程：

- Owner 可建立 `Project`
- Project 可選填 `Objective`
- Owner 可上傳 `Project Documents`
- 文件上傳後會立即生成摘要
- 系統可根據 project、可選 objective、project description、selected document summaries 生成候選 tasks
- 發布後，系統會把 project snapshot 與 document summary snapshot 一起保存，供後續 TaskAI workspace 使用

## 2. 目前前端入口

已落地頁面：

- `/admin/taskai/projects`

此頁面目前已可直接前端測試，包含：

- Create Project
- Upload Project Documents
- Auto summarize after upload
- Generate Tasks
- Generate More Tasks
- Add Task
- Edit / Delete / Select generated tasks
- Publish selected tasks

## 3. 現在的資料模型

### 3.1 Project 主表

Project 現在已獨立成真正資料表：

- `public.taskai_projects`

核心欄位：

- `id`
- `org_id`
- `name`
- `objective`
- `description`
- `status`
- `created_by`
- `created_at`
- `updated_at`

這表示目前前端叫 `Project`，底層也已經真的是 project table，不再只是借用 `taskai_objectives`。

### 3.2 關聯表

這一輪已補齊的關聯包括：

- `taskai_context_documents.project_id`
- `taskai_task_generation_runs.project_id`
- `taskai_task_context_snapshots.project_id`
- `taskai_task_context_snapshots.project_snapshot`
- `tasks.project_id`

舊欄位 `objective_id / objective_snapshot` 目前仍保留在資料庫中，主要是為了舊資料兼容與平滑遷移；新程式路徑已優先使用：

- `project_id`
- `project_snapshot`

## 4. Prompt 管理

目前這條 Project 流程用到的核心 prompt：

### 4.1 `taskai_project_document_summary_prompt`

- 用途：文件上傳後立即生成可重複利用的 project background summary
- 服務：`ark_chat_completions`
- 模型目標：`ARK_MODEL_ID`

### 4.2 `taskai_generate_todos_from_project_and_objective`

- 用途：根據 project、可選 objective、project description 與 selected document summaries 生成候選 tasks
- 服務：`ark_chat_completions`
- 模型目標：`TASKAI_TASK_GENERATION_PROVIDER / ARK_MODEL_ID`

### 4.3 `taskai_rtc_tutor_template`

- 後台顯示名稱：`RTC Brainstorm Prompt`
- 用途：使用者進入某條 task 的 AI workspace 時，作為實時 brainstorming 主 prompt

### 4.4 `taskai_ai_chat_summary_prompt`

- 後台顯示名稱：`AI Chat Summary Prompt`
- 用途：對話結束後，輸出 summary / key points

## 5. 運行方式

### 5.1 Project 建立

Owner 在後台建立 Project 時：

- `Project Name` 必填
- `Objective` 可選
- `Description` 可選

Project record 會直接寫入：

- `public.taskai_projects`

### 5.2 文件上傳

Project documents 會同時寫到：

- Supabase Storage bucket：`taskai-context-docs`（或 `SUPABASE_STORAGE_TASKAI_CONTEXT_DOC_BUCKET`）
- `public.taskai_context_documents`

保存內容包括：

- file metadata
- `raw_text`
- `summary`
- `summary_payload`
- `project_id`
- `project_name`

### 5.3 文件摘要

文件上傳後會立刻呼叫：

- `taskai_project_document_summary_prompt`

輸出是一段單段自然語言摘要，保存到：

- `summary`
- `summary_payload`

現在自動摘要和手動重跑摘要，都會一致帶入：

- `project name`
- `project objective`

避免前後兩次 summary 的上下文不一致。

### 5.4 任務生成

生成候選 tasks 時，系統會使用：

- Project name
- Project objective
- Project description
- Selected document summaries
- Existing task titles

這一步由：

- `taskai_generate_todos_from_project_and_objective`

來生成候選 task items，並寫入：

- `taskai_task_generation_runs`
- `taskai_task_generation_run_documents`
- `taskai_task_generation_run_items`

### 5.5 發布任務

生成出來的 items 不會立即進正式 task 表。

只有在 Owner 按 Publish 時，才會真正寫入：

- `public.tasks`

而且這一步現在已改成真正的資料庫 RPC：

- `public.taskai_publish_generation_run(...)`

也就是：

- insert tasks
- insert task context snapshots
- update published_task_id
- update run status

這些步驟都在資料庫函式裡一次完成，而不是由應用層分多步寫入。

這樣可以避免中途失敗時留下半完成 publish 狀態。

### 5.6 Task Context Snapshot

Publish 後，系統會同步保存：

- `project_snapshot`
- `document_summary_snapshot`

寫入：

- `public.taskai_task_context_snapshots`

之後使用者進入 task 的 AI workspace 時，RTC 會自動拿到：

- `projectDocumentSummary`
- `currentTaskSummary`
- `projectTaskOverview`

## 6. API

### 6.1 Project

目前前端與 API path 都已正式統一為 `projects`，底層也已改用 `taskai_projects`：

- `GET /api/taskai/orgs/[orgId]/projects`
- `POST /api/taskai/orgs/[orgId]/projects`
- `DELETE /api/taskai/orgs/[orgId]/projects/[projectId]`

這些 path 暫時保留是為了避免同一輪把整套路由一起重命名；實際資料來源已經是 project table。

### 6.2 Project Documents

- `GET /api/taskai/orgs/[orgId]/context-documents?projectId=...`
- `POST /api/taskai/orgs/[orgId]/context-documents`
- `POST /api/taskai/orgs/[orgId]/context-documents/[documentId]/summarize`
- `DELETE /api/taskai/orgs/[orgId]/context-documents/[documentId]`

### 6.3 Task Generation

- `GET /api/taskai/orgs/[orgId]/task-generation?projectId=...&includeItems=true`
- `POST /api/taskai/orgs/[orgId]/task-generation`
- `POST /api/taskai/orgs/[orgId]/task-generation/[runId]/items`
- `PATCH /api/taskai/orgs/[orgId]/task-generation/[runId]/items/[itemId]`
- `DELETE /api/taskai/orgs/[orgId]/task-generation/[runId]/items/[itemId]`
- `POST /api/taskai/orgs/[orgId]/task-generation/[runId]/publish`

### 6.4 Task Context

- `GET /api/taskai/tasks/[taskId]/context`

## 7. 為何先不做完整 RAG

V1 目前仍採用：

- 文件保存
- 文件摘要
- 摘要注入 prompt

而不是直接上：

- chunking
- embeddings
- similarity retrieval

原因是先把產品鏈路跑通，再逐步升級到檢索式上下文。

## 8. 資料庫變更

與這條流程直接相關的新 SQL：

- `docs/db/2026-03-30_add_taskai_objectives_documents_and_generation.sql`
- `docs/db/2026-03-30_create_taskai_context_docs_bucket.sql`
- `docs/db/2026-03-30_add_taskai_projects_and_project_relations.sql`
- `docs/db/2026-03-30_add_taskai_publish_generation_run_rpc.sql`

本輪仍遵守規範：

- 不直接修改 `docs/db/taskai_v1_schema.sql`
- 所有新增 schema 都記錄在新的 SQL 檔案
