# Vercel 部署配置指南

本指南提供 TaskAI 项目在 Vercel 上的部署和环境变量配置说明。

## 📋 必需环境变量

在 Vercel Dashboard > Settings > Environment Variables 中配置以下变量：

### 🔒 Supabase 配置（必需）

```bash
# Supabase 基本配置（从 Supabase Dashboard > Settings > API 获取）
NEXT_PUBLIC_SUPABASE_URL=https://ocosfpngrcmsolsygqxe.supabase.co

# Anon Key（支持两种命名方式，任选其一）
NEXT_PUBLIC_SUPABASE_ANON=你的anon_public_key

# Service Role Key（用于服务端 API，绕过 RLS）
SUPABASE_SERVICE_ROLE_KEY=你的service_role_secret_key
```

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 前往 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public key**
5. 复制 **service_role key**（⚠️ 注意保密，不要暴露在客户端代码中）

### 🌐 应用 URL 配置（必需）

```bash
# 推荐：统一站点 URL（邀请链接、TaskAI WhatsApp 通知链接等）
NEXT_PUBLIC_SITE_URL=https://你的域名.vercel.app

# 当前会议链接代码仍会读取这个变量，建议与 NEXT_PUBLIC_SITE_URL 保持一致
NEXT_PUBLIC_BASE_URL=https://你的域名.vercel.app
```

**注意**：
- 如果使用自定义域名，使用自定义域名
- 如果不设置，系统会退回 request host 或 `http://localhost:3000`
- TaskAI WhatsApp 通知里的 task / workspace / summary 链接会优先使用 `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_URL` 与 `NEXT_PUBLIC_BASE_URL` 必须与当前正式前端域名保持一致，否则用户会被带到旧 deployment

### 🔔 TaskAI 通知链接配置说明（重要）

TaskAI 的部分 WhatsApp 文案会包含绝对链接，例如：

- 新任务可领取
- 已领取确认
- AI workspace 链接
- 任务完成 summary 链接

这些链接由服务端 API 在入列 notification job 时生成。当前逻辑会优先读取：

1. `NEXT_PUBLIC_SITE_URL`
2. request 的 host / protocol
3. `http://localhost:3000`

这意味着：

- 如果你在本机运行 API，但 `.env.local` 里的 `NEXT_PUBLIC_SITE_URL` 仍指向旧的 Vercel 域名，发出去的 WhatsApp 链接也会指向旧站
- 如果你已经部署了新版本到 Vercel，但没有同步更新 Vercel 环境变量并重新部署，链接仍可能落到旧域名或错误域名
- 如果本机开发环境连接的是正式 Supabase，用户虽然会收到真实 WhatsApp 通知，但通知中的前端链接未必指向本机最新代码

建议规则：

- 本机开发：只有在你明确接受“链接会跳去正式站”时，才保留正式 `NEXT_PUBLIC_SITE_URL`
- 正式部署：始终将 `NEXT_PUBLIC_SITE_URL` 与 `NEXT_PUBLIC_BASE_URL` 设置为当前 production 域名
- 切换域名或新建 Vercel 项目后：更新环境变量并重新部署一次，不要只改代码

## 🔧 可选环境变量

### Dify 配置（如果使用 Dify ASR）

```bash
NEXT_PUBLIC_DIFY_SERVER=https://your-dify-server.com/v1
NEXT_PUBLIC_DIFY_API_KEY=your-dify-api-key
```

### 阿里云 ASR 配置（如果使用阿里云 Streaming ASR）

```bash
ALIYUN_ACCESS_KEY_ID=your-access-key-id
ALIYUN_ACCESS_KEY_SECRET=your-access-key-secret
ALIYUN_ASR_APP_KEY=your-asr-app-key
ALIYUN_REGION=cn-shanghai
```

**获取方式**：
1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 前往 **AccessKey 管理** 创建 AccessKey
3. 前往 **智能语音交互** 创建应用并获取 AppKey

### Azure TTS 配置（如果使用 Azure TTS）

```bash
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=your-azure-region
```

### ASR 模式选择

```bash
# 设置为 'aliyun' 使用阿里云实时语音识别，'dify' 使用 Dify 转写
# 默认值：'dify'
NEXT_PUBLIC_ASR_MODE=dify
```

## 📝 配置步骤

