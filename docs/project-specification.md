# AI 会议对话系统 - 项目详细规格文档

## 一、项目概述

### 1.1 项目目标
构建一个基于网页的AI语音对话会议系统，通过AI助手进行全程语音对话，记录会议内容，自动生成任务列表（Todo List）。系统支持通过openclaw推送会议链接到即时通讯软件（WhatsApp、Telegram等），并根据不同平台的用户ID自动创建和管理用户账户。

### 1.2 核心功能
- **会议管理**：管理员创建会议（Meet），包含会议链接、会议号、标题、时间、状态等信息
- **AI语音对话**：用户在网页内与AI进行全程语音对话，仅支持语音输入
- **语音转文字**：实时录音并通过API转换为文字
- **文字转语音**：LLM回复的文字自动转换为语音播放，实现全程语音交互
- **智能处理**：使用LLM处理对话内容，生成智能回复和会议总结
- **任务生成**：会议结束后自动生成Todo List
- **用户管理**：根据openclaw推送来源自动识别平台（Telegram、WhatsApp等），记录平台特有ID，自动创建或关联用户
- **数据记录**：完整记录每次对话的时间、内容、语音文件等信息

### 1.3 技术栈
- **前端**：Next.js 14+ (App Router), React, TypeScript, TailwindCSS
- **后端**：Next.js API Routes
- **数据库**：Supabase (PostgreSQL)
- **AI服务**：OpenAI API (GPT-4o/GPT-4o-mini)
- **语音转文字**：OpenAI Whisper API / AssemblyAI
- **文字转语音**：OpenAI TTS API / Google Cloud TTS / Azure TTS
- **状态管理**：React Context / Zustand
- **UI组件**：shadcn/ui (可选)

---

## 二、系统架构

### 2.1 整体架构图
```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│  - 管理员页面 (创建/管理会议)                                  │
│  - 用户对话页面 (AI对话界面)                                  │
│  - 会议列表页面                                               │
│  - Todo列表页面                                               │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    API层 (Next.js API Routes)                │
├─────────────────────────────────────────────────────────────┤
│  /api/meets          - 会议管理                              │
│  /api/conversations  - 对话管理                              │
│  /api/recordings     - 录音处理                              │
│  /api/transcriptions - 转文字                                │
│  /api/todos          - 任务管理                              │
│  /api/llm            - LLM处理                               │
│  /api/tts            - 文字转语音                             │
│  /api/users          - 用户管理（平台ID识别）                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    数据层 (Supabase)                          │
├─────────────────────────────────────────────────────────────┤
│  - meets (会议表)                                             │
│  - conversations (对话记录表)                                 │
│  - recordings (录音文件表)                                    │
│  - transcriptions (转文字表)                                  │
│  - todos (任务表)                                            │
│  - users (用户表，包含平台ID)                                 │
│  - audio_responses (AI语音回复表)                             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    外部服务                                    │
├─────────────────────────────────────────────────────────────┤
│  - OpenAI API (LLM + Whisper + TTS)                          │
│  - Supabase Storage (文件存储)                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流
1. **会议创建流程**：管理员创建 → 生成会议号/链接 → 存储到数据库 → openclaw推送链接到通讯软件
2. **用户识别流程**：用户通过链接进入 → 系统识别平台ID（Telegram ID/WhatsApp ID等） → 自动创建或关联用户账户
3. **语音对话流程**：用户录音 → 转文字 → LLM处理 → 生成文字回复 → 转语音 → 播放AI回复 → 存储对话记录
4. **任务生成流程**：会议结束 → 汇总对话 → LLM分析 → 生成Todo → 存储任务

---

## 三、详细功能流程

### 3.1 会议创建流程
```
管理员操作：
1. 登录系统
2. 进入"创建会议"页面
3. 填写会议信息：
   - 标题
   - 开始时间
   - 预计时长
   - 会议描述（可选）
