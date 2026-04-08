# TaskAI 2026-04-08 更新说明

本文只记录 2026-04-08 这轮已经落地的最终状态，不记录中间尝试过程。本文重点覆盖认证登录、Superadmin 用户管理、首页与登录流程、任务面板细节优化，以及当前已确认的限制。

## 一、总体概览

本轮更新主要完成了以下几条线：

1. 新增 Google OAuth 登录，并接入现有 Supabase Auth + `public.users` 同步逻辑。
2. 新增独立的 Superadmin 用户管理页，用于查看全部用户、切换 `admin/user`、直接重置密码、软删除与恢复账号、查看最近登录时间、按组织筛选。
3. 优化登录入口与首页：
   - `/` 改为简单 Landing Page
   - `/login` 作为主要登录入口
   - `/join` 对未登录用户会先跳转登录
   - 登录用户访问 `/login` 时会自动跳走
   - 首页会根据登录状态显示不同入口按钮
4. 补齐邮件认证相关流程：
   - 注册后发送验证邮件
   - Forgot password 发送重置密码邮件
   - 邮件发送改为服务器端 SMTP 发信
5. 收紧后台访问权限：
   - 只有 `admin` 可以进入 `/admin`
   - Header 仅对 `admin` 显示 `Admin Console` 入口
6. 优化 Task Board Table View，移除描述预览，只保留任务名称。
7. 修复 Superadmin 用户页的多个问题，包括 React `key` warning、远程头像渲染错误，以及软删除按钮无效。

## 二、认证与登录系统更新

### 2.1 Google OAuth 登录

系统现已支持 Google OAuth 登录，登录入口已接入：

- 登录页  
  [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/login/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/login/page.tsx)
- 注册页  
  [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/register/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/register/page.tsx)

核心认证逻辑位于：

- Auth Context  
  [/Users/bobbylian/Documents/TaskAI/src/contexts/AuthContext.tsx](/Users/bobbylian/Documents/TaskAI/src/contexts/AuthContext.tsx)

现在 `AuthContext` 中已经有：

- `login(email, password)`
- `register(username, email, password)`
- `loginWithGoogle(redirectTo?)`
- `logout()`

Google 登录完成后，会回到：

- OAuth callback 页面  
  [/Users/bobbylian/Documents/TaskAI/src/app/auth/callback/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/auth/callback/page.tsx)

该页面会负责：

1. 获取 Supabase session
2. 将 Google 登录用户同步到 `public.users`
3. 同步 `name`、`avatar_url`
4. 根据 URL 参数决定最终跳转目标

### 2.2 `public.users` 同步逻辑更新

用户同步 API 位于：

- [/Users/bobbylian/Documents/TaskAI/src/app/api/auth/sync-user/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/auth/sync-user/route.ts)

本轮已确认以下行为：

1. 首次同步用户时，默认 `role = 'user'`
2. 已存在用户再次同步时，不会把原有 `admin` 角色覆盖回 `user`
3. 会同步平台信息、显示名与头像

这样可以避免：

- Google 登录后把原本已经是 `admin` 的账号错误降级

### 2.3 注册改成“先验证邮箱，再登录”

注册逻辑不再直接在前端调用 `supabase.auth.signUp()` 后就把用户带进系统，而是改成：

1. 前端注册页提交到服务端注册 API
2. 服务端使用 Supabase Admin 生成 email verification link
3. 服务器通过 SMTP 发送验证邮件
4. 用户点击验证邮件中的链接
5. 回到 `/auth/callback`
6. callback 完成同步后立即登出，并跳转回 `/login?verified=1`
7. 用户此时再正常登录

相关文件：

- 注册 API  
  [/Users/bobbylian/Documents/TaskAI/src/app/api/auth/register/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/auth/register/route.ts)
- 注册页  
  [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/register/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/register/page.tsx)
- OAuth callback  
  [/Users/bobbylian/Documents/TaskAI/src/app/auth/callback/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/auth/callback/page.tsx)

注册成功后的前端体验现在是：

- 页面显示 `Check your email`
- 提示用户先去邮箱验证
- 不会直接自动进入系统

### 2.4 Forgot Password 改成服务器端发信

忘记密码页现在不再直接前端调用 Supabase 默认邮件，而是改成：

1. 前端调用 `/api/auth/forgot-password`
2. 服务端通过 Supabase Admin 生成 recovery link
3. 使用 SMTP 发送重置密码邮件
4. 用户点击链接进入 `/reset-password`
5. 前端调用 `supabase.auth.updateUser({ password })` 完成密码更新

相关文件：

