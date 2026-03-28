# TaskAI WhatsApp 驗證碼綁定 V1

最後更新：2026-03-28

本文件定義 TaskAI 第一版 WhatsApp 驗證碼綁定流程。目標是讓使用者在設定頁輸入號碼後，系統會發送驗證碼到該 WhatsApp，並要求使用者從同一個 WhatsApp 回傳指定格式訊息，以完成真正的號碼所有權驗證。

## 1. 流程目標

- 避免使用者輸入別人的 WhatsApp 號碼後直接綁定成功
- 讓 TaskAI 的 WhatsApp 通知有明確的所有權驗證
- 保持現有本機 bridge 架構，不另開對外 webhook 給公網直接打本機

## 2. 第一版流程

1. 使用者在設定頁輸入區號與電話
2. 使用者按下儲存
3. 後端產生 6 位驗證碼
4. TaskAI 建立 `binding_verification_code` notification job
5. 本機 dispatcher 將驗證碼送到該 WhatsApp
6. 使用者從該 WhatsApp 回覆指定格式，例如：
   - `TASKAI 123456`
   - `VERIFY 123456`
   - `123456`
7. 本機 bridge 收到訊息後，先呼叫 TaskAI 內部驗證 API
8. 若驗證成功：
   - `taskai_whatsapp_verifications` 標記為 `verified`
   - `taskai_channel_connections` 標記為 `active`
   - bridge 直接回覆成功訊息給使用者
9. 若驗證失敗：
   - bridge 回覆失敗原因
   - 一般對話流程不會接手這則驗證訊息

補充的正式行為：

- 每次驗證碼有效期為 10 分鐘
- 使用者重新送出新的驗證碼時，舊的 `pending` verification 會先被取消，再建立新的 verification request
- 使用者若解除綁定電話，尚未完成的 verification 與對應 verification job 也會被取消
- 若使用者在驗證碼過期後才從 WhatsApp 回覆，系統會將該 verification 標記為 `expired`，並回覆要求使用者重新在設定頁發送新 code

## 3. 資料表

新增：

- `taskai_whatsapp_verifications`

用途：

- 儲存驗證碼請求
- 記錄驗證是否成功
- 記錄從哪個 JID、哪則訊息完成驗證

## 4. API

### 4.1 User API

- `GET /api/taskai/my/whatsapp`
  - 除了既有 connection / preferences / recentJobs 外，再回傳最新 verification 狀態
- `POST /api/taskai/my/whatsapp`
  - 儲存偏好
  - 若號碼為新號碼或尚未驗證，則建立新的驗證碼並發送 WhatsApp 驗證訊息

### 4.2 Internal Bridge API

- `POST /api/internal/whatsapp/verify-binding`
  - 僅 bridge 可呼叫
  - 依據來訊內容與來源號碼驗證是否完成綁定
  - 回傳：
    - `handled`
    - `verified`
    - `replyMessage`

## 5. UI 規劃

設定頁新增以下顯示：

- 綁定狀態：`Connected / Pending verification / Not connected`
- 與 WhatsApp 相關的使用者可見文案統一使用英文
- 明確的 verification steps 說明
  - 先按 `Send verification code`
  - 收到 WhatsApp 驗證碼後回覆同一個 chat
  - 驗證成功後才可使用 `Send test message`
- 若為 `pending`
  - 顯示已送出驗證碼
  - 顯示有效期限
  - 顯示回覆格式說明
  - 每秒輪詢一次最新 verification / connection 狀態，直到驗證完成或 pending 結束
- 若為 `active`
  - 顯示已驗證完成
- 提供 `解除綁定電話` 按鈕
  - 解除目前綁定
  - 取消尚未完成的驗證狀態
- 測試訊息按鈕僅在 `active` 時可使用
- 最近通知紀錄區塊預設可收合，避免長列表拉長整個設定頁
- 最近通知紀錄需顯示 `created at` 與 `scheduled for`，讓使用者知道是立即通知還是排程通知
- 設定頁 refresh 時，WhatsApp 區塊需先等待 `/api/taskai/my/whatsapp` 載入完成
  - 在拿到最新 connection / verification 狀態前，只顯示 loading state
  - 不先用本地預設值渲染 `pending / not_connected / active`
  - 避免頁面刷新時先閃出錯誤 status，再跳成正確 status

## 6. 本機 bridge 規劃

現有 WhatsApp inbound script 先判斷是否為 TaskAI 驗證碼訊息：

- 若是驗證碼訊息：
  - 先打 `POST /api/internal/whatsapp/verify-binding`
  - 若 `handled = true`，依 `replyMessage` 回覆後結束
  - 使用者在 WhatsApp 應收到明確回覆，說明驗證成功、驗證碼錯誤、驗證碼過期，或目前沒有有效驗證請求
- 若不是驗證碼訊息：
  - 繼續原本的 assistant queue 流程
- `openclaw-whatsapp` 不應在 bridge 層用靜態 allowlist 擋住新的驗證號碼
  - 否則新綁定電話雖然能收到 code，但回覆不會進到 `wa-notify.sh`
  - 若需要限制一般 assistant 對話名單，應改在 `wa-notify.sh` 以腳本層 allowlist 處理

本輪實作會以以下檔案承接：

- `scripts/wa-notify.sh`
- `POST /api/internal/whatsapp/verify-binding`

## 7. 驗收條件

- 設定頁送出號碼後會建立 pending verification
- 該號碼會收到 WhatsApp 驗證碼訊息
- 從該號碼回覆指定格式後能自動完成綁定
- 綁定成功後 `taskai_channel_connections.status = active`
- 綁定成功後設定頁會顯示已驗證
- 使用者回覆驗證碼後，WhatsApp 會收到對應的 success / failure 確認訊息
- 驗證碼過期後，舊請求不再可用，使用者需重新發送 verification code

## 8. 本輪實測結果

截至 2026-03-28，本輪已完成以下實測：

- 已新增 `taskai_whatsapp_verifications` 資料表並套用 migration
- 已成功建立 `binding_verification_code` notification job
- 已成功由本機 dispatcher 將驗證碼送到 WhatsApp
- 已成功由本機 `wa-notify.sh` 攔截 `TASKAI 654321` 類型訊息
- 已成功呼叫 `POST /api/internal/whatsapp/verify-binding`
- 已成功將：
  - `taskai_whatsapp_verifications.status` 更新為 `verified`
  - `taskai_channel_connections.status` 更新為 `active`
