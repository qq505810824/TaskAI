# TaskAI 2026-03-30 更新文档（简体中文）

最后更新：2026-03-30

本文件只记录今天已经落地并仍然生效的最终结果，不记录中途尝试、回滚过程或已放弃方案。

## 1. 今日更新总览

今天这轮更新，已经把 TaskAI 从“任务列表 + AI 对话”进一步推进成一条更完整的项目管理工作流，核心变化包括：

- Admin 后台新增并完善 `Project Management`
- Admin 后台新增并完善 `Prompt Management`
- 新增项目文档上传、自动摘要、AI 生成任务、发布到 Task Board 的完整链路
- RTC brainstorming 在启动时会自动带入项目背景、当前任务和项目任务概况
- Task Board 支持 `Board / Table` 两种视图，并更适合大量任务查找
- WhatsApp 任务发布通知补齐，并支持批量发布时聚合成单条消息
- TaskAI 与 WhatsApp 设置页相关时间显示统一为英文
- Prompt、Project、Task Generation、Context Snapshot、Version History 等数据库底座已补齐

本轮明确没有处理的范围：

- 旧 Dify 主流程重构
- transcribe 旧链路重构
- 旧 meeting / talk 页面的逐页 UI 重做
- 本机 OpenClaw WhatsApp assistant 那条独立 AI 对话线

## 2. 产品结构与主流程

### 2.1 Admin 导航结构

Admin 导航现在更贴合使用顺序：

- `Project Management`
- `Task Board`
- `Prompt Management`
- 其他 TaskAI 后台页

`/admin` 默认也已经改成进入 `Project Management`，不再先落到 `Task Board`。

### 2.2 Project-first 设计

当前系统已经是前后端一致的 `Project-first` 结构，项目容器现在使用独立表：

- `public.taskai_projects`

- `Project Name` 必填
- `Objective` 可选
- `Description` 可选

这表示现在可以只建一个项目，不填 objective，也能继续做下面这些事：

- 上传项目文档
- 自动生成项目文档摘要
- 用 AI 生成任务
- 发布任务到 Task Board
- 进入某一条任务的 AI brainstorming

### 2.3 当前主流程

当前完整工作流如下：

1. Admin 在 `Project Management` 创建 Project
2. Admin 上传 Project Document 或直接粘贴文本
3. 系统自动执行 `Project Document Summary Prompt`，生成一段可复用的文档摘要并存库
4. Admin 点击 `Generate Tasks`
5. 系统调用 `Generate Todos from Project & Objective`，根据项目名、可选 objective、项目说明和已选文档摘要生成候选任务
6. Admin 可手动编辑、删除、勾选候选任务，也可以继续 `Generate More Tasks` 或手动 `Add Task`
7. Admin 只发布勾选的任务到 Task Board
8. 发布时系统会把项目 / objective / 文档摘要快照写入 task context snapshot
9. 用户进入某一条任务的 AI workspace 时，RTC 启动前会自动把项目背景摘要、当前任务摘要、项目任务概况注入到 runtime prompt
10. 对话结束后，系统使用 `AI Chat Summary Prompt` 生成 summary 与 key points

## 3. 前端更新

### 3.1 Project Management

新增后台页面：

- `/admin/taskai/projects`

这个页面现在已经可以直接前端测试，包含以下能力：

- 创建 Project
- 左侧 Project 列表
- 左侧每个 Project 卡片右下角有垃圾桶 icon，可删除 project
- 选择某个 Project 后，在右侧查看该项目的 objective / description / documents / AI 生成任务
- 上传项目文档
- `Document Title` 会在选择文件后自动带入文件名，仍然允许手动修改
- 上传后自动执行摘要，不再需要手动点 summarize
- 已上传 document 可删除
- 文档卡片只显示更简洁的时间，不再显示复杂 metadata
- 生成任务
- 继续生成更多任务
- 手动新增一条候选任务
- 对 AI 生成出的每条任务：
  - 默认先只读显示
  - 点右上角铅笔图标后才进入编辑
  - 保存修改
  - 删除单条候选项
  - 单独勾选 / 取消勾选
- 支持 `Select All` / `Unselect All`
- 发布时可只发布已勾选的任务

### 3.2 Prompt Management

新增后台页面：

- `/admin/taskai/prompts`

当前最终 UI 已被收敛成更简洁的管理方式：

- 顶部 Search 已删除
- 顶部 Filter 已删除
- 顶部统计 chips 已删除
- 每条 prompt 默认折叠
- 默认只显示：
  - Prompt 标题
  - Prompt 用途描述
  - `Edit Prompt` 按钮
- 点开后才显示：
  - Prompt 编辑区
  - Readonly Runtime Prompt / User Prompt
  - Test Prompt
  - Version History