- Forgot Password API  
  [/Users/bobbylian/Documents/TaskAI/src/app/api/auth/forgot-password/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/auth/forgot-password/route.ts)
- Forgot Password 页面  
  [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/forgot-password/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/forgot-password/page.tsx)
- Reset Password 页面  
  [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/reset-password/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/reset-password/page.tsx)

### 2.5 SMTP 发信能力

本轮新增了邮件发送工具：

- Mailer  
  [/Users/bobbylian/Documents/TaskAI/src/lib/mailer.ts](/Users/bobbylian/Documents/TaskAI/src/lib/mailer.ts)
- 邮件模板  
  [/Users/bobbylian/Documents/TaskAI/src/lib/auth-email.ts](/Users/bobbylian/Documents/TaskAI/src/lib/auth-email.ts)

`.env.example` 也新增了邮件相关环境变量：

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `SMTP_AUTHENTICATION`
- `SMTP_ENABLE_STARTTLS_AUTO`
- `MAILER_FROM`

文件：

- [/Users/bobbylian/Documents/TaskAI/.env.example](/Users/bobbylian/Documents/TaskAI/.env.example)

### 2.6 注册邮件发送失败时的回滚保护

注册验证邮件的服务端逻辑已加上回滚：

- 如果 Supabase 已生成 signup link
- 但 SMTP 发信失败
- 系统会立即删除刚创建的 Supabase Auth user

这样可以避免出现：

- 用户其实没收到验证邮件
- 但系统里已经留下一个半残的未验证账号
- 用户再次尝试注册时被提示“邮箱已存在”

该保护逻辑位于：

- [/Users/bobbylian/Documents/TaskAI/src/app/api/auth/register/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/auth/register/route.ts)

## 三、Superadmin 用户管理

### 3.1 新增独立的 Superadmin 用户页

用户管理不再放在普通 admin 后台中，而是独立放到：

- [/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx)

访问地址：

- `/superadmin/users`

该页面仅供 Superadmin 使用，不作为普通 admin 后台 tab 展示。

### 3.2 权限模型

目前系统存在两层角色：

1. 全站角色：`admin` / `user`
2. 隐藏的 Superadmin 权限：通过环境变量白名单控制
3. 组织内角色：`owner` / `member`

当前权限定义如下：

- `superadmin`
  - 不是数据库里的单独 role
  - 由 `SUPERADMIN_EMAILS` 白名单控制
  - 仅可访问 `/superadmin/users`
  - 可管理所有用户、切换 `admin/user`、重置密码、软删除与恢复账号

- `admin`
  - 对应 `public.users.role = 'admin'`
  - 可以访问 `/admin`
  - 可以使用后台管理 UI
  - Header 会显示 `Admin Console` 按钮

- `user`
  - 对应 `public.users.role = 'user'`
  - 不能访问 `/admin`
  - Header 不显示 `Admin Console`
  - 主要使用前台任务执行与 AI 协作功能

- `owner/member`
  - 这是 `organization_memberships.role`
  - 表示用户在某个 organization 内的权限
  - `owner` 才能操作很多 org 级 TaskAI 管理接口

因此，当前系统是两层并行权限模型：

1. **全站后台权限**：`superadmin / admin / user`
2. **组织内权限**：`owner / member`

Superadmin 识别逻辑位于：

- [/Users/bobbylian/Documents/TaskAI/src/lib/taskai/api-auth.ts](/Users/bobbylian/Documents/TaskAI/src/lib/taskai/api-auth.ts)

使用环境变量：

- `SUPERADMIN_EMAILS`

本地目前已设置：

- `admin@docai.net`

### 3.2.1 `/admin` 的访问限制

本轮已将 `/admin` 前端入口正式收紧：

1. 未登录用户访问 `/admin`
   - 会跳转到 `/login?redirect=/admin`
2. 已登录但 `role !== 'admin'` 的用户访问 `/admin`
   - 会被转去 `/taskai/tasks`
3. 只有 `public.users.role = 'admin'` 的账号可以继续进入后台

该限制加在 admin layout 上，因此整个 `/admin` 路由树都共享这一层保护。

对应文件：

- [/Users/bobbylian/Documents/TaskAI/src/app/(admin)/admin/layout.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(admin)/admin/layout.tsx)

### 3.3 Superadmin 页功能

当前 `/superadmin/users` 已支持：

1. 查看所有用户
2. 查看用户：
   - name
   - email
   - role
   - organizations
   - last sign in
3. 搜索用户
4. 按 organization 过滤
5. 直接切换 `admin / user`
6. 直接设置新密码
7. `Delete` 用户
8. `Restore access`

对应 API：

- 用户列表 API  
  [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts)
- 单用户更新 API  
  [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts)