### 1. 在 Vercel Dashboard 中配置环境变量

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择您的项目
3. 前往 **Settings** → **Environment Variables**
4. 点击 **Add New**
5. 逐一添加上述环境变量
6. **重要**：选择适当的环境（Production, Preview, Development）
   - Production：生产环境
   - Preview：预览环境（PR 部署）
   - Development：开发环境

### 1.1 TaskAI WhatsApp 正式站桥接配置

如果正式站的 TaskAI WhatsApp 通知仍要通过 Bobby 这台 Mac 上的本机 `openclaw-whatsapp` 发送，除了 Vercel 部署成功之外，还必须同时完成以下配置。

Vercel Production 必须配置：

```bash
NEXT_PUBLIC_SITE_URL=https://你的正式域名
NEXT_PUBLIC_BASE_URL=https://你的正式域名
TASKAI_INTERNAL_BRIDGE_TOKEN=与你本机 dispatcher 完全一致的随机长 token
```

本机 `/Users/bobbylian/.taskai-whatsapp-dispatch.env` 必须配置：

```bash
TASKAI_BASE_URL=https://你的正式域名
TASKAI_INTERNAL_BRIDGE_TOKEN=与 Vercel Production 完全一致的 token
OPENCLAW_WHATSAPP_ADDR=http://127.0.0.1:8555
```

关键说明：

- Vercel 不会主动打进本机 Mac；真正的模式是本机 dispatcher 主动去拉 `https://你的正式域名/api/internal/whatsapp/jobs/claim`
- 如果本机 `TASKAI_BASE_URL` 还停留在 `http://localhost:3000`，那么 push 到 Vercel 后，本机仍只会处理本地开发环境的 queue，不会处理 production queue
- `TASKAI_INTERNAL_BRIDGE_TOKEN` 必须在 Vercel 与本机完全一致；否则本机无法 claim production jobs，也无法回写发送结果
- `OPENCLAW_WHATSAPP_ADDR` 继续指向本机 bridge，不需要配置到 Vercel

建议交接给工程师时直接说明：

1. 先把代码 push 并确认 Vercel Production 已成功部署
2. 在 Vercel Production 环境变量中设置正式域名与 `TASKAI_INTERNAL_BRIDGE_TOKEN`
3. 在 Bobby 这台 Mac 的 `/Users/bobbylian/.taskai-whatsapp-dispatch.env` 把 `TASKAI_BASE_URL` 从 `http://localhost:3000` 改成正式域名
4. 确认 LaunchAgent 仍在运行，且 `openclaw-whatsapp` 状态为 `connected`
5. 用正式站触发一条测试 WhatsApp 通知，确认 job 会从 `queued -> sending -> sent`

### 2. 验证配置

部署完成后，检查环境变量是否正确加载：

**方法一：查看构建日志**
- 在 Vercel Dashboard > Deployments > 选择最新部署 > Build Logs
- 检查是否有 "Missing Supabase environment variables" 错误

**方法二：API 路由测试**
- 访问 `/api/meets` 端点
- 如果返回数据，说明 Supabase 配置正确

**方法三：TaskAI 通知链接冒烟测试**
- 登录正式站，进入 `/my/settings`
- 确认 WhatsApp 已绑定并可发送 `Send test message`
- 创建一个测试 task，或触发一条会带链接的 WhatsApp 通知
- 检查 WhatsApp 文案中的链接域名是否等于当前正式域名
- 点开链接，确认页面内容是当前最新部署版本，而不是旧版 UI

**方法四：TaskAI 本机 WhatsApp worker 冒烟测试**
- 在 Bobby 这台 Mac 上执行 `openclaw-whatsapp status --addr http://127.0.0.1:8555`
- 确认输出为 `connected`
- 检查 `launchctl list | rg ai.openclaw.taskai-whatsapp-dispatch`
- 确认 `/Users/bobbylian/.taskai-whatsapp-dispatch.env` 内的 `TASKAI_BASE_URL` 已改为正式域名
- 从正式站发送 `Send test message` 或触发一笔 TaskAI notification
- 确认对应 job 最终会被回写为 `sent`

### 3. 常见问题排查

#### ❌ 错误：`Missing Supabase environment variables`

**原因**：环境变量未正确配置

**解决方案**：
1. 检查 Vercel Dashboard > Settings > Environment Variables
2. 确认以下变量已配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. 确认环境变量已应用到正确的环境（Production/Preview/Development）
4. 重新部署项目