版本历史目前为真正可用功能，不是展示假数据：

- Save 会写入版本记录
- Reset to Default 会写入版本记录
- Rollback 会写入版本记录
- Version History 默认折叠，点开才看得到完整日志

### 3.3 Prompt 测试与预览

`Prompt Management` 现在支持对每条 prompt 做测试运行：

- 可以输入 sample runtime 参数
- 可以直接测试当前草稿，不需要先保存
- RTC 类 prompt 会直接显示最终拼接后的 runtime prompt
- ARK 结构化 prompt 会真正调用模型测试一次，并返回结果预览

其中 `Project Document Summary Prompt` 的测试区已经从纯文本框改成：

- 上传文档 box

前端会本地读取文件内容，再作为测试输入传给 preview 接口。

### 3.4 Task Board

Task Board 已经升级成更接近项目数据库视图的使用方式：

- 支持 `Board / Table` 切换
- Admin 默认进入 `Table`
- Member 默认进入 `Board`
- Member 切到 `Table` 后，也有 `Open` 按钮可查看详情
- Table 视图支持：
  - 搜索
  - 按 Status 筛选
  - 按 Project 筛选
  - 按 Type 筛选
  - 排序
- 任务行里会显示 Project、Status、Type、Category、Points、Assignee、Updated、Actions

同时这轮还补了几项 UI 细节：

- `In Progress` badge 强制单行显示
- 普通用户 Table 视图有 `Open`
- 那句 `A Notion-style task database view for searching, filtering, and scanning large task sets.` 已移除

### 3.5 Task 详情与 Workspace

Task detail / workspace 相关页面现在会显示或使用：

- Project 名称
- AI Summary
- Conversation records
- 自动注入的项目背景与任务上下文

### 3.6 my/settings 与 WhatsApp UI

`/my/settings` 里的 WhatsApp 区域也做了几项前端优化：

- `Not connected` 现在会保持单行
- WhatsApp 相关时间统一改成英文格式
- 不再出现 `上午 / 下午`

例如现在会显示成：

- `Requested at 3/30, 06:20 PM`
- `Last checked 06:22:15 PM`

## 4. Prompt 体系与当前用途

### 4.1 当前纳入管理的 Prompt

今天最终保留并纳入 Prompt Management 的核心 prompt 是 4 条：

1. `taskai_rtc_tutor_template`
2. `taskai_project_document_summary_prompt`
3. `taskai_generate_todos_from_project_and_objective`
4. `taskai_ai_chat_summary_prompt`

其中：

- `taskai_rtc_fallback` 已不再参与当前页面显示与运行时逻辑
- 当前 TaskAI 主流程不再依赖 fallback prompt

### 4.2 RTC Brainstorm Prompt

Key：

- `taskai_rtc_tutor_template`

后台显示名称：

- `RTC Brainstorm Prompt`

用途：

- 用户进入某一条 task 的 AI workspace，启动 RTC brainstorming 时使用

当前输入来源：

- `topic` = 当前 task title
- `description` = 当前 task description
- `projectDocumentSummary` = 当前项目下已保存的文档摘要
- `currentTaskSummary` = 当前正在讨论的 task 摘要
- `projectTaskOverview` = 同项目下的任务概况

当前 Readonly Runtime Prompt Composition 也已经和真实运行时保持一致，会明确显示：

- 项目背景摘要
- 该项目全部任务概况
- 当前正在讨论的任务
- 最后才接上可编辑的 RTC Brainstorm Prompt

这部分最前面还有一段 runtime instruction，明确要求 AI：

- 只能把项目背景和任务清单当成 supporting context
- 当前真正要聊的是当前 task
- 要始终围绕当前 task 和当前 topic 讨论

### 4.3 Project Document Summary Prompt

Key：

- `taskai_project_document_summary_prompt`

后台显示名称：

- `Project Document Summary Prompt`

用途：

- 文档上传后立即运行
- 把原始项目文档压缩成一段自然语言摘要
- 这段摘要后续会被用于：
  - 生成任务
  - RTC brainstorming 上下文

当前输出形式已经收敛成：

- 只返回一个 `summary`
- 不再强制拆成 `constraints / key_points / recommended_focus`

### 4.4 Generate Todos from Project & Objective

Key：

- `taskai_generate_todos_from_project_and_objective`

后台显示名称：

- `Generate Todos from Project & Objective`

用途：

- 根据 project、可选 objective、可选 description、已选文档摘要，生成候选任务

当前行为：

- `requestedTaskCount` 已从 Prompt Management 展示中移除
- 前端也不再让用户手填任务数量
- 系统会根据项目内容长度自动推算大致生成数量
- runtime 还会带入 `existingTaskTitles`，尽量避免生成重复任务

