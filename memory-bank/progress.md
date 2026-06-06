# Progress

This file tracks the project's progress using a task list format.
2026-05-12 14:04:38 - Log of updates made.

## Completed Tasks

- 2026-05-12 14:04:38 - Memory Bank 初始化完成
- 2026-05-14 11:07 - 工作区全局问题面板架构设计完成
- 2026-05-14 13:37 - 工作区全局问题面板全部实现完成，`bun typecheck` 通过
- 2026-05-14 14:39 - 最终交付校验完成：还原 `use-chat-runtime.ts`、`strategy-chat-panel.tsx`，清理 `embed-session.tsx` 中遗留无效 `modelInfo`，`packages/strategy-front` 下 `bun typecheck` 通过
- 2026-05-14 15:15 - 工作区问题记录迁移完成：后端改为 `strategy-service` 管理 `~/.strategy-service/questions.json`，前端切换为 `/api/question`，`packages/strategy-front` 下 `bun typecheck` 通过
- 2026-05-15 10:30 - 删除 [`event-bus.ts`](packages/strategy-front/src/lib/event-bus.ts) 并在 [`packages/strategy-front`](packages/strategy-front) 执行 `bun typecheck`，验证通过
- 2026-05-15 10:44 - 在 [`packages/strategy-front`](packages/strategy-front) 执行 `bun typecheck` 验证，`tsc -b` 退出码 0
- 2026-05-15 11:06 - 修复工作区问题列表展示：移除“未命名会话”，并由后端统一写入问题记录时间；`packages/strategy-front` 下 `bun typecheck` 通过
- 2026-05-15 11:24 - 精简问题记录模型：移除未使用的 `Version` 字段，并在 [`packages/strategy-service`](packages/strategy-service) 执行 `go test ./...` 通过
- 2026-05-15 12:03 - 继续精简问题记录模型：移除前后端 `sessionTitle` 字段，仅按问题文本搜索；前后端校验通过
- 2026-05-19 09:32:22 - 完成 `/app/embed/session` 左侧全局总结浮窗架构设计，明确采用 hidden child session 避免总结会话进入会话列表

## Current Tasks

- Strategy Service（Go 后端）开发 — 基于 Wails + Gin 框架
- Strategy Front（React 前端）开发 — Vite + Redux + Monaco Editor
- AI Proxy Go 服务架构规划

## Next Steps

- 明确 Strategy Service 与核心 OpenCode 的集成边界
- 完善 AI Proxy Go 服务设计文档
- 建立跨包的共享类型和 API 契约
- 2026-05-19 09:32:22 - 按 [`embed-session-summary-floating-window-design.md`](memory-bank/embed-session-summary-floating-window-design.md) 实现 `strategy-service` summary API、前端 summary hook 与左侧浮窗，并验证总结 child session 不进入 root 会话列表

* [2026-05-19 09:51:52] - 完成 summary 后端 API、前端左侧浮窗、自动触发 hook 与 parentID 会话列表过滤；bun typecheck 与 go test ./... 均通过

* [2026-05-19 10:00:10] - 修复 summary API 返回 HTML 解析错误的问题；重新执行 strategy-service go test ./... 与 strategy-front bun typecheck 均通过

* [2026-05-19 10:10:29] - 完成父会话内容总结修复与 **summary** 列表过滤修复；strategy-service go test ./... 与 strategy-front bun typecheck 均通过

* [2026-05-19 10:37:16] - 完成问题悬浮入口高度对齐；strategy-front bun typecheck 通过
* [2026-05-19 10:41:14] - 完成打开代码区时隐藏会话总结浮窗；strategy-front bun typecheck 通过
* [2026-05-19 13:56:17] - 完成 LLM 错误时阻止会话总结自动触发；strategy-front bun typecheck 通过
* [2026-05-19 14:31:57] - 完成长会话总结触发条件修正；strategy-front bun typecheck 通过
* [2026-05-20 09:10:50] - 完成会话总结默认悬浮图标入口改造；运行 strategy-front bun typecheck 时被既有 sessionLoading/loading 类型错误阻塞，非本次改动引入
* [2026-05-20 09:50:40] - 完成会话总结打断按钮、前端 stop hook/API 与后端 summary stop 路由；strategy-service go test ./... 通过，strategy-front bun typecheck 仍被既有 sessionLoading/loading 类型错误阻塞

* [2026-05-20 10:04:38] - ��� useStrategySession status ���� selectSessionStatus ������packages/strategy-front �� bun typecheck ͨ��

* [2026-05-20 10:25:10] - ��ɻỰ�ܽ��¼�����ǰ��չʾ���룻packages/strategy-front bun typecheck �Ա����� sessionLoading/loading ���ʹ�������

