# TaskAI WhatsApp Integration V1 技術方案

最後更新：2026-03-28

## 1. 目標

本方案定義 TaskAI 第一版 WhatsApp 主動通知能力的實作方式。此版本以「先用 Bobby 這台 Mac 上既有的 WhatsApp bridge」為前提，不直接接 Meta Cloud API，也不引入新的常駐雲端訊息服務。

第一版目標：

- 讓使用者可在 TaskAI 內設定自己的 WhatsApp 接收號碼與通知偏好
- 讓 TaskAI 在關鍵任務事件發生時，自動建立待發送通知 job
- 讓本機 WhatsApp worker 可以從 TaskAI 取件、發送並回寫結果
- 讓 admin 可在平台內看到通知發送紀錄與失敗原因

## 2. 第一版範圍

### 2.1 本次優先實作事件

- 新任務可領取
- 任務已領取確認
- claim 後尚未開始 AI 對話
- claim 後長時間未完成
- 任務完成鼓勵
- 排名提升 / 積分里程碑

### 2.2 本輪先落地的核心能力

- WhatsApp 綁定 / 偏好設定 UI
- WhatsApp 驗證碼綁定流程
- 通知 queue 資料表
- 通知模板與入列邏輯
- 本機 bridge 專用內部 API
- admin 發送紀錄頁
- 將通知接入既有任務事件

### 2.3 第一版暫不做

- Meta / WhatsApp Business 官方雲端發送
- 複雜 inbound chatbot 流程
- 多語系通知模板
- 用戶端完整通知規則中心

## 2A. Phase Roadmap

### Phase 1：已完成的基礎能力

目標：

- 建立 WhatsApp 通知最小可行產品
- 建立 queue / dispatch / log / verification 基礎架構

目前已完成：

- WhatsApp 綁定與驗證碼驗證
- 新任務可領取通知
- 任務已領取確認通知
- claim 後尚未開始 AI 對話提醒
- claim 後長時間未完成提醒
- 任務完成鼓勵訊息
- admin 發送紀錄頁
- 使用者設定頁與解除綁定
- 本機 LaunchAgent 自動派送

### Phase 2：遊戲化通知與規則優化

目標：

- 把 WhatsApp 通知從「任務提醒工具」升級成「提升活躍與完成率的互動層」

建議範圍：

- 正式接上 `leaderboard_rank_up`
- 正式接上 `points_milestone`
- 補上排名與積分計算的事件觸發點
- 增加 notification dedupe 與頻率控制
- 增加 quiet hours 實際生效邏輯
- 增加 test / preview 文案檢查
- admin log 增加篩選條件與統計摘要
- user recent notifications 顯示更友善的事件標籤

Phase 2 實作項目建議：

1. 新增排行榜與里程碑事件產生器
2. 在 `overview / leaderboard / complete_task` 相關流程接入事件
3. 新增每天 / 每次任務的發送上限
4. 對同一 user + 同一事件 + 同一任務做更嚴格去重
5. 把 quiet hours 從「純設定」升級成「實際延遲送出」

Phase 2 驗收條件：

- 使用者排名上升時可收到 WhatsApp
- 使用者達到積分里程碑時可收到 WhatsApp
- quiet hours 期間不會直接送出提醒
- 同一類提醒不會在短時間內重複洗版

### Phase 3：雙向互動與營運能力

目標：

- 讓 WhatsApp 不只是收通知，也能成為 TaskAI 的互動入口

建議範圍：

- inbound 指令互動
- 從 WhatsApp 查任務 / 查排名 / 查積分
- 從 WhatsApp 快速回到 AI workspace
- 未登入 / 沉默用戶的喚回流程
- admin 對通知策略與模板的管理能力
- 正式部署切換到 public domain / Vercel + 本機 pull worker 模式

Phase 3 實作項目建議：

1. 設計 WhatsApp 指令格式
2. 新增 inbound intent router
3. 支援像是以下指令：
   - `TASKS`
   - `RANK`
   - `POINTS`
   - `HELP`
4. 增加 resend / retry / dead-letter queue 能力
5. 增加 admin 模板管理與事件開關
6. 規劃未來切 Meta Cloud API 的抽象層

Phase 3 驗收條件：

- 使用者可從 WhatsApp 主動查詢自己的 TaskAI 狀態
- inbound 訊息不會和驗證碼流程衝突
- admin 可以看見更完整的通知成效與失敗重試狀態
- public 部署後，本機 dispatcher 能穩定 pull 正式站 queue

