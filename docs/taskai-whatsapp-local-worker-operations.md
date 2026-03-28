# TaskAI WhatsApp 本機 Worker 操作說明

最後更新：2026-03-28

本文件記錄 TaskAI 第一版 WhatsApp 通知在 Bobby 這台 Mac 上的本機派送方式、相關檔案位置，以及基本驗證與排錯方式。

補充：

- 使用者設定頁目前已將 WhatsApp 電話拆成「區號 + 本地電話」兩段式輸入，前端會在送出時自動組合為完整號碼
- 五種通知類型各自提供貼近 `?` 按鈕的小型說明 popup，僅在使用者點擊 `?` 時才會顯示
- 使用者設定頁目前也支援 `解除綁定電話`，會清除目前綁定並取消待驗證中的綁定請求

## 1. 本機派送架構

TaskAI 第一版採用以下派送路徑：

`TaskAI queue -> 內部 bridge API -> 本機 dispatcher -> openclaw-whatsapp -> WhatsApp`

其中：

- `scripts/taskai-whatsapp-dispatch.sh`
  - one-shot dispatcher
  - 每次執行時只會 claim 一筆 job，送出後回寫結果
  - 送出前會把字面上的 `\n` 自動轉成真正換行，避免 WhatsApp 看到 `\n` 原樣字串
- `scripts/wa-notify.sh`
  - inbound WhatsApp 入口腳本
  - 會先判斷是否為 TaskAI 驗證碼訊息，再決定是否交給既有 assistant queue
  - TaskAI 驗證不應被 `openclaw-whatsapp` 的靜態 allowlist 擋掉；應讓所有 DM 先進入 `wa-notify.sh`
  - 若仍需要限制一般 assistant 對話對象，改由 `OC_WA_ASSISTANT_ALLOWLIST` 在腳本層過濾
  - 驗證完成後，會直接透過 bridge 回覆成功 / 失敗訊息給原 WhatsApp chat
- `scripts/taskai-whatsapp-dispatch-run.sh`
  - 本機 wrapper
  - 會先載入本機環境檔，再執行 one-shot dispatcher
- `scripts/ai.openclaw.taskai-whatsapp-dispatch.plist`
  - LaunchAgent 範本
  - 用來讓這台 Mac 每 10 秒自動輪詢一次待發 job

實際執行時，建議將 wrapper 安裝到：

- `/Users/bobbylian/.local/bin/taskai-whatsapp-dispatch-run.sh`
- `/Users/bobbylian/.local/bin/taskai-whatsapp-dispatch.sh`

## 2. 必要環境變數

需要在專案根目錄的 `.env.local` 內提供：

- `TASKAI_BASE_URL`
- `TASKAI_INTERNAL_BRIDGE_TOKEN`
- `OPENCLAW_WHATSAPP_ADDR`

由於 LaunchAgent 直接存取 `Documents/TaskAI/.env.local` 可能被 macOS 權限機制阻擋，建議實際派送時將必要值同步到：

- `/Users/bobbylian/.taskai-whatsapp-dispatch.env`

目前預設建議：

- `TASKAI_BASE_URL=http://localhost:3000`
- `OPENCLAW_WHATSAPP_ADDR=http://127.0.0.1:8555`
- `OC_WA_ASSISTANT_ALLOWLIST` 可用逗號或換行分隔，僅限制一般 assistant 對話；TaskAI verification 不受此限制

若要讓 Vercel Production 建立的 TaskAI notification jobs 由這台 Mac 實際送出，則本機環境檔必須改成：

- `TASKAI_BASE_URL=https://你的正式域名`
- `TASKAI_INTERNAL_BRIDGE_TOKEN=與 Vercel Production 完全一致`
- `OPENCLAW_WHATSAPP_ADDR=http://127.0.0.1:8555`

正式站模式的重要規則：

- Vercel 不會直接呼叫本機 bridge
- 實際上是這台 Mac 主動輪詢正式站的 `api/internal/whatsapp/jobs/claim`
- 若 `TASKAI_BASE_URL` 仍是 `http://localhost:3000`，則只會處理本地 queue，不會處理正式站 queue

注意：

- 若環境檔中把 `OPENCLAW_WHATSAPP_ADDR` 設成空字串，可能造成驗證完成後的回覆訊息無法正常送出
- `wa-notify.sh` 應在載入環境檔後，再套用 `OPENCLAW_WHATSAPP_ADDR` 的 fallback 預設值