4. 系统自动生成：
   - 会议ID (唯一标识)
   - 会议号 (6-8位数字/字母组合，便于分享)
   - 会议链接 (https://domain.com/meet/{meetingId})
5. 保存到数据库，状态为"待开始"
6. 管理员可分享会议号或链接给参与者
```

### 3.2 用户加入会议流程
```
用户操作：
1. 通过openclaw推送的会议链接进入（链接包含平台信息，如：?platform=telegram&userId=123456）
2. 系统识别平台和用户ID：
   a. 从URL参数获取平台类型（telegram/whatsapp等）和用户ID
   b. 调用 /api/users/identify，在用户表的meta.platform中查找匹配的平台信息
   c. 如果不存在匹配的用户，自动创建新用户账户，在meta.platform中设置平台信息
   d. 如果用户存在，更新平台信息（如果有新信息）
   e. 每个用户只能关联一个平台
3. 系统验证会议是否存在且可加入
4. 进入对话页面，显示：
   - 会议标题
   - 会议状态
   - AI语音对话界面（生动、简洁、大气）
   - 录音按钮（唯一输入方式）
5. 首次进入时，浏览器请求权限：
   - 麦克风权限（必需，用于录音）
6. 用户授权后，可以开始语音对话
```

### 3.3 AI语音对话流程
```
全程语音交互流程：
1. 用户录音：
   a. 点击录音按钮（大圆形按钮，居中显示）
   b. 开始录音（按钮变为红色，显示波形动画，提示"正在录音..."）
   c. 点击停止录音（或达到最大时长自动停止）
   d. 自动发送到服务器

2. 录音转文字流程：
   a. 前端录制音频（Web Audio API / MediaRecorder）
   b. 转换为Blob格式
   c. 发送到 /api/recordings/transcribe
   d. 后端调用Whisper API转文字
   e. 返回文字结果到前端
   f. 显示"正在理解..."状态

3. LLM处理流程：
   a. 前端发送用户文字消息到 /api/conversations/message
   b. 后端调用OpenAI API (GPT-4o-mini)
   c. 包含上下文（最近N条对话记录，保持对话连贯性）
   d. 返回AI文字回复
   e. 前端显示"AI正在思考..."状态

4. 文字转语音流程：
   a. 收到AI文字回复后，调用 /api/tts/generate
   b. 后端调用TTS API（OpenAI TTS / Google TTS等）
   c. 生成语音文件（MP3/WAV格式）
   d. 返回语音文件URL
   e. 前端自动播放语音
   f. 显示"AI正在说话..."状态（可选：显示AI头像动画）

5. 对话记录保存：
   - 每条对话记录包含：
     * 用户录音文件URL
     * 用户消息文字（转文字结果）
     * AI回复文字
     * AI回复语音文件URL
     * 对话时间戳（精确到秒）
     * 对话时长（录音时长、AI回复时长）
   - 实时保存到数据库
   - 支持后续回放和查看

6. 交互体验优化：
   - 录音时显示实时波形动画
   - AI回复时显示"说话"动画效果
   - 流畅的过渡动画，营造真实对话感
   - 简洁大气的界面设计，聚焦对话本身
```

### 3.4 会议结束与任务生成流程
```
会议结束：
1. 用户点击"结束会议"按钮（语音提示："会议已结束，正在生成任务列表..."）
2. 系统标记会议状态为"已结束"
3. 触发任务生成流程：
   a. 汇总所有对话记录（包括所有语音转文字的内容）
   b. 调用 /api/todos/generate
   c. LLM分析对话内容，提取：
      - 关键决策点
      - 待办事项
      - 负责人（如果提到）
      - 截止时间（如果提到）
   d. 生成结构化Todo List
   e. 保存到数据库，状态为"草稿"

4. 用户确认任务：
   a. 显示生成的Todo List（文字形式，便于查看和编辑）
   b. 用户可以编辑、删除、添加任务
   c. 设置提醒时间（每项任务）
   d. 点击"确认"后，状态变为"已确认"
   e. 任务列表可通过openclaw推送到用户的通讯软件（由openclaw负责推送，系统不处理）
```

---

## 四、数据库设计

### 4.1 数据表结构

#### 4.1.1 users (用户表)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255), -- 可选，非必需
  name VARCHAR(255), -- 可选，可从平台获取或用户设置
  role VARCHAR(50) DEFAULT 'user', -- 'admin' | 'user'
  avatar_url TEXT,
  -- 平台信息（使用meta JSONB存储，只支持单个平台）
  meta JSONB NOT NULL DEFAULT '{}', -- 存储平台信息，格式：{"platform": {"platform": "telegram", "platform_user_id": "123456789", "platform_username": "zhangsan", "platform_display_name": "张三", "created_at": "2024-01-02T00:00:00Z"}}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- meta字段示例结构（只支持单个平台）：
-- {
--   "platform": {
--     "platform": "telegram",
--     "platform_user_id": "123456789",
--     "platform_username": "zhangsan",
--     "platform_display_name": "张三",
--     "created_at": "2024-01-02T00:00:00Z"
--   }
-- }

-- 创建GIN索引以支持高效的JSONB查询
CREATE INDEX idx_users_meta_platform ON users USING GIN ((meta->'platform'));
```

#### 4.1.2 meets (会议表)
```sql
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_code VARCHAR(20) UNIQUE NOT NULL, -- 会议号，如 "ABC123"
  title VARCHAR(255) NOT NULL,
  description TEXT,
  host_id UUID REFERENCES users(id),
  start_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- 预计时长（分钟）
  status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'ongoing' | 'ended' | 'cancelled'
  join_url TEXT NOT NULL, -- 会议链接
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);
```

#### 4.1.3 conversations (对话记录表)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  -- 用户录音信息
  user_audio_url TEXT NOT NULL, -- 用户录音文件URL
  user_message_text TEXT NOT NULL, -- 用户消息文字（转文字结果）
  user_audio_duration INTEGER, -- 用户录音时长（秒）
  -- AI回复信息
  ai_response_text TEXT NOT NULL, -- AI回复文字
  ai_audio_url TEXT NOT NULL, -- AI回复语音文件URL
  ai_audio_duration INTEGER, -- AI回复语音时长（秒）
  -- 时间记录
  user_sent_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 用户发送时间
  ai_responded_at TIMESTAMP WITH TIME ZONE NOT NULL, -- AI回复时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.4 recordings (录音文件表)
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size BIGINT, -- 文件大小（字节）
  duration INTEGER, -- 录音时长（秒）
  transcription_status VARCHAR(50) DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  transcription_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.5 transcriptions (转文字表)
```sql
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'zh-TW',
  confidence DECIMAL(5,2), -- 置信度
  segments JSONB, -- 分段信息 [{start, end, text}]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.6 todos (任务表)
```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES users(id), -- 负责人
  status VARCHAR(50) DEFAULT 'draft', -- 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium', -- 'low' | 'medium' | 'high'
  due_date TIMESTAMP WITH TIME ZONE,
  reminder_time TIMESTAMP WITH TIME ZONE, -- 提醒时间
  source VARCHAR(50) DEFAULT 'ai_generated', -- 'ai_generated' | 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);
```

#### 4.1.7 audio_responses (AI语音回复表)
```sql
CREATE TABLE audio_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL, -- 原始文字
  audio_url TEXT NOT NULL, -- 生成的语音文件URL
  audio_duration INTEGER, -- 语音时长（秒）
  tts_provider VARCHAR(50) DEFAULT 'openai', -- 'openai' | 'google' | 'azure'
  voice_model VARCHAR(50), -- 使用的语音模型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4.1.8 meet_summaries (会议总结表)
```sql
CREATE TABLE meet_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE UNIQUE,
  summary TEXT NOT NULL, -- 会议总结
  key_points JSONB, -- 关键点 [{point, detail}]
  participants JSONB, -- 参与者信息
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 索引设计
```sql
-- 会议表索引
CREATE INDEX idx_meets_meeting_code ON meets(meeting_code);
CREATE INDEX idx_meets_host_id ON meets(host_id);
CREATE INDEX idx_meets_status ON meets(status);