### 3.4 删除用户的实际逻辑

这里的 `Delete` 不是物理删除，而是软删除。

实际行为：

1. 将用户标记为 inactive
2. 默认不在主用户列表中显示
3. 用户会被挡在登录后续流程之外
4. Superadmin 可以在 `Removed users` 区块里恢复账号

当前 inactive 标记放在：

- `users.meta.superadmin.is_active = false`

同时，认证守卫和 `AuthContext` 都已经接入这条判断：

- 已被停用的用户，不能继续正常使用系统

相关文件：

- [/Users/bobbylian/Documents/TaskAI/src/lib/taskai/api-auth.ts](/Users/bobbylian/Documents/TaskAI/src/lib/taskai/api-auth.ts)
- [/Users/bobbylian/Documents/TaskAI/src/contexts/AuthContext.tsx](/Users/bobbylian/Documents/TaskAI/src/contexts/AuthContext.tsx)

### 3.5 最近登录时间

Superadmin 页现在会显示 `Last Sign In`。

实现方式：

1. 从 `public.users` 取基础资料
2. 另外通过 `supabase.auth.admin.listUsers()` 取 auth 侧 `last_sign_in_at`
3. 合并后回给前端

位置：

- [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts)

### 3.6 组织过滤

Superadmin 用户页顶部现在支持：

- `All organizations`
- 选定某个 organization 后只看其成员

这一层也是由用户列表 API 侧合并 `organization_memberships` 与 `organizations` 数据后提供。

### 3.7 Superadmin 页后续修复

本轮又补了两个和 Superadmin 用户页直接相关的修复：

1. 修复 Google 头像导致页面打不开
   - 原因是 `next/image` 未配置 `lh3.googleusercontent.com`
   - 当前页面改为使用普通 `<img>` 渲染头像，避免远程域名白名单报错

2. 修复 `Delete` 用户按钮无效
   - 原因是后端 `PATCH` 先判断了 `role/password`，导致 `{ isActive: false }` 被当成“Nothing to update”
   - 现在后端已把 `isActive` 视为合法更新项

相关文件：

- [/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx)
- [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts)

## 四、首页、登录入口与 Join 流程

### 4.1 首页改为 Landing Page

首页 `/` 不再默认显示 `Join the team`。

现在 `/` 是简单 Landing Page：

- 文件  
  [/Users/bobbylian/Documents/TaskAI/src/app/(main)/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(main)/page.tsx)

### 4.2 登录入口

首页右上角 `Login` 会前往：

- `/login`

另外，本轮已补充首页按登录状态显示入口按钮：

- 未登录用户：
  - 只显示 `Login`
- 已登录普通用户：
  - 显示 `Open Task Board`
- 已登录 admin：
  - 显示 `Open Task Board`
  - 显示 `Admin Console`

对应文件：

- [/Users/bobbylian/Documents/TaskAI/src/app/(main)/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(main)/page.tsx)

### 4.2.1 Header 的 Admin Console 入口

Header 现在会根据登录用户角色显示入口：

- `admin`：显示 `Admin Console`
- `user`：不显示

对应文件：

- [/Users/bobbylian/Documents/TaskAI/src/components/layout/Header.tsx](/Users/bobbylian/Documents/TaskAI/src/components/layout/Header.tsx)

### 4.3 Join 页面

Join 页面保留，但未登录用户不会先看到邀请码表单，而是先跳去登录：

- 文件  
  [/Users/bobbylian/Documents/TaskAI/src/app/(main)/join/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(main)/join/page.tsx)

这样现在的入口逻辑变成：

1. 未登录用户先走 `/login`
2. 登录成功后再去后续页面
3. 不再把 `Join the team` 当成默认首页

### 4.4 已登录用户访问 `/login` 时的跳转

现在如果用户已经登录，再访问 `/login`：

- 不会再停在登录页
- 会自动跳回：
  - `redirect` 参数指定的页面
  - 如果没有 `redirect`，就回首页 `/`

对应文件：

- [/Users/bobbylian/Documents/TaskAI/src/app/(auth)/login/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(auth)/login/page.tsx)

## 五、Task Board Table View 优化

### 5.1 Table View 只显示任务名称

Task Board 的 Table View 现在在 `Task` 列只显示任务名称，不再显示 description preview。

对应文件：

- [/Users/bobbylian/Documents/TaskAI/src/components/taskai/TaskBoardDatabaseView.tsx](/Users/bobbylian/Documents/TaskAI/src/components/taskai/TaskBoardDatabaseView.tsx)

这样可以让表格视图更像数据库表，减少视觉噪音。

## 六、Bug 修复