### 4.5 AI Chat Summary Prompt

Key：

- `taskai_ai_chat_summary_prompt`

后台显示名称：

- `AI Chat Summary Prompt`

用途：

- 用户和 AI 聊完之后，生成 summary 与 key points

当前运行方式：

- 由系统把 task title、task description、transcript、language 一起送给模型
- prompt 本身要求严格 JSON 输出

## 5. RTC 上下文与对话逻辑

### 5.1 现在 AI 会拿到什么背景

进入某条 task 的 RTC brainstorming 之前，系统现在会自动准备 3 段上下文：

- `projectDocumentSummary`
- `currentTaskSummary`
- `projectTaskOverview`

然后再把这些 runtime context prepend 到 `RTC Brainstorm Prompt` 前面。

### 5.2 各段上下文的意义

`projectDocumentSummary`

- 代表该项目上传文档经过摘要后的背景文本
- 它不再叫 `projectContextSummary`
- 现在这个名字更明确：它就是“项目文档摘要”

`currentTaskSummary`

- 表示当前这次 AI 对话正在围绕哪一项 task
- 不只是 task title，还会包含这条 task 的关键信息

`projectTaskOverview`

- 表示当前 project 下有哪些任务、整体任务概况如何
- 目的是让 AI 知道当前 task 在整个 project 里的位置

### 5.3 为什么这么设计

现在 RTC 对话不再只是单独拿 prompt 本体去聊，而是要让 AI 同时知道：

- 这个项目背景是什么
- 当前项目里已经有哪些任务
- 用户此刻正在和 AI 讨论的是哪一条任务

这样 brainstorming 才更贴近 project management，而不是无上下文的闲聊或 tutor 式问答。

## 6. 后端 API 与业务逻辑更新

### 6.1 Projects / Objectives

相关接口：

- `GET /api/taskai/orgs/[orgId]/projects`
- `POST /api/taskai/orgs/[orgId]/projects`
- `DELETE /api/taskai/orgs/[orgId]/projects/[projectId]`

当前业务逻辑：

- Project 底层直接承载在 `taskai_projects`
- `name` 为项目名
- `objective` 为可选项目目标
- `description` 为可选项目说明
- 目前 Project 删除会删除：
  - project documents
  - 已发布的相关 tasks
- 但不会删除 generation history

### 6.2 Context Documents

相关接口：

- `GET /api/taskai/orgs/[orgId]/context-documents`
- `POST /api/taskai/orgs/[orgId]/context-documents`
- `POST /api/taskai/orgs/[orgId]/context-documents/[documentId]/summarize`
- `DELETE /api/taskai/orgs/[orgId]/context-documents/[documentId]`

当前行为：

- 上传文档后立即写入 Supabase Storage
- 同时写入 `taskai_context_documents`
- 立即自动跑摘要
- 摘要结果写回：
  - `summary`
  - `summary_payload`
  - `summary_status`
- 如果该文档属于某个 project，上传时自动摘要与手动重跑摘要都会一致带入 `projectObjective`

这点今天已经特别修正，避免出现：

- 同一份文档上传时一版摘要
- 生成任务时补跑又是另一版摘要

### 6.3 AI Task Generation

相关接口：

- `GET /api/taskai/orgs/[orgId]/task-generation`
- `POST /api/taskai/orgs/[orgId]/task-generation`
- `POST /api/taskai/orgs/[orgId]/task-generation/[runId]/publish`
- `POST /api/taskai/orgs/[orgId]/task-generation/[runId]/items`
- `PATCH /api/taskai/orgs/[orgId]/task-generation/[runId]/items/[itemId]`
- `DELETE /api/taskai/orgs/[orgId]/task-generation/[runId]/items/[itemId]`

当前行为：

- 生成任务前，会检查并补齐所选 documents 的 summary
- 若某份文档尚未摘要，会先自动摘要
- 系统会收集该 project 历史生成项和已发布任务标题，作为 `existingTaskTitles` 注入给模型，尽量避免重复
- 生成结果先保存到 `taskai_task_generation_run_items`
- 用户可以继续生成更多任务，也可以手动新增一条候选任务

### 6.4 Publish 逻辑

发布接口：

- `POST /api/taskai/orgs/[orgId]/task-generation/[runId]/publish`

今天已升级的逻辑：

- 支持只发布勾选的候选任务
- 发布现在改成真正数据库 RPC：
  - `public.taskai_publish_generation_run(...)`
- insert tasks、insert snapshots、update run items、update run status 都在数据库函数里一次完成
- 这条线现在已经是事务化发布，不再是应用层多步写入