-- 对话记录表索引
CREATE INDEX idx_conversations_meet_id ON conversations(meet_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- 任务表索引
CREATE INDEX idx_todos_meet_id ON todos(meet_id);
CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_assignee_id ON todos(assignee_id);
CREATE INDEX idx_todos_reminder_time ON todos(reminder_time);

-- 用户表索引（meta字段的GIN索引已在表定义中创建）
-- 如果需要通过特定平台ID快速查询，可以使用以下索引：
-- CREATE INDEX idx_users_meta_platform ON users USING GIN ((meta->'platform'));

-- AI语音回复表索引
CREATE INDEX idx_audio_responses_conversation_id ON audio_responses(conversation_id);
```

---

## 五、API接口设计

### 5.1 会议管理 API

#### 5.1.1 创建会议
```typescript
POST /api/meets
Request Body:
{
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  duration: number; // 分钟
  hostId: string;
}

Response:
{
  success: true;
  data: {
    id: string;
    meetingCode: string;
    title: string;
    joinUrl: string;
    status: 'pending';
    createdAt: string;
  }
}
```

#### 5.1.2 获取会议列表
```typescript
GET /api/meets?hostId={hostId}&status={status}&page={page}&limit={limit}

Response:
{
  success: true;
  data: {
    meets: Meet[];
    total: number;
    page: number;
    limit: number;
  }
}
```

#### 5.1.3 获取会议详情
```typescript
GET /api/meets/{meetingId}

Response:
{
  success: true;
  data: {
    id: string;
    meetingCode: string;
    title: string;
    description: string;
    hostId: string;
    startTime: string;
    duration: number;
    status: string;
    joinUrl: string;
    createdAt: string;
    conversations?: Conversation[];
    todos?: Todo[];
  }
}
```

#### 5.1.4 通过会议号查找会议
```typescript
GET /api/meets/code/{meetingCode}

Response:
{
  success: true;
  data: {
    id: string;
    meetingCode: string;
    title: string;
    status: string;
    joinUrl: string;
  }
}
```

#### 5.1.5 更新会议状态
```typescript
PATCH /api/meets/{meetingId}/status
Request Body:
{
  status: 'ongoing' | 'ended' | 'cancelled';
}

Response:
{
  success: true;
  data: {
    id: string;
    status: string;
    updatedAt: string;
  }
}
```

### 5.2 对话管理 API

#### 5.2.1 发送语音消息
```typescript
POST /api/conversations/message
Request Body:
{
  meetId: string;
  userId: string;
  audioUrl: string; // 用户录音文件URL（已上传）
  transcriptionText: string; // 转文字结果
  audioDuration: number; // 录音时长（秒）
}

Response:
{
  success: true;
  data: {
    conversationId: string;
    userMessage: string; // 用户消息文字
    aiResponseText: string; // AI回复文字
    aiAudioUrl: string; // AI回复语音文件URL
    aiAudioDuration: number; // AI回复语音时长（秒）
    userSentAt: string;
    aiRespondedAt: string;
  }
}
```

#### 5.2.2 获取对话记录
```typescript
GET /api/conversations?meetId={meetId}&page={page}&limit={limit}

Response:
{
  success: true;
  data: {
    conversations: Conversation[];
    total: number;
  }
}
```

### 5.3 录音处理 API

#### 5.3.1 上传录音并转文字
```typescript
POST /api/recordings/transcribe
Request: FormData
  - file: File (audio file)
  - meetId: string
  - userId: string

Response:
{
  success: true;
  data: {
    recordingId: string;
    transcriptionId: string;
    text: string;
    language: string;
    duration: number;
  }
}
```

#### 5.3.2 获取录音列表
```typescript
GET /api/recordings?meetId={meetId}

Response:
{
  success: true;
  data: {
    recordings: Recording[];
  }
}
```

### 5.4 任务管理 API

#### 5.4.1 生成任务（AI生成）
```typescript
POST /api/todos/generate
Request Body:
{
  meetId: string;
}

Response:
{
  success: true;
  data: {
    todos: Todo[];
    summary: string; // 会议总结
  }
}
```

#### 5.4.2 获取任务列表
```typescript
GET /api/todos?meetId={meetId}&status={status}&assigneeId={assigneeId}&platform={platform}&platformUserId={platformUserId}&sortBy={sortBy}&order={order}

Query Parameters:
- meetId?: string - 会议ID（可选）
- status?: string - 任务状态筛选（可选，'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'）
- assigneeId?: string - 负责人ID（系统用户ID，可选）
- platform?: string - 平台类型（可选，'telegram' | 'whatsapp' | 'web'等）
- platformUserId?: string - 平台用户ID（可选，需配合platform使用）
- sortBy?: string - 排序字段（可选，'created_at' | 'due_date' | 'priority'，默认'created_at'）
- order?: string - 排序顺序（可选，'asc' | 'desc'，默认'desc'）

说明：
- 可以通过系统用户ID（assigneeId）查询该用户的所有任务
- 也可以通过平台信息（platform + platformUserId）查询该平台用户的所有任务
- 支持按状态筛选
- 默认按创建时间倒序排列（最新的在前）
- 可以指定排序字段和排序顺序

Response:
{
  success: true;
  data: {
    todos: Todo[];
    total: number;
  }
}
```

#### 5.4.3 创建任务（手动）
```typescript
POST /api/todos
Request Body:
{
  meetId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  reminderTime?: string;
  priority?: 'low' | 'medium' | 'high';
}

Response:
{
  success: true;
  data: {
    id: string;
    title: string;
    status: 'draft';
    createdAt: string;
  }
}
```

#### 5.4.4 更新任务
```typescript
PUT /api/todos/{todoId}
Request Body:
{
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string;
  dueDate?: string;
  reminderTime?: string;
  priority?: string;
}

Response:
{
  success: true;
  data: {
    id: string;
    ...updated fields
  }
}
```

#### 5.4.5 确认任务（草稿转确认）
```typescript
POST /api/todos/{todoId}/confirm
Request Body:
{
  reminderTime?: string; // 可选，覆盖AI生成的提醒时间
}

Response:
{
  success: true;
  data: {
    id: string;
    status: 'confirmed';
    reminderTime: string;
  }
}
```

#### 5.4.6 批量确认任务
```typescript
POST /api/todos/confirm-batch
Request Body:
{
  todoIds: string[];
  reminderTimes?: Record<string, string>; // {todoId: reminderTime}
}

Response:
{
  success: true;
  data: {
    confirmed: number;
    todos: Todo[];
  }
}
```

### 5.5 文字转语音 API

#### 5.5.1 生成语音
```typescript
POST /api/tts/generate
Request Body:
{
  text: string; // 要转换的文字
  voice?: string; // 语音模型（可选，默认使用系统配置）
  language?: string; // 语言代码（可选，默认'zh-CN'）
}

Response:
{
  success: true;
  data: {
    audioUrl: string; // 生成的语音文件URL
    duration: number; // 语音时长（秒）
    provider: string; // TTS服务提供商
  }
}
```

### 5.6 用户管理 API

#### 5.6.1 识别或创建用户（通过平台ID）
```typescript
POST /api/users/identify
Request Body:
{
  platform: 'telegram' | 'whatsapp' | 'web' | 'other';
  platformUserId: string; // 平台用户ID
  platformUsername?: string; // 平台用户名（可选）
  platformDisplayName?: string; // 平台显示名称（可选）
}

Response:
{
  success: true;
  data: {
    id: string; // 系统用户ID
    name: string | null;
    meta: {
      platform: {
        platform: string;
        platform_user_id: string;
        platform_username: string | null;
        platform_display_name: string | null;
        created_at: string;
      };
    };
    isNewUser: boolean; // 是否为新创建的用户
  }
}

说明：
- 系统会在meta.platform中查找匹配的平台信息（只支持单个平台）
- 如果找到匹配的用户，返回现有用户ID并更新平台信息
- 如果未找到，创建新用户并在meta.platform中设置平台信息
- 每个用户只能关联一个平台
```

#### 5.6.2 获取用户信息
```typescript
GET /api/users/{userId}

Response:
{
  success: true;
  data: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    avatar_url: string | null;
      meta: {
        platform: {
          platform: string;
          platform_user_id: string;
          platform_username: string | null;
          platform_display_name: string | null;
          created_at: string;
        };
      };
    createdAt: string;
    updatedAt: string;
  }
}
```

### 5.7 LLM处理 API

#### 5.7.1 对话处理
```typescript
POST /api/llm/chat
Request Body:
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: {
    meetId: string;
    userId: string;
  };
}