#### ❌ 错误：`Invalid API key` 或 `Unauthorized`

**原因**：Supabase API Key 配置错误

**解决方案**：
1. 重新从 Supabase Dashboard 复制正确的 API Key
2. 确认没有多余的空格或换行符
3. 更新环境变量后重新部署

#### ❌ 会议链接不正确

**原因**：`NEXT_PUBLIC_BASE_URL` 未正确配置

**解决方案**：
1. 在 Vercel Dashboard 中设置 `NEXT_PUBLIC_BASE_URL`
2. 使用完整的 URL（包含 `https://`）
3. 不要以 `/` 结尾

#### ❌ WhatsApp 通知里的链接打开了旧版页面

**原因**：`NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_BASE_URL` 仍指向旧的 Vercel deployment 或旧域名

**解决方案**：
1. 检查 Vercel Dashboard 中 Production 环境的：
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_BASE_URL`
2. 确认两者都等于当前 production 域名
3. 如果刚切换过域名或项目，更新后重新部署
4. 重新触发一条 TaskAI WhatsApp 通知，确认文案里的域名已更新

#### ❌ 本机测试 WhatsApp 通知，但链接跳去线上

**原因**：本机 `.env.local` 中的 `NEXT_PUBLIC_SITE_URL` 指向线上域名

**解决方案**：
1. 如果你要测试真实 WhatsApp 发送，但链接也想指向本机，请临时移除或修改本机 `NEXT_PUBLIC_SITE_URL`
2. 如果只是测试通知发送成功，不测试链接落地页，可以保留线上域名
3. 测试结束后恢复正式配置，避免影响后续发送

#### ❌ 已经 push 到 Vercel，但正式站通知没有发到本机 WhatsApp

**原因**：本机 dispatcher 仍在拉 localhost，或 bridge token 不一致

**解决方案**：
1. 打开 `/Users/bobbylian/.taskai-whatsapp-dispatch.env`
2. 确认 `TASKAI_BASE_URL=https://你的正式域名`
3. 确认 `TASKAI_INTERNAL_BRIDGE_TOKEN` 与 Vercel Production 完全一致
4. 执行 `launchctl list | rg ai.openclaw.taskai-whatsapp-dispatch`
5. 执行 `openclaw-whatsapp status --addr http://127.0.0.1:8555`
6. 重新从正式站触发一条测试通知
7. 若仍失败，再检查本机 log：
   - `/tmp/taskai-whatsapp-dispatch.log`
   - `/tmp/taskai-whatsapp-dispatch.err`

## ✅ 发布前检查清单

在工程师执行 Vercel 正式发布时，请至少检查以下项目：

1. 最新代码已经 push，且对应 commit 已在 Vercel 成功部署
2. `NEXT_PUBLIC_SITE_URL` 指向当前正式域名
3. `NEXT_PUBLIC_BASE_URL` 与 `NEXT_PUBLIC_SITE_URL` 一致
4. 正式站可正常打开 `/my/settings`
5. WhatsApp 绑定状态正常，`Send test message` 可发送
6. 创建一个测试 task，确认如果通知文案包含链接，链接域名正确
7. 点开通知链接，确认页面 UI 和当前本地预期版本一致
8. Bobby 本机 `/Users/bobbylian/.taskai-whatsapp-dispatch.env` 的 `TASKAI_BASE_URL` 已指向正式域名
9. Bobby 本机与 Vercel Production 的 `TASKAI_INTERNAL_BRIDGE_TOKEN` 一致
10. 本机 `openclaw-whatsapp` 为 `connected`
11. 本机 LaunchAgent 正在轮询 dispatcher
12. 已从正式站完成至少一次 WhatsApp 发送 smoke test

## 🔐 安全建议

1. **不要提交 `.env.local` 到 Git**
   - 确保 `.env.local` 在 `.gitignore` 中

2. **使用不同的密钥**
   - 开发环境和生产环境使用不同的 Supabase 项目或不同的密钥

3. **定期轮换密钥**
   - 定期更新 Supabase Service Role Key
   - 如果密钥泄露，立即在 Supabase Dashboard 中重新生成

4. **限制 Service Role Key 访问**
   - Service Role Key 只能在服务端使用
   - 不要使用 `NEXT_PUBLIC_` 前缀暴露 Service Role Key

## 📚 相关文档

- [Supabase 文档](https://supabase.com/docs)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