Deployment smoke test：

1. 打開正式站 `/my/settings`，確認 WhatsApp 綁定狀態正常
2. 送出一則 `Send test message`
3. 建立一個測試 task，確認 notification job 有被建立
4. 檢查 WhatsApp 文案中的連結 domain 是否為當前正式 domain
5. 點開連結，確認頁面是最新部署版本而不是舊版 UI
6. 若本輪有改 verification flow，再做一次 `send code -> WhatsApp reply -> settings auto refresh to active`

## 3. 架構選型

本版採用以下架構：

`TaskAI (Vercel) -> Supabase -> 本機 Mac worker -> openclaw-whatsapp send -> WhatsApp`

責任分工如下：

- Vercel / Next.js API
  - 接收前端設定請求
  - 在任務事件發生時建立 notification jobs
  - 提供 bridge 取件與回寫結果的內部 API
- Supabase
  - 儲存綁定資料
  - 儲存通知偏好
  - 儲存 notification jobs 與發送紀錄
- 本機 Mac worker
  - 定時向 TaskAI 取下一筆待發送 job
  - 呼叫 `openclaw-whatsapp send [number] [message]`
  - 把成功 / 失敗結果回寫給 TaskAI

### 3.1 Notification Link Origin 規則

TaskAI 的部分 WhatsApp 通知會包含前往 Web UI 的絕對連結，例如：

- task detail
- AI workspace
- task summary
- leaderboard

這些連結不是由 WhatsApp bridge 動態決定，而是在 Next.js API 建立 notification job 時就已生成。

目前 origin 生成規則：

1. 優先使用 `NEXT_PUBLIC_SITE_URL`
2. 若未設定，退回 request 的 host / protocol
3. 最後退回 `http://localhost:3000`

這代表：

- 若本機開發環境的 `.env.local` 仍把 `NEXT_PUBLIC_SITE_URL` 指向舊的 Vercel domain，從本機送出的真實 WhatsApp 通知也會帶舊站連結
- 若 Vercel 已部署新版本，但 Production env 沒同步更新 domain，通知仍可能帶到舊 deployment
- bridge 的 `TASKAI_BASE_URL` 只影響 worker 打哪個 API，不決定通知文案中的前端連結

實務規則：

- 正式發送以 Vercel 為主時，`NEXT_PUBLIC_SITE_URL` 必須等於正式站域名
- 若本機直連正式 Supabase 測試 WhatsApp，工程師需明確知道通知連結可能仍會跳正式站
- 切換 Vercel 專案或自訂 domain 後，必須同步更新 env 並重新部署

## 4. 資料模型

第一版新增三張表：

### 4.1 `taskai_channel_connections`

用途：

- 記錄使用者在某個 channel 的接收資訊
- 第一版實際只使用 `whatsapp`

核心欄位：

- `user_id`
- `channel`
- `phone_number`
- `normalized_phone_number`
- `status`
- `verified_at`
- `last_seen_at`

### 4.2 `taskai_notification_preferences`

用途：

- 儲存每位使用者的通知開關與分類偏好

核心欄位：

- `user_id`
- `channel`
- `enabled`
- `quiet_hours_start`
- `quiet_hours_end`
- `allow_new_task`
- `allow_task_claimed`
- `allow_claim_reminder`
- `allow_stalled_task`
- `allow_completion_message`
- `allow_rank_milestone`

### 4.3 `taskai_notification_jobs`

用途：

- 作為 queue 與 log 的主表
- bridge 直接消費這張表對應的 API

核心欄位：

- `org_id`
- `user_id`
- `task_id`
- `channel`
- `event_type`
- `template_key`
- `dedupe_key`
- `payload`
- `rendered_message`
- `status`
- `scheduled_for`
- `claimed_at`
- `sent_at`
- `failed_at`
- `cancelled_at`
- `retry_count`
- `provider`
- `provider_message_id`
- `error_message`
- `response_payload`

### 4.4 `taskai_whatsapp_verifications`

用途：

- 儲存 WhatsApp 驗證碼請求與驗證結果
- 讓綁定流程從「只填號碼」升級為「發碼 + 回碼驗證」

## 5. UI 規劃

### 5.1 User 設定頁

位置：

- `src/app/(main)/my/settings/page.tsx`

新增一個 `WhatsApp notifications` 區塊，包含：