## 3. 安裝位置

建議實際載入的 LaunchAgent 檔案位置：

- `/Users/bobbylian/Library/LaunchAgents/ai.openclaw.taskai-whatsapp-dispatch.plist`

版本控管內的來源檔：

- `/Users/bobbylian/Documents/TaskAI/scripts/ai.openclaw.taskai-whatsapp-dispatch.plist`
- `/Users/bobbylian/Documents/TaskAI/scripts/taskai-whatsapp-dispatch-run.sh`
- `/Users/bobbylian/Documents/TaskAI/scripts/taskai-whatsapp-dispatch.sh`
- `/Users/bobbylian/Documents/TaskAI/scripts/wa-notify.sh`

實際執行入口建議安裝到：

- `/Users/bobbylian/.local/bin/taskai-whatsapp-dispatch-run.sh`
- `/Users/bobbylian/.local/bin/taskai-whatsapp-dispatch.sh`
- `/Users/bobbylian/.local/bin/wa-notify.sh`
- `/Users/bobbylian/.taskai-whatsapp-dispatch.env`

## 4. 手動驗證方式

### 4.1 驗證 WhatsApp bridge 是否在線

```bash
openclaw-whatsapp status --addr http://127.0.0.1:8555
```

若橋接正常，應看到 `connected`。

### 4.2 手動派送一筆 job

```bash
cd /Users/bobbylian/Documents/TaskAI
set -a && source .env.local && set +a
./scripts/taskai-whatsapp-dispatch.sh
```

### 4.3 檢查 LaunchAgent

```bash
launchctl list | rg ai.openclaw.taskai-whatsapp-dispatch
```

### 4.4 正式站切換後的 smoke test

```bash
cat /Users/bobbylian/.taskai-whatsapp-dispatch.env
openclaw-whatsapp status --addr http://127.0.0.1:8555
launchctl list | rg ai.openclaw.taskai-whatsapp-dispatch
```

確認以下條件都成立：

- `TASKAI_BASE_URL` 已是正式站 domain
- `TASKAI_INTERNAL_BRIDGE_TOKEN` 已與 Vercel Production 對齊
- `openclaw-whatsapp` 為 `connected`
- LaunchAgent 正在執行
- 從正式站觸發 `Send test message` 後，job 最終會回寫為 `sent`

## 5. Log 位置

- `/tmp/taskai-whatsapp-dispatch.log`
- `/tmp/taskai-whatsapp-dispatch.err`

## 6. 本輪驗證結果

本輪已完成以下驗證：

- Next.js production build 通過
- 本機 `openclaw-whatsapp` bridge 狀態為 `connected`
- 已成功寫入一筆測試 `taskai_notification_jobs`
- 已成功由本機 dispatcher claim 該 job
- 已成功由 bridge 發送並回寫 `sent`
- 已修正 LaunchAgent 直接執行 `Documents/TaskAI` 腳本時的權限問題，改為由 `~/.local/bin` 與 `~/.taskai-whatsapp-dispatch.env` 執行
- 已成功由 LaunchAgent 自動 claim 第二筆測試 job，並由 bridge 發送後回寫 `sent`
- 已成功由新版 `wa-notify.sh` 攔截 TaskAI 驗證碼訊息，並完成 WhatsApp 綁定驗證
- 已確認若 `openclaw-whatsapp` 使用靜態 allowlist，未列入名單的新綁定號碼會無法完成 TaskAI verification
- 已調整為：所有 DM 先進 `wa-notify.sh`，TaskAI verification 先處理；一般 assistant 對話才由腳本層 allowlist 控制

## 7. 目前限制

- 本機 dispatcher 目前每次只處理一筆 job；若高峰期需要更快吞吐量，可之後改成單次循環多筆
- 若這台 Mac 關機、睡眠或斷網，通知會停在 queue 中，直到 dispatcher 恢復
- 第一版以本機 bridge 為基礎，尚未切到正式雲端訊息基礎設施
- 輪詢間隔現已調整為 10 秒，驗證碼與提醒的正常等待時間應明顯短於原本的 60 秒
- 若設定頁處於 `pending verification`，前端目前會每秒輪詢一次最新狀態；驗證成功後自動停止輪詢
