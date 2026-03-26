# AI会议对话系统 - 实现说明

## 已完成功能

### 1. Mock数据
- ✅ 用户数据 (`src/datas/mock/users.json`)
- ✅ 会议数据 (`src/datas/mock/meets.json`)
- ✅ 对话记录 (`src/datas/mock/conversations.json`)
- ✅ 任务数据 (`src/datas/mock/todos.json`)
- ✅ 会议总结 (`src/datas/mock/meet-summaries.json`)

### 2. API路由（使用Mock数据）
- ✅ `/api/meets` - 会议管理（GET, POST）
- ✅ `/api/meets/[id]` - 获取会议详情
- ✅ `/api/meets/code/[code]` - 通过会议号查找
- ✅ `/api/meets/[id]/status` - 更新会议状态
- ✅ `/api/conversations` - 获取对话记录
- ✅ `/api/conversations/message` - 发送语音消息
- ✅ `/api/recordings/transcribe` - 录音转文字
- ✅ `/api/tts/generate` - 文字转语音
- ✅ `/api/users/identify` - 用户识别
- ✅ `/api/users/[id]` - 获取用户信息
- ✅ `/api/todos` - 任务管理（GET, POST）
- ✅ `/api/todos/[id]` - 更新任务
- ✅ `/api/todos/[id]/confirm` - 确认任务
- ✅ `/api/todos/generate` - 生成任务
- ✅ `/api/llm/summarize` - 生成会议总结

### 3. 业务逻辑Hooks
- ✅ `useMeets` - 会议管理
- ✅ `useConversations` - 对话管理
- ✅ `useRecording` - 录音功能
- ✅ `useTTS` - 文字转语音
- ✅ `useUser` - 用户管理
- ✅ `useTodos` - 任务管理
- ✅ `useVoiceConversation` - 语音对话流程

### 4. UI组件（解耦设计）
- ✅ `RecordButton` - 录音按钮
- ✅ `StatusIndicator` - 状态指示器
- ✅ `AIAvatar` - AI头像动画
- ✅ `ConversationList` - 对话列表
- ✅ `MeetInfo` - 会议信息
- ✅ `VoiceConversationView` - 语音对话视图

### 5. 页面
- ✅ `/admin/meets` - 管理员会议管理页面
- ✅ `/meet/[code]` - 用户语音对话页面
- ✅ `/meet/[code]/summary` - 会议总结和任务页面

## 使用流程

### 1. 管理员创建会议
1. 访问 `/admin/meets`
2. 点击"创建会议"按钮
3. 填写会议信息（标题、描述、时间、时长）
4. 系统自动生成会议号和链接
5. 可以复制链接分享给用户

### 2. 用户加入会议
1. 通过会议链接进入（如：`/meet/ABC123?platform=telegram&userId=123456`）
2. 系统自动识别平台和用户ID
3. 如果用户不存在，自动创建新用户
4. 进入语音对话页面

### 3. 语音对话
1. 点击录音按钮开始录音
2. 再次点击停止录音
3. 系统自动转文字
4. LLM处理并生成回复
5. AI回复转换为语音并播放
6. 对话记录自动保存

### 4. 会议结束和任务生成
1. 点击"结束会议"按钮
2. 系统自动生成会议总结和任务列表
3. 用户可以查看、编辑、确认任务
4. 任务可通过openclaw推送到通讯软件

## 技术特点

### 1. 组件解耦
- 所有UI组件都是独立的，可以在不同页面复用
- 组件只负责展示，不包含业务逻辑
- 使用Props传递数据，保持组件纯净

### 2. Hooks管理业务逻辑
- 所有API调用和状态管理都在Hooks中
- 页面组件只负责组合Hooks和UI组件
- 业务逻辑和UI完全分离

### 3. Mock数据
- 所有API都使用Mock数据，可以正常执行完整流程
- 后续只需替换API实现，无需修改前端代码
- Mock数据包含完整的测试场景

## 后续对接真实API

当需要对接真实API时，只需：

1. **替换Mock数据加载**
   - 在 `src/lib/mock-data.ts` 中替换为真实数据库查询
   - 或直接在API路由中调用Supabase客户端

2. **对接OpenAI API**
   - 在 `/api/conversations/message` 中调用OpenAI GPT API
   - 在 `/api/recordings/transcribe` 中调用Whisper API
   - 在 `/api/tts/generate` 中调用TTS API

3. **对接Supabase**
   - 安装 `@supabase/supabase-js`
   - 在API路由中替换Mock数据查询为Supabase查询
   - 配置Row Level Security (RLS)

4. **文件存储**
   - 配置Supabase Storage
   - 在录音上传和TTS生成时保存到Storage
   - 返回真实的文件URL

## 运行项目

```bash
# 安装依赖
npm install
# 或
yarn install
# 或
pnpm install

# 启动开发服务器
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 `http://localhost:3000` 开始使用。

## 测试流程

1. **创建会议**
   - 访问 `/admin/meets`
   - 创建新会议
   - 复制会议链接

2. **加入会议**
   - 在新标签页打开会议链接
   - 系统自动识别用户

3. **语音对话**
   - 点击录音按钮（需要授权麦克风权限）
   - 说话后停止录音
   - 等待AI回复并播放

4. **结束会议**
   - 点击结束按钮
   - 查看生成的总结和任务

## 注意事项

1. **浏览器权限**
   - 需要授权麦克风权限才能录音
   - 建议使用Chrome或Edge浏览器

2. **Mock数据**
   - 当前所有数据都是Mock的
   - 刷新页面后数据会重置
   - 不会真正保存到数据库

3. **音频播放**
   - Mock模式下，AI语音URL是模拟的
   - 实际对接TTS API后会生成真实音频

4. **平台识别**
   - 通过URL参数 `?platform=telegram&userId=123456` 识别
   - 如果不提供参数，默认使用web平台

## 文件结构

```
src/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       └── meets/
│   │           └── page.tsx          # 管理员会议管理页面
│   ├── api/                           # API路由
│   │   ├── meets/
│   │   ├── conversations/
│   │   ├── recordings/
│   │   ├── tts/
│   │   ├── users/
│   │   ├── todos/
│   │   └── llm/
│   └── meet/
│       └── [code]/
│           ├── page.tsx              # 语音对话页面
│           └── summary/
│               └── page.tsx          # 会议总结页面
├── components/
│   └── meeting/                       # 会议相关组件
│       ├── RecordButton.tsx
│       ├── StatusIndicator.tsx
│       ├── AIAvatar.tsx
│       ├── ConversationList.tsx
│       ├── MeetInfo.tsx
│       └── VoiceConversationView.tsx
├── hooks/                             # 业务逻辑Hooks
│   ├── useMeets.ts
│   ├── useConversations.ts
│   ├── useRecording.ts
│   ├── useTTS.ts
│   ├── useUser.ts
│   ├── useTodos.ts
│   └── useVoiceConversation.ts
├── types/
│   └── meeting.ts                     # TypeScript类型定义
├── datas/
│   └── mock/                          # Mock数据
│       ├── users.json
│       ├── meets.json
│       ├── conversations.json
│       ├── todos.json
│       └── meet-summaries.json
└── lib/
    └── mock-data.ts                   # Mock数据加载器
```

## 下一步

1. 对接Supabase数据库
2. 对接OpenAI API（GPT + Whisper + TTS）
3. 实现文件上传到Supabase Storage
4. 添加错误处理和加载状态优化
5. 添加单元测试和E2E测试