- 目前綁定狀態
- WhatsApp 區號 + 電話分離輸入
- 使用者可直接理解的英文 UI 文案
- 電話 placeholder 使用 generic example，不顯示真實測試號碼
- 明確區分 `Send verification code` 與 `Send test message` 的操作階段
- 啟用 / 停用通知開關
- 安靜時段設定
- 六種通知類型開關
- 每種通知類型旁的 `?` 小型說明 popup / tooltip
- 儲存按鈕
- `解除綁定電話` 按鈕
- `Send test message` 按鈕
- 最近幾筆通知紀錄（可收合 / 展開）
- refresh 時先顯示 loading，待 `/api/taskai/my/whatsapp` 回傳後才顯示實際 connection / verification status
- 若目前為 `pending verification`，設定頁每秒輪詢一次最新狀態；驗證成功後自動停止輪詢

### 5.2 Admin 發送紀錄頁

位置：

- 新增 `src/app/(admin)/admin/taskai/notifications/page.tsx`

顯示內容：

- 發送時間
- 使用者
- 任務
- 類型
- 狀態
- 手機號碼
- 訊息內容
- 錯誤原因

## 6. API 規劃

### 6.1 使用者設定 API

- `GET /api/taskai/my/whatsapp`
  - 取得自己的綁定狀態、偏好設定與最近通知紀錄
- `POST /api/taskai/my/whatsapp`
  - 儲存號碼與偏好設定
- `POST /api/taskai/my/whatsapp/test`
  - 建立一筆測試通知 job
- `POST /api/internal/whatsapp/verify-binding`
  - 由本機 bridge 於收到驗證訊息時呼叫，完成綁定驗證

### 6.2 Admin log API

- `GET /api/taskai/admin/notifications?orgId=...`
  - 僅 owner 可查看該組織通知紀錄
  - admin notifications 頁僅顯示目前選中的 owner organization 資料
  - 若使用者在另一個 organization 僅為 member，該 org 的通知不會顯示在 admin 頁

### 6.3 本機 bridge 內部 API

建議使用環境變數 `TASKAI_INTERNAL_BRIDGE_TOKEN` 做保護。

- `POST /api/internal/whatsapp/jobs/claim`
  - 取下一筆可發送 job，並原子標記為 `sending`
- `POST /api/internal/whatsapp/jobs/[jobId]/result`
  - 回寫 `sent / failed`

## 7. 事件接點

### 7.1 建任務

位置：

- `src/app/api/taskai/orgs/[orgId]/tasks/route.ts`

行為：

- 任務建立成功後，為可見成員建立 `task_new_available` jobs

### 7.2 claim 任務

位置：

- `src/app/api/taskai/tasks/[taskId]/claim/route.ts`

行為：

- 建立 `task_claimed` 即時 job
- 建立 `task_claimed_no_ai_started` 延遲 job
- 建立 `task_claimed_stalled` 延遲 job
- claim 流程需具備防重保護
  - 若任務已被其他請求先 claim，後續請求不可再寫入第二筆 `task_claimed` activity
  - 不可再寫入第二筆 active `task_claims`
  - 不可再建立第二組 claim 相關 notification jobs

### 7.3 AI workspace 開始

位置：

- 新增 `POST /api/taskai/tasks/[taskId]/workspace-start`

行為：

- 使用者進入 AI workspace 後，取消 `task_claimed_no_ai_started`

### 7.4 完成任務

位置：

- `src/app/api/taskai/tasks/[taskId]/complete/route.ts`

行為：

- 建立 `task_completed_encourage` 即時 job
- 取消尚未送出的 claim reminder / stalled reminder
- 預留排名與積分里程碑邏輯
- one-time task 完成流程需具備 idempotency
  - 若同一任務已完成，再次呼叫 `complete_task` 不可再次加分
  - 不可再次寫入第二筆 `task_completed` activity
  - 不可再次建立第二筆 `task_completed_encourage` job

## 8. 發送策略

### 8.1 新任務可領取

- 立即建立 job
- 若偏好關閉則不入列

### 8.2 claim 後尚未開始 AI 對話

- claim 後 `+30 分鐘` 建立排程 job
- 若在此之前已進入 workspace，則取消

### 8.2A 任務已領取確認

- claim 成功後立即建立 job
- 內容包含 task title 與 AI workspace 連結
- 若偏好關閉則不入列

### 8.3 claim 後長時間未完成

- claim 後 `+48 小時` 建立排程 job
- 完成任務時取消

