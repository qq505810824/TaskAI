# TaskAI Prompt Management

最後更新：2026-03-30

本文件記錄 TaskAI 目前 Prompt Management 的最終行為與範圍。

## 1. 目標

讓 TaskAI admin 可以直接在後台查看、編輯、測試、恢復和回滾核心 prompt，不需要每次都找工程師改程式碼。

目前納入管理的 prompt：

- `taskai_rtc_tutor_template`
- `taskai_project_document_summary_prompt`
- `taskai_generate_todos_from_project_and_objective`
- `taskai_ai_chat_summary_prompt`

不納入本輪範圍：

- Dify 舊流程 prompt
- transcribe 相關 prompt
- 舊 meeting / talk prompt
- 本機 OpenClaw WhatsApp assistant prompt

## 2. 後台入口

- `/admin/taskai/prompts`

頁面名稱：

- `Prompt Management`

目前 UI 已收斂成簡潔模式：

- 頂部 search / filters 已移除
- 每條 prompt 預設折疊
- 預設只顯示標題、用途描述與 `Edit Prompt`
- 點開後才顯示：
  - Prompt 編輯內容
  - Readonly runtime prompt / user prompt
  - Test Prompt
  - Version History

## 3. 目前可管理的 Prompt

### 3.1 RTC Brainstorm Prompt

- key：`taskai_rtc_tutor_template`
- 用途：TaskAI workspace 啟動 RTC brainstorming 時的主 prompt
- 主要 runtime inputs：
  - `topic`
  - `description`
  - `projectDocumentSummary`
  - `currentTaskSummary`
  - `projectTaskOverview`

`Readonly Runtime Prompt Composition` 目前會明確展示：

- project background summary
- all tasks for this project
- the current task we are talking about right now
- editable RTC brainstorm prompt

這份 readonly block 與真正 runtime 送進 AI 的內容一致。

### 3.2 Project Document Summary Prompt

- key：`taskai_project_document_summary_prompt`
- 用途：Project document 上傳後立即生成一段自然語言摘要
- 主要 runtime inputs：
  - `documentTitle`
  - `projectName`
  - `projectObjective`
  - `rawDocumentText`

目前這條 prompt 已收斂成：

- 只輸出 `summary`
- 不再強制輸出 `constraints / key_points / recommended_focus`

### 3.3 Generate Todos from Project & Objective

- key：`taskai_generate_todos_from_project_and_objective`
- 用途：根據 project、可選 objective、project description、selected document summaries 生成候選 tasks
- 主要 runtime inputs：
  - `organizationName`
  - `projectName`
  - `projectObjective`
  - `projectDescription`
  - `documentSummaries`
  - `existingTaskTitles`

`requestedTaskCount` 已不再出現在 Prompt Management UI 或 readonly runtime prompt 中。

任務數量現在由系統根據 project/context 長度自動推算。

### 3.4 AI Chat Summary Prompt

- key：`taskai_ai_chat_summary_prompt`
- 用途：使用者與 AI 聊完之後，輸出 summary 與 key points
- 主要 runtime inputs：
  - `taskTitle`
  - `taskDescription`
  - `language`
  - `transcript`

## 4. 儲存方式

資料庫保存位置：

- Prompt override：`public.taskai_prompt_templates`
- Prompt version history：`public.taskai_prompt_template_versions`

執行規則：

- 若資料庫沒有 override，runtime 會用 code default
- 若資料庫有 override，runtime 會優先用資料庫版本
- `Reset to Default` 會刪除 override，重新退回 code default
- 每次 `Save`、`Reset to Default`、`Rollback` 都會新增一筆 version record

## 5. Bootstrap / Cache

目前 prompt runtime 已接上：

- server global in-memory cache
- 首次進站 bootstrap 預熱

流程如下：

- 使用者第一次進站後，前端會呼叫 `/api/taskai/prompts/bootstrap`
- server 會先把 prompt 載入到記憶體快取
- 後續 runtime 優先讀取這份快取
- Save / Reset / Rollback 後，cache 會立即失效並重建

## 6. Test Prompt

目前每條 prompt 都可以直接在後台測試：

- 可填 sample runtime inputs
- 可直接測試當前草稿，不必先保存
- RTC prompt 顯示 composed prompt
- ARK prompt 會真正調模型並回傳 preview 結果

其中：

- `Project Document Summary Prompt` 的測試區已改成上傳文件 box

## 7. 資料庫變更

Prompt Management 直接相關 SQL：

- `docs/db/2026-03-30_add_taskai_prompt_templates.sql`
- `docs/db/2026-03-30_add_taskai_prompt_template_versions.sql`
- `docs/db/2026-03-30_rename_taskai_prompt_keys_for_project_flow.sql`

本輪仍遵守規範：

- 不直接修改 `docs/db/taskai_v1_schema.sql`
- 所有新增 schema 都放在新的 SQL 檔案
