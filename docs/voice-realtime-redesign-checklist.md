## 实时语音对话改造 Checklist

> 目标：实现「进入即监听、实时转写、自动 AI 回复 + 语音播放、循环往复」的语音对话体验，减少调用链路、提升响应速度。

---

### 一、架构与设计层面

- [ ] **确认整体方案**：采用「Streaming ASR + 文本对话（Dify Chat） + Azure TTS」三层架构  
- [ ] **评审现有流程**：核对当前 `useVoiceConversation`、`useRecording`、`/api/conversations/message`、TTS 实现与文档第 17 章的一致性  
- [ ] **确定 ASR 服务**：决定使用哪套 Streaming ASR（自建 / 现有 Munlingo 服务 / 云厂商）及其 WebSocket 协议

---

### 二、Streaming ASR 服务对接

- [ ] 定义 WebSocket 接口规范（URL、query 参数、鉴权方式等）  
- [ ] 约定消息格式：
  - [ ] 客户端发送：二进制音频 chunk（采样率、声道数、编码格式）  
  - [ ] 服务端返回：`{ type: 'partial' | 'final' | 'error', text?: string, message?: string }`  
- [ ] 在后端或独立服务中实现 ASR 网关（可复用 Munlingo 现有实现）  
- [ ] 支持按语言（如 `zh` / `en`）选择 ASR 模型  
- [ ] 完成基本压测与稳定性验证（长连接、断线重连、错误场景）

---

### 三、前端录音与 Streaming ASR Hook

- [ ] 新增 `useStreamingASR`（或等价 Hook），职责：
  - [ ] 管理 WebSocket 连接（open / message / close / error）  
  - [ ] 暴露 `start(language)` / `stop()` 接口  
  - [ ] 封装 `onPartial(text)` / `onFinal(text)` 回调  
- [ ] 将录音模块与 ASR 联动：
  - [ ] 基于 `useRecording` 或类 `useWavRecorder` 的实现，把录音 chunk 推送到 WebSocket  
  - [ ] 处理浏览器麦克风授权失败和设备不兼容情况  
- [ ] 增加实时字幕状态：
  - [ ] `transcriptLive`：保存当前轮的 partial 文本  
  - [ ] 收到 final 文本时清空 `transcriptLive` 并产出一条完整 user 消息

---

### 四、`useVoiceConversation` 编排重构

- [ ] 在 `useVoiceConversation` 中引入统一状态机：
  - [ ] `isListening`：当前是否在监听用户说话  
  - [ ] `isProcessing`：是否在等待 AI 文本回复  
  - [ ] `isSpeaking`：是否在播放 AI 语音  
  - [ ] `transcriptLive`：实时转写字幕  
  - [ ] `conversations: Conversation[]`：完整对话记录  
  - [ ] `difyConversationId`：Dify Chat 上下文 ID  
- [ ] 添加生命周期方法：
  - [ ] `startSession()`：处理麦克风授权，启动录音 + Streaming ASR  
  - [ ] `stopSession()`：停止录音、关闭 ASR、停止 TTS（用于结束会议）  
- [ ] 将「录音→Dify workflow 转写」逻辑替换为：
  - [ ] 用户说话 → Streaming ASR 推流 → `onPartial` 更新 `transcriptLive`  
  - [ ] `onFinal` 获取最终文本后：
    - [ ] `isListening = false`  
    - [ ] 调用 `/api/conversations/message`（传入 final 文本 + `conversation_id`）  
    - [ ] 更新 `difyConversationId`（首轮对话由 Dify 返回）  
    - [ ] 把新一轮 `Conversation` push 进 `conversations`  
    - [ ] 调用 Azure TTS 播放 AI 文本 → `isSpeaking = true`  
    - [ ] 播放结束 → `isSpeaking = false`，如未结束会议则重新 `isListening = true`  
- [ ] 确保错误处理与状态回滚（ASR / LLM / TTS 任一失败，都能回到安全的 `idle` 或 `listening` 状态）

---

### 五、对话 UI 组件更新（`VoiceConversationView.tsx`）

- [ ] 顶部区：
  - [ ] 保留会议标题与状态显示；  
  - [ ] 根据会议状态（进行中/已结束）调整颜色与操作（已结束时禁用所有交互）。  
- [ ] 中部区：
  - [ ] 根据 `isListening` / `isProcessing` / `isSpeaking` 显示不同提示文案和 Avatar 动画；  
  - [ ] 在状态指示下方，增加实时字幕显示区域：  
    - [ ] `isListening && transcriptLive` 时显示「您：{transcriptLive}」。  
  - [ ] 保持只显示最近一条完整对话记录（用户发言 + AI 回复）。  
- [ ] 底部区：
  - [ ] 中间麦克风按钮改为「可选控制」（暂停/恢复监听），默认无需用户点击；  
  - [ ] 右侧挂断按钮保持为「结束会议」入口；  
  - [ ] 左侧按钮在会议已结束时跳转到总结页。

---

### 六、入口页面与会议页联动（`/page.tsx` & `/meet/[code]/page.tsx`）

- [ ] 首页 `/`：逻辑保持不变（输入会议号，判断状态，跳转对话页或总结页）  
- [ ] 会议页 `/meet/[code]`：
  - [ ] 在用户识别与会议信息加载完成后，提示用户点击一次「开始对话」按钮以授权麦克风；  
  - [ ] 点击后调用 `startSession()`，进入连续对话模式；  
  - [ ] 结束会议流程保持现有实现（保存对话、更新状态、生成总结与待办、跳转 summary）。

---

### 七、后端 API 与服务调整

- [ ] 为 Streaming ASR 提供 WebSocket 端点并部署（可依赖已有服务）  
- [ ] 更新 `/api/conversations/message` 文档：
  - [ ] 明确只接受文本 `transcriptionText`，不使用音频 fileId；  
  - [ ] 继续负责与 Dify Chat 对话、维护 `conversation_id` 与会话上下文。  
- [ ] 保留现有基于 Dify workflow 的「整段音频上传 + 转写」方案作为可选 fallback（在 Streaming ASR 不可用时使用）  
- [ ] 记录对话与生成总结 / todos 的流程保持不变，确保与 Supabase 表结构兼容。

---

### 八、测试与验收

- [ ] 单轮对话延迟评估（从用户停顿到听到 AI 回答的总时长）  
- [ ] 连续多轮对话稳定性测试（10+ 轮对话无中断、无资源泄漏）  
- [ ] 浏览器兼容性：Chrome / Edge / Safari（含移动端）  
- [ ] 录音权限拒绝与异常场景处理（给出清晰提示，允许重试或退出）  
- [ ] 会议结束后，对话记录、总结与待办在 summary 页展示完整且顺序正确。