### 8.4 任務完成鼓勵

- 任務完成後立即發送
- completion notification 的 dedupe key 應與本次 `last_completed_at` 綁定
  - 避免同一次完成事件因 route 重入而再送第二則鼓勵訊息

### 8.5 排名提升 / 積分里程碑

- 本次先把模板與事件型別放好
- 實際排行計算第二輪再接

## 9. 本機 Mac worker 規劃

第一版不直接改動現有 `openclaw-whatsapp` bridge 主服務，而是新增一個獨立 worker：

- 定時呼叫 `POST /api/internal/whatsapp/jobs/claim`
- 若有 job，使用 `openclaw-whatsapp send [number] [message] --addr http://127.0.0.1:8555`
- 再呼叫 `POST /api/internal/whatsapp/jobs/[jobId]/result`

需要的 worker 環境變數：

- `TASKAI_BASE_URL`
- `TASKAI_INTERNAL_BRIDGE_TOKEN`
- `OPENCLAW_WHATSAPP_ADDR`（預設可為 `http://127.0.0.1:8555`）

本輪已新增一個 one-shot dispatcher 腳本：

- `scripts/taskai-whatsapp-dispatch.sh`
- `scripts/taskai-whatsapp-dispatch-run.sh`
- `scripts/ai.openclaw.taskai-whatsapp-dispatch.plist`

用途：

- 向 `POST /api/internal/whatsapp/jobs/claim` 取一筆待發 WhatsApp job
- 呼叫 `openclaw-whatsapp send`
- 將結果回寫到 `POST /api/internal/whatsapp/jobs/[jobId]/result`
- 透過 LaunchAgent 每 10 秒自動輪詢一次 queue
- LaunchAgent 實際執行入口建議安裝到 `~/.local/bin/taskai-whatsapp-dispatch-run.sh` 與 `~/.local/bin/taskai-whatsapp-dispatch.sh`
- LaunchAgent 使用的環境檔建議安裝到 `~/.taskai-whatsapp-dispatch.env`，避免直接從 `Documents/TaskAI/.env.local` 讀取時遭遇 macOS 權限限制
- `openclaw-whatsapp` 不應在 bridge 層以靜態 allowlist 擋住新的驗證號碼
- 若仍需限制一般 assistant 對話對象，改由 `wa-notify.sh` 在腳本層使用 allowlist；TaskAI verification 需先於 allowlist 判斷

## 10. 風險與限制

- 這台 Mac 若關機、睡眠、斷網，WhatsApp 通知即停止
- 第一版使用號碼綁定，不做完整驗證碼回傳驗證
- `claim 後尚未開始 AI 對話` 目前以 workspace 啟動事件作為判斷，不以完整 conversation 落庫為唯一依據

## 11. 本輪實作順序

1. 新增 docs 技術方案
2. 新增 SQL 增量檔
3. 建立通知資料型別與模板模組
4. 實作 user 設定 API
5. 實作 admin log API
6. 實作 bridge 取件 API
7. 接入建任務 / claim / complete / workspace-start
8. 補 user 設定 UI
9. 補 admin log UI

## 12. 驗收條件

以下條件同時成立視為第一版骨架完成：

- 使用者可在設定頁填寫 WhatsApp 號碼並儲存
- admin 可在後台看到通知 job 紀錄
- 建任務後可為目標使用者建立 `task_new_available`
- claim 任務後可建立延遲提醒
- 開始 AI workspace 後可取消未開始提醒
- 完成任務後可建立鼓勵訊息
- 本機 worker 可透過內部 API 取到待發 job 並回寫結果

## 13. 本輪實測狀態

截至 2026-03-28，本輪已完成以下實測：

- `corepack yarn build` 通過
- 本機 `openclaw-whatsapp status` 顯示 bridge 為 `connected`
- 已成功建立測試 notification job
- 已成功由本機 dispatcher claim job、送出訊息並回寫 `sent`
- 已成功由 LaunchAgent 自動 claim 第二筆測試 job、送出訊息並回寫 `sent`
- 已成功完成 WhatsApp 驗證碼綁定的發碼與回碼驗證流程
- 已修正 one-time task 重複完成時可能造成的重複加分與重複完成通知問題
- 已補上 claim 流程的 active claim 唯一索引與 route 防重保護

更多本機派送操作細節，請見：

- `docs/taskai-whatsapp-local-worker-operations.md`
- `docs/taskai-whatsapp-verification-binding-v1.md`