* [2026-05-20 10:29:45] - ��ɻỰ�ܽ��¼�����ˢ�¸��죬�Ƴ�����̬�̶���ѯ��packages/strategy-front bun typecheck �Ա����� sessionLoading/loading ���ʹ�������
* [2026-05-20 11:00:45] - 完成会话总结打断消息过滤：useSessionSummary 在最后一条 assistant 消息为 MessageAbortedError 时跳过自动 run；packages/strategy-front bun typecheck 仍被既有 sessionLoading/loading 类型错误阻塞
* [2026-05-20 11:25:47] - 完成会话总结空消息保护：input.messages 为空时跳过自动 run；packages/strategy-front bun typecheck 仍被既有 sessionLoading/loading 类型错误阻塞
* [2026-05-20 11:28:05] - 完成会话总结打断判断位置调整：last 消息只在 count 非 0 后读取；packages/strategy-front bun typecheck 仍被既有 sessionLoading/loading 类型错误阻塞
* [2026-05-20 13:44:14] - 完成 [`/app/embed/session`](packages/strategy-front/src/pages/embed-session.tsx:37) 全局链式模型选择方案设计，产出 [`embed-session-model-chain-design.md`](memory-bank/embed-session-model-chain-design.md)
* [2026-05-20 13:56:55] - 完成嵌入会话全局链式模型选择实现与类型校验；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-20 14:42:24] - 完成模型链后端 JSON 持久化、事件监听自动切换与前端保存/发送接入；[`packages/strategy-service`](packages/strategy-service) 下 `go test ./...` 通过，[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-20 14:48:06] - 移除模型链“设为当前”按钮，链路第一位即当前模型；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-20 15:51:42] - 完成模型链 prompt 兼容修复：[`modelchain.Prompt`](packages/strategy-service/internal/modelchain/model.go:15) 保留 model 字段，后端 [`modelchain.Service.Prompt()`](packages/strategy-service/internal/modelchain/service.go:49) 在 req.model 为空时回退到 chain 首位模型；[`packages/strategy-service`](packages/strategy-service) 下 [`go test ./...`](packages/strategy-service/go.mod) 通过
* [2026-05-20 20:48:39] - 完成会话总结模型链接入：summary prompt 不再依赖请求模型字段，改从后端模型链 cfg.Chain 首位取模型；packages/strategy-service 下 go test ./... 通过
* [2026-05-20 20:50:41] - 完成会话总结模型链失败重试能力：按 cfg.Chain 顺序尝试其他模型，直到获得非空总结或返回最后错误；packages/strategy-service 下 go test ./... 通过
* [2026-05-20 21:04:47] - 完成 use-chat-runtime workspacePath 类型收窄修复，并清理相关未使用符号；packages/strategy-front 下 bun typecheck 通过
* [2026-05-20 21:55:17] - 完成 model-chain 存储 Windows 覆盖保存修复，避免 model-chain.json.tmp rename 被占用导致 API 返回错误；packages/strategy-service 下 go test ./... 通过
* [2026-05-20 22:42:51] - 完成模型链中间层事件监听改造：`/opencode/event` 代理流继续转给前端，同时旁路投递给 [`modelchain.Service.Event()`](packages/strategy-service/internal/modelchain/service.go:91) 触发故障切换；packages/strategy-service 下 go test ./... 通过
* [2026-05-20 23:15:54] - 完成会话总结 hook 简化：[`useSessionSummary()`](packages/strategy-front/src/hooks/use-session-summary.ts:24) 首次只查询一次，生成后等待 hidden summary session status 进入 idle 再查询结果；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 被既有 [`StrictMode`](packages/strategy-front/src/main.tsx:1) 未使用错误阻塞
* [2026-05-21 08:54:48] - 完成会话总结自动触发条件修正：仅在 input.busy true->false 时触发 run；packages/strategy-front bun typecheck 仍被既有 src/main.tsx StrictMode 未使用错误阻塞
* [2026-05-21 10:00:56] - �޸� selectSessionAbort ȱʧ�������⣬��׼��ִ�� packages/strategy-front bun typecheck ��֤
* [2026-05-21 10:19:00] - ��� modelchain session.status retry ��������޸���packages/strategy-service �� go test ./... ͨ��
* [2026-05-21 10:47:30] - 完成模型链 fail fallback 修复：先 abort 当前 session，再切换到下一模型发送继续；packages/strategy-service 下 go test ./... 通过
* [2026-05-24 18:56:18] - 完成链式模型优先级列表滚动限制：[`embed-provider-settings-dialog.tsx`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx) 排序区域超出最大高度后显示纵向滚动条
* [2026-05-24 18:59:21] - 完成模型目录分组列表滚动限制：[`CardContent`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:594) 超出最大高度后显示纵向滚动条
* [2026-05-24 19:03:51] - 完成链式模型优先级最多 10 个的架构设计，建议前后端同时限制并在 UI 中展示上限说明
* [2026-05-24 19:07:21] - 完成链式模型优先级 10 个上限代码实现：前端归一化/自动排序/读取旧数据均裁剪，后端 clean 存储入口限制为 10 个
* [2026-05-24 19:21:44] - 完成嵌入会话去除输入区 agent/model 选择的影响面分析：确认应移除嵌入页 agent/model 偏好参与发送，仅保留链式模型与 variant 设置
* [2026-05-24 19:34:25] - 更新为通用化方案：全局移除 [`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:41) / [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 的 agent/model 输入能力，链式模型作为后续统一能力
* [2026-05-24 21:08:01] - 完成通用链式模型入口改造第一阶段：移除聊天输入区 agent/model 选择和发送透传，清理 [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:39) 的 model/onModel props，并在 [`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-24 21:32:34] - 完成前端 variant 去除：对话框输入链路与创建工作区首条 prompt 不再发送 variant，设置弹窗删除变体选择，并在 [`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-24 21:49:23] - 完成 composer 偏好代码删除：移除 `useComposer`、`useComposerPrefs`、`ComposerProvider`、`ComposerSettingsDialog`、`chat-composer`，精简 [`use-workspace-create.ts`](packages/strategy-front/src/hooks/use-workspace-create.ts:1) 与 shell 包裹，并通过搜索确认无引用残留
* [2026-05-26 10:31:07] - 完成聊天事件消息/part 渲染问题分析：确认 `message.updated` 写入消息时间线、`message.part.updated` 写入按 messageID 分组的 parts，建议 UI 以 message 为外层、parts 为内层渲染，并修复新消息 upsert 丢失问题
* [2026-05-26 10:59:35] - 完成聊天消息不可见问题修复：[`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:265) 改为 upsert，错误事件写入 [`runErrs`](packages/strategy-front/src/lib/chat-event-reducer.ts:33) / [`eventErrs`](packages/strategy-front/src/lib/chat-event-reducer.ts:36)，[`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 恢复错误卡片渲染
* [2026-05-26 11:22:00] - 完成聊天错误渲染收敛：移除 [`ChatMessageList`](packages/strategy-front/src/components/chat-message-list.tsx:615) 的会话级 `err` 展示与 per-message `runErrs` fallback，改为只展示 [`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:270) 的 `info.error`；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-05-26 13:44:00] - 完成 [`packages/strategy-service`](packages/strategy-service) 客户本地 SQLite 数据库集成调整：从 KV 存储改为 [`config`](packages/strategy-service/internal/db/store.go:86)、[`workspaces`](packages/strategy-service/internal/db/store.go:93)、[`questions`](packages/strategy-service/internal/db/store.go:106)、[`summaries`](packages/strategy-service/internal/db/store.go:115)、[`model_chain`](packages/strategy-service/internal/db/store.go:128) 专用表，删除旧 JSON 兼容读取/迁移，已在 [`packages/strategy-service`](packages/strategy-service) 下执行 [`go test ./...`](packages/strategy-service/go.mod:1) 通过
* [2026-06-06 11:52:46] - 完成 workbench 会话 hook 收敛：将 [`useWorkbenchSession()`](packages/strategy-front/src/components/workbench/hooks/use-workbench-modal.ts:61) 合并导出到 [`use-workbench-modal.ts`](packages/strategy-front/src/components/workbench/hooks/use-workbench-modal.ts)，删除冗余 [`use-workbench-session.ts`](packages/strategy-front/src/components/workbench/hooks/use-workbench-session.ts)，并在 [`packages/strategy-front`](packages/strategy-front) 下执行 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-06-06 11:58:36] - 完成 workbench 会话同步职责上移：[`useWorkbenchSessionSync()`](packages/strategy-front/src/components/workbench/hooks/use-workbench-session-sync.ts:49) 改由 [`Workbench`](packages/strategy-front/src/components/workbench/workbench.tsx:10) 根组件调用，避免会话列表 hook 承担事件监听副作用；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-06-06 12:02:49] - 完成 workbench 弹窗与会话操作 hook 合并：删除 [`useWorkbenchSession()`](packages/strategy-front/src/components/workbench/hooks/use-workbench-modal.ts:60) 独立导出，改为 [`useWorkbenchModal()`](packages/strategy-front/src/components/workbench/hooks/use-workbench-modal.ts:60) 返回会话列表、激活、创建、重命名、删除与弹窗状态；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-06-06 12:15:55] - 完成新建会话 UI 联动清理：移除 [`Side`](packages/strategy-front/src/components/workbench/features/side/side.tsx:17) / [`SessionsTab`](packages/strategy-front/src/components/workbench/features/side/sessions-tab.tsx:52) / [`useWorkbenchModal()`](packages/strategy-front/src/components/workbench/hooks/use-workbench-modal.ts:60) 的 `onCreate` 透传，新建会话后不再自动打开右侧 [`Review`](packages/strategy-front/src/components/workbench/workbench.tsx:46) 面板或切回需求 tab；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
* [2026-06-06 13:12:19] - 完成 workbench 会话编辑/删除弹框与列表 UI 优化：编辑/删除均改用自定义确认弹框，移除浏览器原生 prompt/confirm；[`packages/strategy-front`](packages/strategy-front) 下 [`bun typecheck`](packages/strategy-front/package.json) 通过
