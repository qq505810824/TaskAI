# TaskAI Live Data Rendering 規範

最後更新：2026-03-28

## 1. 目標

避免 TaskAI 相關頁面在 refresh 時先顯示 mock data、預設空值、錯誤的空狀態，之後再跳成真正資料。

本輪調整的原則是：

- 寧可先顯示 loading
- 也不要先顯示假資料或預設資料
- 當 auth、membership、org selection、analytics 尚未 ready 時，不渲染正式內容

## 2. 本輪調整範圍

已調整以下頁面在初次 refresh / hydration 時先等待資料 ready：

- `src/app/(main)/taskai/tasks/page.tsx`
- `src/app/(main)/taskai/overview/page.tsx`
- `src/app/(main)/taskai/leaderboard/page.tsx`
- `src/app/(admin)/admin/taskai/tasks/page.tsx`
- `src/app/(admin)/admin/taskai/members/page.tsx`
- `src/app/(admin)/admin/taskai/leaderboard/page.tsx`
- `src/app/(admin)/admin/taskai/insights/page.tsx`
- `src/app/(main)/my/overview/page.tsx`

另外新增共用 loading 元件：

- `src/components/taskai/TaskaiPageLoader.tsx`

另外新增兩個共用機制，降低 refresh / hydration 時的重複載入與舊資料覆蓋問題：

- `src/hooks/taskai/useTaskaiSelectedOrg.ts`
  - 統一 admin / member 端的 org selection 邏輯
  - 由 Header 與各 TaskAI page 共用
  - 負責 localStorage、跨頁 event 與 fallback org 決定

- `src/hooks/taskai/fetchTaskaiJson.ts`
  - 統一 TaskAI hook 的 JSON request 去重
  - 避免同 key 首輪重複請求
  - 降低舊回應覆蓋新回應的機率

## 3. 顯示規則

在以下任一條件尚未完成前，頁面應先顯示 loading，不直接顯示正式內容：

- `authLoading = true`
- `memberships loading = true`
- 使用者已有可用 organization，但 `orgId` 尚未從 localStorage / memberships 決定完成
- analytics / task list / leaderboard 正在等待第一輪資料
- 若同一頁面會同時依賴 Header 與 page 自己的 org selection，不應各自重寫初始化邏輯，應共用 `useTaskaiSelectedOrg`
- 若 hook 依賴 `orgId` 或 auth token，應避免讓過期 response 回寫畫面

## 4. 已移除的 mock / marketing data

本輪將 admin insights 中容易造成「先看到假資料」感覺的區塊改為 live data：

- `src/components/taskai/insights/OrganizationGoalsCard.tsx`
  - 原本使用硬編碼 `MOCK_GOALS`
  - 現在改為根據 `departmentContributions` 生成 live category progress

- `src/components/taskai/insights/QuarterlyRoiSummaryCard.tsx`
  - 原本使用硬編碼 ROI / savings / engagement 數值
  - 現在改為顯示 live organization metrics

- `src/components/taskai/insights/AiImpactBanner.tsx`
  - 文案改為明確表示是 live snapshot
  - 避免使用帶有假設性成效的 marketing 描述

## 5. 後續開發規則

之後新增 TaskAI 頁面或卡片時，請遵守：

- 不要用 mock 數字當作初始 render 內容
- 不要在資料尚未 ready 時先顯示 `0`、`No data yet`、`No manageable organization yet`
  - 除非已經確認 fetch 完成且結果確實為空
- 若頁面依賴 membership 與 org selection，需先等它們 ready
- 優先共用 `useTaskaiSelectedOrg`，不要在每個 page 內重寫 `localStorage + event listener + fallback first org`
- 若頁面需要展示 analytics，應先顯示 loading，再顯示真實資料
- 若 page / hook 首輪可能遇到 React dev double invoke，應加上 request 去重或 stale response 保護

## 6. 驗證結果

截至 2026-03-28：

- 已完成上述頁面 loading gate 調整
- 已移除 admin insights 內主要 mock data 來源
- 已將 TaskAI org selection 收斂為共用 hook
- 已為主要 TaskAI 資料 hook 補上 request 去重與 stale response 保護
- `corepack yarn build` 通過
