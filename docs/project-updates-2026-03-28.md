# TaskAI 專案更新總覽（2026-03-28）

最後更新：2026-03-28

本文件只記錄目前已採用、已落地的最終變更結果，不記錄中途嘗試或已撤回方案。

## 1. TaskAI 主介面與資料渲染

目前 TaskAI 主介面已完成以下調整：

- member / admin 端的 `tasks`、`overview`、`leaderboard`、`insights` 等主要頁面，在 auth、membership、org selection 與首輪資料尚未 ready 前，會先顯示 loading，不先渲染假資料或錯誤空狀態
- admin insights 內原本偏 marketing / mock 的區塊，已改為使用 live organization data
- `my/overview` 頁面已補上初次 refresh 的 loading gate，避免先顯示預設空值再跳成真實資料

本輪新增的共用機制：

- `src/components/taskai/TaskaiPageLoader.tsx`
  - 共用 TaskAI loading UI
- `src/hooks/taskai/useTaskaiSelectedOrg.ts`
  - 統一 admin / member 端 org selection 初始化、儲存與同步事件
- `src/hooks/taskai/fetchTaskaiJson.ts`
  - 統一主要 TaskAI hook 的 request 去重與首輪重複請求保護

對應文件：

- `docs/taskai-live-data-rendering.md`

## 2. WhatsApp 綁定、通知與本機派送

目前 WhatsApp 第一版能力已落地：

- 使用者可在設定頁綁定 WhatsApp 電話並發送驗證碼
- 驗證碼會透過本機 dispatcher 與 `openclaw-whatsapp` 派送到使用者 WhatsApp
- 使用者從同一個 WhatsApp chat 回覆驗證碼後，可完成綁定
- 設定頁可看到 verification 狀態、通知偏好、最近通知紀錄與 `scheduled_for`
- 使用者可解除綁定，解除時會一併取消未完成 verification
- admin 可在 `/admin/taskai/notifications` 查看通知發送紀錄

目前已接入的通知事件：

- `task_new_available`
- `task_claimed`
- `task_claimed_no_ai_started`
- `task_claimed_stalled`
- `task_completed_encourage`
- `binding_verification_code`

目前正式採用的派送模式：

- 正式站或 Vercel 負責建立 queue job
- 本機 Mac dispatcher 主動 pull `api/internal/whatsapp/jobs/claim`
- 本機 `openclaw-whatsapp` 實際送出訊息
- bridge 再把結果回寫到 `api/internal/whatsapp/jobs/[jobId]/result`

重要限制：

- 若本機 dispatcher 的 `TASKAI_BASE_URL` 仍指向 `http://localhost:3000`，則本機只會處理本地開發環境的 queue，不會處理 Vercel production queue
- 若要讓 Vercel production 建立的 job 真正發到本機 WhatsApp，本機 `TASKAI_BASE_URL` 必須改為正式站 domain

對應文件：

- `docs/taskai-whatsapp-integration-v1-technical-plan.md`
- `docs/taskai-whatsapp-verification-binding-v1.md`
- `docs/taskai-whatsapp-local-worker-operations.md`
- `docs/vercel-deployment.md`

工程師交接重點已補充到部署文件：

- Vercel Production 必須設定 `TASKAI_INTERNAL_BRIDGE_TOKEN`
- Bobby 本機 `/Users/bobbylian/.taskai-whatsapp-dispatch.env` 必須把 `TASKAI_BASE_URL` 切到正式域名
- 本機 dispatcher 與 `openclaw-whatsapp` 需維持在線，正式站 job 才會真的發到 WhatsApp

## 3. 環境變數與部署

目前專案已補上較完整的環境變數範例與部署說明：

- `.env.example` 已列出 Supabase、RTC、LLM、local WhatsApp bridge 與 legacy feature toggles
- `docs/vercel-deployment.md` 已補上：
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_BASE_URL`
  - TaskAI notification link origin 規則
  - Vercel production 與本機 WhatsApp worker 串接時的注意事項
  - 正式發佈前 smoke test 建議

## 4. 資料庫變更

本輪資料庫變更已依規範以新增 SQL 檔方式記錄於 `docs/db/`，未直接覆寫 `docs/db/taskai_v1_schema.sql`。

本輪新增 SQL：

- `docs/db/2026-03-28_add_taskai_whatsapp_notifications.sql`
- `docs/db/2026-03-28_add_taskai_whatsapp_verifications.sql`
- `docs/db/2026-03-28_add_taskai_whatsapp_task_claimed_notification.sql`
- `docs/db/2026-03-28_allow_orgless_whatsapp_notification_jobs.sql`
- `docs/db/2026-03-28_add_task_claims_active_unique_index.sql`
- `docs/db/2026-03-28_fix_complete_task_idempotency.sql`

## 5. 文件索引

若要查詢各區塊的正式狀態，請優先看以下文件：

- 開發規範：`docs/development-collaboration-conventions.md`
- TaskAI 頁面 refresh / live data 規範：`docs/taskai-live-data-rendering.md`
- WhatsApp 技術方案：`docs/taskai-whatsapp-integration-v1-technical-plan.md`
- WhatsApp 驗證碼綁定：`docs/taskai-whatsapp-verification-binding-v1.md`
- 本機 worker 操作：`docs/taskai-whatsapp-local-worker-operations.md`
- Vercel 部署：`docs/vercel-deployment.md`