### 6.5 Task Context API

相关接口：

- `GET /api/taskai/tasks/[taskId]/context`

用途：

- 在进入某条 task 的 AI workspace 前，返回该 task 的 runtime context

当前返回内容：

- `projectDocumentSummary`
- `currentTaskSummary`
- `projectTaskOverview`

## 7. WhatsApp 相关更新

### 7.1 批量发布任务通知

之前如果从 `AI Task Generation -> Publish` 发布任务，不会自动发新任务通知。

今天已补齐这条线：

- 如果一次只发布 1 条任务：
  - 继续走单条新任务通知
- 如果一次发布多条任务：
  - 改成聚合成 1 条 WhatsApp 通知
  - 不会连续刷多条

### 7.2 通知非阻塞

今天还做了一个很重要的稳定性改动：

- 即使 WhatsApp 通知排队失败，已成功发布的 tasks 也不会一起被判失败

也就是说：

- 发布 task 是一件事
- 发 WhatsApp 是另一件事

现在通知失败不会拖累任务发布失败。

## 8. 数据库与存储变更

### 8.1 新增 SQL 文件

今天这轮对应的数据库 / 存储 SQL 文件包括：

- `docs/db/2026-03-30_add_taskai_prompt_templates.sql`
- `docs/db/2026-03-30_add_taskai_prompt_template_versions.sql`
- `docs/db/2026-03-30_add_taskai_objectives_documents_and_generation.sql`
- `docs/db/2026-03-30_create_taskai_context_docs_bucket.sql`
- `docs/db/2026-03-30_add_taskai_projects_and_project_relations.sql`
- `docs/db/2026-03-30_add_taskai_publish_generation_run_rpc.sql`
- `docs/db/2026-03-30_rename_taskai_prompt_keys_for_project_flow.sql`

### 8.2 新增数据表

本轮新增或启用的核心表包括：

- `taskai_prompt_templates`
- `taskai_prompt_template_versions`
- `taskai_projects`
- `taskai_context_documents`
- `taskai_task_generation_runs`
- `taskai_task_generation_run_documents`
- `taskai_task_generation_run_items`
- `taskai_task_context_snapshots`

### 8.3 存储 Bucket

项目文档上传使用：

- `SUPABASE_STORAGE_TASKAI_CONTEXT_DOC_BUCKET`

默认 bucket 名称：

- `taskai-context-docs`

### 8.4 约束与原则

这轮数据库更新仍然遵守你定下的规则：

- 不直接修改 `docs/db/taskai_v1_schema.sql`
- 所有 schema 变化都记录到新的 SQL 文件

## 9. 当前已生效的设计选择

这里记录几项今天已经确认过、目前按产品设计保留的行为：

### 9.1 Project Task Overview 保留 full picture

当前 `projectTaskOverview` 仍然会把同一 project 下的完整任务概况带给 AI。

这是当前有意保留的行为，不视为 bug。原因是你希望同项目成员能有 full picture，而不是只看到自己那条 task。

### 9.2 删除 Project 不删除 generation history

当前删除 project 时，不会删除对应的 generation runs / run items。

这也是当前有意保留的行为，不视为 bug。理由是保留 AI generation 历史，避免后台完全失去记录。

### 9.3 Project 现已独立成真实数据表

当前前端与后端都已经切到：

- `taskai_projects`

为了兼容旧资料，数据库里仍暂时保留：

- `objective_id`
- `objective_snapshot`

但新代码路径已优先使用：

- `project_id`
- `project_snapshot`

## 10. 当前状态与后续建议

### 10.1 当前状态

从今天已经落地的范围看，目前没有我认为必须立刻阻挡上线的严重 bug。

已特别补强的两条高优先级链路：

- Publish generated tasks 的半成功风险已缓解
- 文档上传后自动摘要与生成任务时补跑摘要的上下文不一致问题已修正

### 10.2 下一步最值得做的方向

如果进入下一阶段，我建议优先考虑：

1. 增加 `Project Workspace / Project Hub`，让成员查看一个项目的完整任务全貌
2. 让 AI chat summary 更深入回写为下一步行动项或建议 subtasks
3. 后续如果需要更强一致性，再把部分高频写操作继续收敛成更多数据库 RPC

## 11. 相关文档

今天这份总文档以外，相关专题文档还包括：

- `/Users/bobbylian/Documents/TaskAI/docs/taskai-prompt-management.md`
- `/Users/bobbylian/Documents/TaskAI/docs/taskai-objective-doc-generation-v1.md`
- `/Users/bobbylian/Documents/TaskAI/docs/project-updates-2026-03-30.md`

这份简体中文文档适合直接给内部同事、工程师或产品方快速确认今天的最终更新范围。