Response:
{
  success: true;
  data: {
    response: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }
}
```

#### 5.7.2 生成会议总结和任务
```typescript
POST /api/llm/summarize
Request Body:
{
  meetId: string;
  conversations: Conversation[]; // 或从数据库获取
}

Response:
{
  success: true;
  data: {
    summary: string;
    keyPoints: Array<{
      point: string;
      detail: string;
    }>;
    todos: Array<{
      title: string;
      description: string;
      assignee?: string;
      dueDate?: string;
      priority: 'low' | 'medium' | 'high';
    }>;
  }
}
```

---

## 六、前端页面设计

### 6.1 页面结构
```
/ (首页)
├── /admin (管理员页面)
│   ├── /admin/meets (会议列表)
│   ├── /admin/meets/create (创建会议)
│   ├── /admin/meets/[id] (会议详情)
│   └── /admin/todos (所有任务)
│
├── /meet/[meetingCode] (加入会议页面)
│   └── 对话界面
│
├── /meet/[meetingId]/summary (会议总结)
│   └── 显示总结和任务列表
│
└── /todos (我的任务)
    └── 任务列表和详情
```

### 6.2 核心组件设计

#### 6.2.1 会议创建表单
- 标题输入
- 描述输入（可选）
- 开始时间选择器
- 预计时长输入
- 提交按钮

#### 6.2.2 语音对话界面（核心组件）
设计原则：生动、简洁、大气，营造真实人类对话感

- **中央对话区域**
  - AI头像/动画（说话时显示动画效果）
  - 对话气泡显示（可选，用于显示文字记录）
  - 实时波形显示（录音时）

- **录音控制区**
  - 大圆形录音按钮（居中，醒目）
  - 录音状态指示（录音中/等待中）
  - 录音时长显示

- **会议信息栏**
  - 会议标题
  - 会议状态
  - 对话时长

- **交互反馈**
  - 录音时：按钮变红，显示波形动画，提示"正在录音..."
  - 转文字时：显示"正在理解您的话..."
  - AI思考时：显示"AI正在思考..."
  - AI说话时：显示"AI正在说话..."，头像动画
  - 等待录音：显示"点击开始说话"

- **视觉设计**
  - 简洁的配色方案
  - 柔和的圆角和阴影
  - 流畅的过渡动画
  - 聚焦对话本身，减少干扰元素

#### 6.2.3 任务列表组件
- 任务卡片（标题、描述、状态、优先级）
- 编辑按钮
- 确认按钮
- 删除按钮
- 提醒时间设置
- 筛选器（状态、优先级）

#### 6.2.4 会议总结组件
- 总结文本显示
- 关键点列表
- 任务列表
- 确认按钮

### 6.3 交互设计

#### 6.3.1 语音对话交互流程
1. **初始状态**
   - 显示大圆形录音按钮（居中）
   - 显示提示文字："点击开始与AI对话"
   - 显示会议标题和状态

2. **录音阶段**
   - 点击录音按钮 → 开始录音
   - 按钮变为红色，显示"正在录音..."
   - 显示实时波形动画（围绕按钮或独立显示）
   - 显示录音时长（可选）
   - 再次点击或达到最大时长 → 停止录音

3. **处理阶段**
   - 显示"正在理解您的话..."（转文字）
   - 显示"AI正在思考..."（LLM处理）
   - 显示"AI正在说话..."（生成语音）

4. **播放阶段**
   - 自动播放AI语音回复
   - AI头像显示"说话"动画效果
   - 可选：显示AI回复的文字内容（小字，不干扰）
   - 播放完成后，返回等待录音状态

5. **对话记录**
   - 可选：在侧边或底部显示对话历史（文字形式）
   - 每条记录显示时间戳
   - 支持点击回放（播放录音和AI回复）

#### 6.3.2 视觉反馈设计
- **录音状态**：红色按钮 + 波形动画 + "正在录音..."
- **处理状态**：加载动画 + 状态文字提示
- **播放状态**：AI头像动画 + "正在说话..."
- **等待状态**：正常按钮 + "点击开始说话"
- **错误状态**：友好错误提示 + 重试按钮

#### 6.3.3 任务确认流程
1. 会议结束后，显示"生成任务中..."提示（语音提示："会议已结束，正在为您生成任务列表..."）
2. 生成完成后，显示任务列表（文字形式，便于查看和编辑）
3. 用户可以：
   - 编辑任务标题/描述
   - 设置提醒时间
   - 删除不需要的任务
   - 添加新任务
4. 点击"确认"按钮
5. 任务状态变为"已确认"
6. 任务列表可通过openclaw推送到用户的通讯软件（由openclaw负责，系统不处理推送）

---

## 七、Mock数据设计

### 7.1 Mock数据文件结构
```
/src/datas/mock/
├── users.json          # 用户数据
├── meets.json          # 会议数据
├── conversations.json  # 对话记录
├── recordings.json     # 录音数据
├── transcriptions.json # 转文字数据
├── todos.json         # 任务数据
└── audio_responses.json # AI语音回复数据
```

### 7.2 Mock数据示例

#### 7.2.1 users.json
```json
[
  {
    "id": "user-001",
    "email": "admin@example.com",
    "name": "系统管理员",
    "role": "admin",
    "avatar_url": null,
    "meta": {
      "platform": {
        "platform": "web",
        "platform_user_id": "admin-001",
        "platform_username": null,
        "platform_display_name": "系统管理员",
        "created_at": "2024-01-01T00:00:00Z"
      }
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  {
    "id": "user-002",
    "email": null,
    "name": "张三",
    "role": "user",
    "avatar_url": null,
    "meta": {
      "platform": {
        "platform": "telegram",
        "platform_user_id": "123456789",
        "platform_username": "zhangsan",
        "platform_display_name": "张三",
        "created_at": "2024-01-02T00:00:00Z"
      }
    },
    "created_at": "2024-01-02T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  },
  {
    "id": "user-003",
    "email": null,
    "name": "李四",
    "role": "user",
    "avatar_url": null,
    "meta": {
      "platform": {
        "platform": "whatsapp",
        "platform_user_id": "+8613800138000",
        "platform_username": null,
        "platform_display_name": "李四",
        "created_at": "2024-01-03T00:00:00Z"
      }
    },
    "created_at": "2024-01-03T00:00:00Z",
    "updated_at": "2024-01-03T00:00:00Z"
  }
]
```

#### 7.2.2 meets.json
```json
[
  {
    "id": "meet-001",
    "meeting_code": "ABC123",
    "title": "产品规划会议",
    "description": "讨论Q1产品规划",
    "host_id": "user-001",
    "start_time": "2024-01-15T10:00:00Z",
    "duration": 60,
    "status": "ended",
    "join_url": "https://example.com/meet/ABC123",
    "created_at": "2024-01-10T00:00:00Z",
    "updated_at": "2024-01-15T11:00:00Z",
    "ended_at": "2024-01-15T11:00:00Z"
  }
]
```

#### 7.2.3 conversations.json
```json
[
  {
    "id": "conv-001",
    "meet_id": "meet-001",
    "user_id": "user-002",
    "user_audio_url": "https://storage.example.com/recordings/user-rec-001.mp3",
    "user_message_text": "我们需要在Q1发布新版本",
    "user_audio_duration": 3,
    "ai_response_text": "好的，我记录了您的需求。关于Q1新版本发布，您希望包含哪些主要功能？",
    "ai_audio_url": "https://storage.example.com/audio-responses/ai-resp-001.mp3",
    "ai_audio_duration": 5,
    "user_sent_at": "2024-01-15T10:05:00Z",
    "ai_responded_at": "2024-01-15T10:05:08Z",
    "created_at": "2024-01-15T10:05:00Z"
  },
  {
    "id": "conv-002",
    "meet_id": "meet-001",
    "user_id": "user-002",
    "user_audio_url": "https://storage.example.com/recordings/user-rec-002.mp3",
    "user_message_text": "主要功能包括用户认证、数据分析和报表生成",
    "user_audio_duration": 4,
    "ai_response_text": "明白了。我已经记录下三个主要功能：1. 用户认证 2. 数据分析 3. 报表生成。这些功能的优先级如何安排？",
    "ai_audio_url": "https://storage.example.com/audio-responses/ai-resp-002.mp3",
    "ai_audio_duration": 8,
    "user_sent_at": "2024-01-15T10:07:00Z",
    "ai_responded_at": "2024-01-15T10:07:10Z",
    "created_at": "2024-01-15T10:07:00Z"
  }
]
```

#### 7.2.4 todos.json
```json
[
  {
    "id": "todo-001",
    "meet_id": "meet-001",
    "title": "完成用户认证功能开发",
    "description": "实现用户登录、注册、密码重置等功能",
    "assignee_id": "user-002",
    "status": "confirmed",
    "priority": "high",
    "due_date": "2024-02-15T00:00:00Z",
    "reminder_time": "2024-02-14T09:00:00Z",
    "source": "ai_generated",
    "created_at": "2024-01-15T11:00:00Z",
    "updated_at": "2024-01-15T11:05:00Z"
  },
  {
    "id": "todo-002",
    "meet_id": "meet-001",
    "title": "设计数据分析模块",
    "description": "设计数据采集、处理和可视化方案",
    "assignee_id": null,
    "status": "draft",
    "priority": "medium",
    "due_date": "2024-02-20T00:00:00Z",
    "reminder_time": null,
    "source": "ai_generated",
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

---

## 八、实施步骤

### 8.1 第一阶段：基础框架搭建（Week 1-2）
1. **项目初始化**
   - 创建Next.js项目
   - 配置TypeScript和TailwindCSS
   - 设置项目结构（app目录、components、lib等）

2. **数据库设计**
   - 设计Supabase表结构
   - 生成SQL脚本（暂不执行）
   - 创建Mock数据文件

3. **基础页面**
   - 创建管理员登录页面
   - 创建会议列表页面
   - 创建会议创建页面

### 8.2 第二阶段：会议管理功能（Week 3-4）
1. **会议CRUD**
   - 实现创建会议API（Mock数据）
   - 实现获取会议列表API
   - 实现会议详情API
   - 实现通过会议号查找API

2. **前端页面**
   - 完善会议列表页面
   - 完善会议创建表单
   - 实现会议详情页面

3. **路由和导航**
   - 设置路由结构
   - 实现页面导航

### 8.3 第三阶段：语音对话功能（Week 5-6）
1. **录音功能**
   - 实现前端录音功能（Web Audio API / MediaRecorder）
   - 实现录音上传API（Mock）
   - 实现转文字API（Mock，返回模拟文字）
   - 实现录音波形动画显示

2. **语音对话界面**
   - 创建语音对话页面组件（生动、简洁、大气）
   - 实现大圆形录音按钮
   - 实现录音状态指示和动画
   - 实现AI头像和说话动画
   - 实现对话状态提示（录音中/理解中/思考中/说话中）

3. **LLM集成（Mock）**
   - 创建LLM API接口（返回Mock回复）
   - 实现对话上下文管理
   - 实现消息存储（Mock数据）

4. **文字转语音（Mock）**
   - 创建TTS API接口（Mock，返回模拟语音URL）
   - 实现语音播放功能
   - 实现播放状态管理

### 8.4 第四阶段：任务生成（Week 7-8）
1. **任务管理**
   - 实现任务生成API（Mock LLM处理）
   - 实现任务列表API
   - 实现任务CRUD API

2. **前端任务界面**
   - 创建任务列表组件
   - 实现任务编辑功能
   - 实现任务确认功能

3. **会议总结**
   - 实现会议总结生成（Mock）
   - 创建总结显示页面

### 8.5 第五阶段：用户识别和平台集成（Week 9-10）
1. **用户识别功能**
   - 实现平台ID识别API
   - 实现自动创建/关联用户功能
   - 实现用户信息管理

2. **URL参数处理**
   - 实现从URL获取平台信息（platform, userId）
   - 实现用户自动识别流程
   - 实现用户信息显示

3. **数据记录优化**
   - 完善对话记录（时间、内容、时长等）
   - 实现对话回放功能
   - 优化数据存储结构

### 8.6 第六阶段：优化和测试（Week 11-12）
1. **UI/UX优化**
   - 优化界面设计
   - 添加加载状态
   - 添加错误处理
   - 响应式设计

2. **功能测试**
   - 单元测试
   - 集成测试
   - E2E测试

3. **文档完善**
   - API文档
   - 用户手册
   - 开发文档

---

## 九、对接步骤

### 9.1 Supabase对接
1. **创建Supabase项目**
   - 注册Supabase账号
   - 创建新项目
   - 获取API密钥和URL

2. **执行数据库脚本**
   - 在Supabase SQL Editor中执行表创建脚本
   - 创建索引
   - 设置Row Level Security (RLS)策略

3. **配置Supabase客户端**
   - 安装@supabase/supabase-js
   - 创建Supabase客户端配置文件
   - 替换Mock数据为真实数据库查询

4. **文件存储配置**
   - 创建Storage Bucket（recordings）
   - 设置存储策略
   - 实现文件上传功能

### 9.2 OpenAI API对接
1. **获取API密钥**
   - 注册OpenAI账号
   - 获取API密钥
   - 设置环境变量

2. **实现LLM调用**
   - 安装openai SDK
   - 实现对话API（使用gpt-4o-mini）
   - 实现总结和任务生成API（使用gpt-4o）

3. **实现Whisper转文字**
   - 调用Whisper API
   - 处理音频文件格式
   - 返回转文字结果

### 9.3 TTS（文字转语音）对接
1. **选择TTS服务**
   - OpenAI TTS API（推荐，质量高）
   - Google Cloud TTS
   - Azure Cognitive Services TTS
   - 其他TTS服务

2. **实现TTS功能**
   - 安装TTS SDK
   - 实现文字转语音API
   - 处理语音文件生成和存储
   - 返回语音文件URL

3. **语音优化**
   - 选择合适的语音模型和音色
   - 优化语音质量
   - 处理多语言支持
   - 实现语音缓存（相同文字复用）

---

## 十、测试计划

### 10.1 单元测试
- **API路由测试**
  - 测试每个API端点的请求/响应
  - 测试错误处理
  - 测试数据验证

- **工具函数测试**
  - 测试数据转换函数
  - 测试日期处理函数
  - 测试字符串处理函数

### 10.2 集成测试
- **会议流程测试**
  1. 创建会议 → 获取会议列表 → 查看会议详情
  2. 通过会议号查找会议 → 进入对话页面

- **语音对话流程测试**
  1. 录音 → 转文字 → LLM处理 → 生成语音 → 播放AI回复
  2. 多条语音对话记录保存和显示
  3. 对话时间、内容、时长正确记录
  4. 语音文件正确存储和播放

- **任务生成流程测试**
  1. 结束会议 → 生成任务 → 查看任务列表
  2. 编辑任务 → 确认任务 → 验证任务状态更新

### 10.3 E2E测试场景

#### 场景1：完整会议流程
```
1. 管理员登录
2. 创建新会议
3. 获取会议号和链接
4. openclaw推送链接到Telegram/WhatsApp（包含平台ID参数）
5. 用户通过链接进入（系统自动识别平台和用户ID）
6. 系统自动创建或关联用户账户
7. 授权录音权限
8. 进行3-5轮语音对话（全程语音交互）
9. 结束会议
10. 查看生成的总结和任务
11. 编辑并确认任务
12. 任务通过openclaw推送到用户通讯软件（系统不处理推送）
```

#### 场景2：用户识别和管理
```
1. 通过Telegram链接进入（?platform=telegram&userId=123456）
2. 系统识别平台和用户ID
3. 自动创建新用户或关联现有用户
4. 显示用户信息
5. 进行语音对话
6. 验证对话记录正确关联到用户
```

#### 场景3：任务管理
```
1. 查看所有任务列表
2. 筛选任务（按状态、优先级）
3. 编辑任务详情
4. 设置提醒时间
5. 确认任务
```

#### 场景4：错误处理
```
1. 无效会议号 → 显示错误提示
2. 录音权限被拒绝 → 显示提示信息
3. 网络错误 → 显示重试选项
4. API错误 → 显示友好错误信息
5. TTS生成失败 → 显示错误提示，可选重试
```

### 10.4 性能测试
- **页面加载时间**：目标 < 2秒
- **API响应时间**：目标 < 500ms（Mock数据）
- **录音转文字**：目标 < 5秒（实际API）
- **LLM响应时间**：目标 < 10秒
- **文字转语音**：目标 < 3秒（实际API）
- **语音播放**：流畅无卡顿

### 10.5 兼容性测试
- **浏览器**：Chrome, Firefox, Safari, Edge（最新版本）
- **移动端**：iOS Safari, Android Chrome
- **设备**：桌面、平板、手机

---

## 十一、验收标准

### 11.1 功能验收标准

#### 11.1.1 会议管理
- [ ] 管理员可以创建会议，系统自动生成会议号和链接
- [ ] 可以查看会议列表，支持筛选和分页
- [ ] 可以通过会议号或链接查找会议
- [ ] 可以更新会议状态
- [ ] 会议信息正确显示

#### 11.1.2 语音对话功能
- [ ] 用户可以进入语音对话页面
- [ ] 浏览器正确请求麦克风权限
- [ ] 可以录音并发送（仅支持语音输入）
- [ ] 录音可以正确转文字（Mock阶段返回模拟文字）
- [ ] LLM回复正确生成
- [ ] AI回复文字可以正确转换为语音
- [ ] AI语音可以正确播放
- [ ] 对话记录正确保存（包括时间、内容、时长等）
- [ ] 对话时间戳精确记录（用户发送时间、AI回复时间）
- [ ] 界面生动、简洁、大气，营造真实对话感
- [ ] 录音和播放状态正确显示
- [ ] 动画效果流畅自然

#### 11.1.3 任务生成
- [ ] 会议结束后可以生成任务
- [ ] 生成的任务包含标题、描述、优先级等信息
- [ ] 可以查看任务列表
- [ ] 可以编辑任务
- [ ] 可以删除任务
- [ ] 可以添加新任务
- [ ] 可以设置提醒时间
- [ ] 可以确认任务（草稿转确认）

#### 11.1.4 用户识别功能
- [ ] 系统可以正确识别平台类型（Telegram/WhatsApp等）
- [ ] 系统可以正确识别平台用户ID
- [ ] 新用户自动创建账户
- [ ] 现有用户正确关联
- [ ] 用户信息正确显示和存储

### 11.2 UI/UX验收标准
- [ ] 界面美观、现代化
- [ ] 响应式设计，适配各种屏幕尺寸
- [ ] 交互流畅，无明显卡顿
- [ ] 加载状态正确显示
- [ ] 错误信息友好易懂
- [ ] 符合无障碍设计标准

### 11.3 代码质量标准
- [ ] TypeScript类型定义完整
- [ ] 代码结构清晰，遵循最佳实践
- [ ] 组件可复用性高
- [ ] 错误处理完善
- [ ] 代码注释充分

### 11.4 文档验收标准
- [ ] API文档完整
- [ ] 数据库设计文档完整
- [ ] 部署文档完整
- [ ] 用户使用手册完整

---

## 十二、交互设计规范

### 12.1 颜色规范
- **主色调**：蓝色系（#3B82F6）
- **成功色**：绿色（#10B981）
- **警告色**：黄色（#F59E0B）
- **错误色**：红色（#EF4444）
- **文字色**：深灰（#1F2937）
- **背景色**：浅灰（#F9FAFB）

### 12.2 字体规范
- **标题**：font-bold, text-2xl / text-3xl
- **副标题**：font-semibold, text-xl
- **正文**：font-normal, text-base
- **小字**：font-normal, text-sm

### 12.3 间距规范
- **页面边距**：px-4 sm:px-6 lg:px-8
- **组件间距**：gap-4 / gap-6 / gap-8
- **卡片内边距**：p-4 / p-6

### 12.4 按钮规范
- **主要按钮**：bg-primary text-primary-foreground px-4 py-2 rounded-lg
- **次要按钮**：border border-border bg-background px-4 py-2 rounded-lg
- **危险按钮**：bg-destructive text-destructive-foreground px-4 py-2 rounded-lg

### 12.5 卡片规范
- **基础卡片**：bg-card border border-border rounded-xl p-6 shadow-sm
- **交互卡片**：hover:shadow-md transition-shadow

### 12.6 表单规范
- **输入框**：border border-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary
- **标签**：text-sm font-medium text-foreground mb-2
- **错误提示**：text-sm text-destructive mt-1

### 12.7 加载状态
- **页面加载**：显示骨架屏（Skeleton）
- **按钮加载**：显示spinner + 禁用按钮
- **数据加载**：显示"加载中..."文字

### 12.8 错误处理
- **表单错误**：在输入框下方显示红色错误文字
- **API错误**：显示Toast通知或错误提示框
- **网络错误**：显示重试按钮

---

## 十三、后续扩展计划

### 13.1 功能扩展
1. **多语言支持**
   - 支持中英文切换
   - 支持其他语言

2. **会议录制**
   - 录制整个会议视频
   - 支持回放

3. **实时协作**
   - 多人同时参与对话
   - 实时消息同步

4. **高级分析**
   - 会议参与度分析
   - 任务完成率统计
   - 数据可视化

### 13.2 集成扩展
1. **日历集成**
   - Google Calendar
   - Outlook Calendar
   - Apple Calendar

2. **任务管理工具集成**
   - Notion
   - Trello
   - Asana
   - Jira

3. **更多通讯平台**
   - 微信
   - Slack
   - Discord

### 13.3 性能优化
1. **缓存策略**
   - API响应缓存
   - 静态资源缓存

2. **数据库优化**
   - 查询优化
   - 索引优化
   - 分页优化

3. **前端优化**
   - 代码分割
   - 懒加载
   - 图片优化

---

## 十四、部署方案

### 14.1 开发环境
- **本地开发**：Next.js dev server
- **数据库**：Supabase本地开发环境或云端开发实例
- **环境变量**：.env.local文件

### 14.2 生产环境
- **前端部署**：Vercel / Netlify
- **数据库**：Supabase生产实例
- **文件存储**：Supabase Storage
- **环境变量**：平台环境变量配置

### 14.3 CI/CD
- **代码仓库**：GitHub / GitLab
- **自动部署**：Vercel自动部署（连接GitHub）
- **测试**：GitHub Actions运行测试

---

## 十五、安全考虑

### 15.1 认证授权
- 使用Supabase Auth进行用户认证
- 实现基于角色的访问控制（RBAC）
- API端点验证用户身份

### 15.2 数据安全
- 敏感数据加密存储
- 使用HTTPS传输
- 实现Row Level Security (RLS)

### 15.3 隐私保护
- 录音数据加密存储
- 用户数据访问日志
- 数据保留政策
- 用户数据删除功能

---

## 十六、附录

### 16.1 术语表
- **Meet**：会议，包含会议号、链接、时间等信息
- **Conversation**：对话记录，用户和AI的语音交互记录
- **Recording**：用户录音文件
- **Transcription**：转文字结果，将用户语音转换为文字
- **TTS**：文字转语音，将AI回复文字转换为语音
- **Todo**：任务，从会议中提取的待办事项
- **Platform ID**：平台用户ID，如Telegram ID、WhatsApp电话号码等

### 16.2 参考资源
- Next.js文档：https://nextjs.org/docs
- Supabase文档：https://supabase.com/docs
- OpenAI API文档：https://platform.openai.com/docs
- TailwindCSS文档：https://tailwindcss.com/docs

### 16.3 联系方式
- 项目负责人：[待填写]
- 技术支持：[待填写]
- 项目仓库：[待填写]

---

**文档版本**：v1.0  
**最后更新**：2024-01-XX  
**文档状态**：草案

---

## 十七、实时语音对话改造方案（Streaming ASR + 连续对话）

### 17.1 背景与问题

- 现有流程（单轮对话）：
  - 用户点击录音按钮 → 浏览器录音，生成音频 Blob  
  - 上传音频到 Dify `/files/upload`，获取 `upload_file_id`  
  - 调用 Dify `workflows/run` 做语音转文字，返回 `transcriptionText`  
  - 调用本地 `/api/conversations/message`，由该接口再调用 Dify `/chat-messages` 获取 AI 文本回复  
  - 调用 Azure TTS 将 AI 文本转语音并播放  
- 问题：
  - 每轮对话至少 3–4 个 HTTP 调用，链路长、累计延迟高；
  - 录音 → 上传 → 转写 → 对话 → TTS 为「分块」操作，用户等待感明显；
  - 用户需每轮点击录音按钮，打断感强，不是自然连续对话。

### 17.2 目标体验（参考 InterviewChatOverlay）

- 用户进入对话页面后，完成一次授权/确认后即可**自动进入「监听模式」**：
  - 用户说话时，前端实时显示转写字幕；
  - 用户说完后自动触发 AI 回复，无需再点按钮；
  - AI 回复期间显示「AI 回复中 / 正在说话」，此时禁止继续录音；
  - AI 播放结束后自动恢复监听，进入下一轮对话；
  - 全程只在会议开始时做一次「开始对话」操作、结束时点一次「结束会议」，中间无需人工点录音按钮。

### 17.3 技术分层与职责划分

1. **Streaming ASR 层（语音→文字，流式）**
   - 通过 WebSocket 与语音识别服务建立长连接；
   - 前端将录音 chunk（例如 16k 单声道 PCM/WAV）实时发送到 ASR 服务；
   - 服务端持续返回部分（partial）与最终（final）转写文本；
   - 前端根据 partial 更新实时字幕，根据 final 触发一轮完整对话。

2. **LLM 对话层（文字→文字）**
   - 保留 `/api/conversations/message` 作为统一的对话入口；
   - `/api/conversations/message` 内部调用 Dify `/chat-messages`（或后续替换为其他 Chat API），维持 `conversation_id` 上下文；
   - 入参只接受 `transcriptionText`（纯文本），不再依赖 Dify workflow 的 fileId。

3. **TTS 层（文字→语音）**
   - 继续使用 Azure TTS，将 AI 文本回复转为语音；
   - 播放控制与状态机集成：AI 回复完成 → 进入 `speaking` 状态 → 播放结束后恢复 `listening`。

> 结果：每轮对话只需要一条 Streaming ASR WebSocket 流 + 一次 LLM 请求 + 一次 TTS 请求，整体链路更短、响应更快。

### 17.4 前端状态机与交互流程

在 `useVoiceConversation` 中统一管理对话状态：

- `isListening`: 是否在监听用户说话（录音中 + ASR 推流中）
- `isProcessing`: 是否在等待 AI 文本回复（调用 `/api/conversations/message` 过程中）
- `isSpeaking`: 是否在播放 AI 语音
- `transcriptLive`: 当前轮对话的实时转写内容（partial 文本）
- `conversations`: 历史对话记录（`Conversation[]`，用于保存和总结）

**单轮对话状态流转：**

1. **进入页面 / 开始对话**
   - 用户点击「开始对话」或进入页面后确认授权麦克风；
   - Hook 调用浏览器录音 API + 初始化 Streaming ASR WebSocket；
   - `isListening = true`。

2. **用户说话（Streaming ASR）**
   - 录音 chunk 持续通过 WebSocket 发送给 ASR 服务；
   - 收到 partial 文本 → 更新 `transcriptLive`，UI 底部显示「您：{transcriptLive}」；
   - 收到 final 文本 → 结束本轮录音/推流，固定用户本轮发言文本。

3. **调用 LLM 获取回复**
   - 将 final 文本作为 `transcriptionText` 传给 `/api/conversations/message`；
   - `isListening = false`，`isProcessing = true`；
   - 后端调用 Dify `/chat-messages`，保持 `conversation_id` 上下文，返回 AI 文本回复和时间戳；
   - 前端将本轮 `Conversation`（用户文本 + AI 文本 + 时间）追加到 `conversations` 中。

4. **TTS 播放 AI 回复**
   - 收到 AI 文本后，调用 Azure TTS 生成语音并播放；
   - `isProcessing = false`，`isSpeaking = true`；
   - 播放期间禁止新的录音交互（按钮禁用 / 状态提示「AI 正在说话…」）。

5. **播放结束，准备下一轮**
   - 播放完成 → `isSpeaking = false`；
   - 如果会议状态不是 `ended`，重新进入监听：`isListening = true`，开启下一轮录音 + ASR；
   - 如此往复，直到用户点击「结束会议」。

6. **结束会议**
   - 用户点击挂断按钮 → 弹出 `EndMeetingModal` 确认；
   - 确认后：
     - 关闭录音与 ASR WebSocket；
     - 停止 TTS 播放；
     - 批量保存 `conversations` 到 Supabase；
     - 更新会议状态为 `ended`；
     - 触发 `/api/todos/generate` 生成总结与待办；
     - 跳转到总结页 `/meet/[code]/summary`。

### 17.5 关键组件与 Hook 改造方向

1. **`useVoiceConversation`**
   - 职责：编排状态机（listening / processing / speaking）、串联 ASR → LLM → TTS；
   - 新增方法：
     - `startSession()`：完成麦克风授权并启动 Streaming ASR；
     - `stopSession()`：强制停止当前录音与 ASR（用于结束会议）。
   - 依赖注入：
     - 接入一个通用的 Streaming ASR Hook（例如 `useStreamingASR`），内部实现可以替换（Dify、Munlingo、自建 ASR 等）。

2. **Streaming ASR Hook（建议新增）**
   - 类似 `munlingo` 项目里的 `useWavRecorder` + WebSocket 封装：
     - `start(language)`：打开麦克风，建立 WebSocket，开始推流；
     - `stop()`：停止录音，关闭 WebSocket；
     - 回调：
       - `onPartial(text: string)`：更新 `transcriptLive`；
       - `onFinal(text: string)`：固定本轮文本，触发 LLM 调用。

3. **`VoiceConversationView` UI**
   - 顶部：
     - 显示会议标题、状态（进行中 / 已结束）、计时器（可选）；
   - 中部：
     - AI Avatar + 状态提示：
       - `isListening`：显示「正在聆听…」；
       - `isProcessing`：显示「AI 正在思考…」；
       - `isSpeaking`：显示「AI 正在说话…」+ Avatar 动画；
     - 显示本轮实时字幕 `transcriptLive`；
     - 保持显示最近一条完整对话（用户发言 + AI 回复）。
   - 底部：
     - 中间大按钮从「开始/停止录音」变为「可选的暂停/继续」；
     - 右侧挂断按钮保留，用于结束会议；
     - 左侧按钮在会议已结束后可跳转到总结页。

4. **`MeetPage`（`/meet/[code]/page.tsx`）**
   - 在用户和会议信息准备完毕后，自动触发 `startSession()`：
     - 初始可通过提示文案引导用户点击一次「开始对话」按钮，以满足浏览器对用户手势授权麦克风的要求；
     - 之后的轮次全自动。

### 17.6 后端与外部服务配合

1. **Streaming ASR 服务**
   - 提供 WebSocket 接口，例如：`wss://.../api/asr/stream?lang=zh|en`；
   - 消息协议：
     - 客户端：发送二进制音频 chunk；
     - 服务端：返回 JSON 文本，如：
       - `{ type: 'partial', text: '你好' }`
       - `{ type: 'final', text: '你好，我是张三。' }`
       - `{ type: 'error', message: '...' }`。

2. **LLM 对话服务（Dify 或替代）**
   - 保留 `/api/conversations/message` 调用 Dify `/chat-messages` 的实现；
   - 仅接收 `transcriptionText` 文本，不再耦合音频上传与 workflow。

3. **TTS 服务（Azure）**
   - 继续通过 `useTTS` 直接调用 Azure TTS；
   - 从 `useVoiceConversation` 中在 AI 文本回复完成后发起调用；

### 17.7 渐进式改造策略

1. 第一阶段：保留现有 Dify 转写方案，新增 Streaming ASR 支持，做 A/B 开关或配置切换；
2. 第二阶段：在对话链路中默认使用 Streaming ASR，只在出错时回退到「上传 + workflow」方案；
3. 第三阶段：确认新链路稳定后，完全移除 Dify workflow 转写逻辑，仅保留文本 Chat 能力；
4. 后续如需替换 Dify，只需改 `/api/conversations/message` 中的对话实现，Streaming ASR 与 TTS 无需调整。

