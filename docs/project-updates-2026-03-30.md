# TaskAI 專案更新總覽（2026-03-30）

最後更新：2026-03-30

本文件只記錄目前已採用、已落地的最終變更結果，不記錄中途嘗試或已撤回方案。

## 1. Project-first TaskAI

TaskAI 現在已正式改成 `project-first`：

- Admin 導航把 `Project Management` 放到 `Task Board` 前面
- `/admin` 預設落到 `Project Management`
- Project Name 必填
- Objective 與 Description 可選

本輪最重要的資料模型變更是：

- `Project` 已獨立成真正資料表：`public.taskai_projects`

不再只是在前端叫 project、底層卻仍借用 `taskai_objectives`。

## 2. Project Management

後台入口：

- `/admin/taskai/projects`

目前已可直接前端測試：

- Create Project
- Upload Project Documents
- Auto summarize after upload
- Generate Tasks
- Generate More Tasks
- Add Task
- Edit / Delete / Select generated tasks
- Publish selected tasks
- Delete Project

## 3. Prompt Management

後台入口：

- `/admin/taskai/prompts`

目前納入管理的核心 prompt：

- `taskai_rtc_tutor_template`
- `taskai_project_document_summary_prompt`
- `taskai_generate_todos_from_project_and_objective`
- `taskai_ai_chat_summary_prompt`

Prompt Management 目前支援：

- 編輯
- Save
- Reset to Default
- Rollback
- Test Prompt
- Version History

## 4. Project Documents + AI Task Generation

Project document 上傳後會：

- 寫入 Supabase Storage
- 寫入 `taskai_context_documents`
- 立即用 `taskai_project_document_summary_prompt` 生成摘要

之後 Generate Tasks 會使用：

- project name
- project objective
- project description
- selected document summaries
- existing task titles

來產生候選 tasks。

## 5. Publish 流程

本輪已把 `publish generated tasks` 從應用層多步寫入，升級成真正資料庫 RPC：

- `public.taskai_publish_generation_run(...)`

現在 publish 會在資料庫函式裡一次完成：

- insert tasks
- insert task context snapshots
- update published_task_id
- update run status

這樣可以避免中間某一步失敗時留下半完成狀態。

WhatsApp 通知仍然保留在應用層，但已改成：

- 單條發布發單條通知
- 批量發布發單條匯總通知
- 通知失敗不會拖累 task publish 失敗

## 6. RTC Context

現在進入某條 task 的 AI workspace 時，RTC 會自動注入：

- `projectDocumentSummary`
- `currentTaskSummary`
- `projectTaskOverview`

然後再接上 `RTC Brainstorm Prompt`。

Prompt Management 裡的 `Readonly Runtime Prompt Composition` 已與真實 runtime 對齊。

## 7. Task Board

Task Board 現在支援：

- `Board / Table` 切換
- Admin 預設 `Table`
- Member 預設 `Board`
- 顯示 Project
- 按 Project 篩選

## 8. Task Completion Evidence

TaskAI 現在不再把「結束 AI brainstorming」直接視為 task 完成。

新流程是：

- 使用者先 claim task
- 進入 AI workspace 做 brainstorming
- 結束聊天後，只會保存：
  - meeting record / conversation records
  - AI chat summary
- task 仍維持 `in_progress`

之後使用者必須到 task detail 頁：

- 填寫一段 written evidence
  或
- 上傳一個 evidence file

只要至少存在 1 筆 completion evidence，才可以按：

- `Mark as Completed`

這批 evidence 目前會：

- 存到 `taskai_task_completion_evidence`
- 檔案存到 private storage bucket：`taskai-task-evidence`
- 在 task detail 頁可查看

## 9. Recurring Tasks

Recurring task 現在不再在完成後直接把同一條 task 重置回 `open`。

新的行為是：

- 當前這一條 recurring task 會正常進入 `completed`
- 目前這次 claim / 完成紀錄會完整保留
- 系統會自動複製出下一個週期的新 task
- 新 task 會帶著相同的 recurring frequency、project、group visibility、task context snapshot
- 新 task 只有在下一個週期時間到達後，才會出現在 Task Board 並可被 claim

這樣 recurring task 對使用者來說會更像一般 task，不會因為同一列立刻重新打開而造成誤解。

## 10. 日期顯示

TaskAI 與 WhatsApp settings 相關時間目前都已統一為英文格式，不再出現：

- `上午`
- `下午`

## 11. 本輪新增 SQL

- `docs/db/2026-03-30_add_taskai_prompt_templates.sql`
- `docs/db/2026-03-30_add_taskai_prompt_template_versions.sql`
- `docs/db/2026-03-30_add_taskai_objectives_documents_and_generation.sql`
- `docs/db/2026-03-30_create_taskai_context_docs_bucket.sql`
- `docs/db/2026-03-30_rename_taskai_prompt_keys_for_project_flow.sql`
- `docs/db/2026-03-30_add_taskai_projects_and_project_relations.sql`
- `docs/db/2026-03-30_add_taskai_publish_generation_run_rpc.sql`
- `docs/db/2026-03-31_add_taskai_task_completion_evidence.sql`
- `docs/db/2026-03-31_make_recurring_tasks_complete_like_normal_tasks.sql`

本輪仍遵守規範：

- 不直接修改 `docs/db/taskai_v1_schema.sql`
- 所有新增 schema 變更都記錄在新的 SQL 檔案