### 6.1 修复 Superadmin 用户页的 React key warning

问题现象：

- `/superadmin/users` 页面会报：
  - `Each child in a list should have a unique "key" prop.`

根因：

- 同一个用户在同一个 organization 下，可能因为 membership 数据有多条状态记录，导致前端渲染 organization badge 时出现重复 key。

修复方式：

- 在用户列表 API 侧对 organization membership 做去重
- 若同一 org 有多条记录，优先保留 `active`

修复位置：

- [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/route.ts)

### 6.2 修复 Superadmin 用户页 Google 头像 runtime error

问题现象：

- `/superadmin/users` 页面在渲染 Google 头像时，因 `next/image` 的远程域名限制而报 runtime error

修复方式：

- 将该页面的头像渲染改为普通 `<img>`

修复位置：

- [/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx](/Users/bobbylian/Documents/TaskAI/src/app/(admin)/superadmin/users/page.tsx)

### 6.3 修复 Superadmin 软删除用户无效

问题现象：

- 点击 `Delete` 后，用户无法被移出 active list

根因：

- 后端 `PATCH` 路由在处理 `{ isActive: false }` 前，先因为没有 `role/password` 而返回 `Nothing to update`

修复方式：

- 将 `isActive` 纳入合法更新项判断

修复位置：

- [/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts](/Users/bobbylian/Documents/TaskAI/src/app/api/superadmin/users/[userId]/route.ts)

## 七、今天没有新增数据库表结构变更

本轮更新主要集中在：

- Auth 流程
- Superadmin 页面与 API
- 前端登录/首页/任务表格体验

**今天没有新增新的数据库 migration SQL 文件。**

当前这轮对数据层的改动属于：

- 继续复用现有 `public.users`
- 继续复用 Supabase Auth
- 在 `users.meta` 中使用已有 JSON 字段保存 Superadmin 的 active/inactive 元信息

## 八、环境变量与部署说明

### 8.1 新增/依赖的环境变量

本轮依赖以下环境变量：

#### Superadmin

- `SUPERADMIN_EMAILS`

#### SMTP

- `SMTP_ADDRESS`
- `SMTP_PORT`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `SMTP_DOMAIN`
- `SMTP_AUTHENTICATION`
- `SMTP_ENABLE_STARTTLS_AUTO`
- `MAILER_FROM`

### 8.2 生产环境要同步配置

如果要让线上 Vercel 一样工作，以上环境变量也需要同步配置到：

- Vercel Production

尤其是：

- `SUPERADMIN_EMAILS`
- `SMTP_*`
- `MAILER_FROM`

## 九、当前已确认的限制

### 9.1 代码已经接好，但本机当前连不到 Gmail SMTP

本地自测结果表明：

- 当前这台机器连接 `smtp.gmail.com:587` 会出现：
  - `ETIMEDOUT`
  - `EHOSTUNREACH`

这意味着：

1. **代码逻辑已经接好**
2. `TypeScript` 与 `ESLint` 已通过
3. 但本机当前网络环境下，实际无法把邮件发出去

因此当前状态是：

- 注册验证邮件：代码可运行，但本机发信被网络挡住
- Forgot password 邮件：代码可运行，但本机发信被网络挡住

为避免用户看到底层 socket 错误，API 已做了统一友好提示：

- 注册邮件发送失败时，会返回友好错误
- Forgot password 发信失败时，也会返回友好错误

### 9.2 本机 SMTP 出站问题不代表代码结构错误

目前可以确认：

- 功能代码已完成
- 页面逻辑已对齐
- 账号回滚保护已加

当前阻塞点是：

- 这台机器对 Gmail SMTP 587 的出站网络连通性

## 十、已完成的检查

本轮我已经实际做过这些检查：

1. `npx tsc --noEmit` 通过
2. 相关 ESLint 通过
3. Superadmin 用户页 key warning 已修复
4. Superadmin 用户页 Google 头像 runtime error 已修复
5. Superadmin 用户软删除已可正常使用
6. `/admin` 访问限制与 Header admin 入口已验证通过
7. 注册失败时未验证账号会回滚，不会残留半残账号
8. Forgot password 失败时会返回友好错误

## 十一、建议的下一步

如果你接下来要把这套真正上线并可用，我建议优先做这两件事：

1. 确认生产环境能正常访问 Gmail SMTP，或改为使用 Supabase 的官方自定义 SMTP 配置路径
2. 将本轮环境变量同步到 Vercel，并做一次真实的注册验证邮件与 forgot password 邮件 smoke test

---

如需，我下一步可以继续补一份：

- 面向工程师的部署清单
- 或把这份文档再压缩成一版简短交接说明
