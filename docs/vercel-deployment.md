# 🚀 Vercel 部署配置指南

本指南提供 TalentSyncAI 项目在 Vercel 上的部署和环境变量配置说明。

## 📋 必需环境变量

在 Vercel Dashboard > Settings > Environment Variables 中配置以下变量：

### 🔒 Supabase 配置（必需）

```bash
# Supabase 基本配置（从 Supabase Dashboard > Settings > API 获取）
NEXT_PUBLIC_SUPABASE_URL=https://你的项目ID.supabase.co

# Anon Key（支持两种命名方式，任选其一）
NEXT_PUBLIC_SUPABASE_ANON=你的anon_public_key
# 或者使用：
# NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon_public_key

# Service Role Key（用于服务端 API，绕过 RLS）
# 支持两种命名方式，任选其一
NEXT_PUBLIC_SUPABASE_ROLE_KEY=你的service_role_secret_key
# 或者使用：
# SUPABASE_SERVICE_ROLE_KEY=你的service_role_secret_key
```

**获取方式**：
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择您的项目
3. 前往 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public key**
5. 复制 **service_role key**（⚠️ 注意保密，不要暴露在客户端代码中）

### 🌐 应用 URL 配置（必需）

```bash
# 生产环境：设置为您的 Vercel 部署 URL
NEXT_PUBLIC_BASE_URL=https://你的域名.vercel.app
```

**注意**：
- 如果使用自定义域名，使用自定义域名
- 如果不设置，系统会使用默认值（可能导致会议链接不正确）

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

### 2. 验证配置

部署完成后，检查环境变量是否正确加载：

**方法一：查看构建日志**
- 在 Vercel Dashboard > Deployments > 选择最新部署 > Build Logs
- 检查是否有 "Missing Supabase environment variables" 错误

**方法二：API 路由测试**
- 访问 `/api/meets` 端点
- 如果返回数据，说明 Supabase 配置正确

### 3. 常见问题排查

#### ❌ 错误：`Missing Supabase environment variables`

**原因**：环境变量未正确配置

**解决方案**：
1. 检查 Vercel Dashboard > Settings > Environment Variables
2. 确认以下变量已配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON` 或 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
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
   - 不要在前端代码中暴露 Service Role Key

## 📚 相关文档

- [Supabase 文档](https://supabase.com/docs)
- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js 环境变量文档](https://nextjs.org/docs/basic-features/environment-variables)
