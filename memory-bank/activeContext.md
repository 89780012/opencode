# Active Context

This file tracks the project's current status, including recent changes, current goals, and open questions.
YYYY-MM-DD HH:MM:SS - Log of updates made.

---

## Current Focus

- Stabilize workspace question panel behavior and simplify question record persistence model
- 2026-05-19 09:31:56 - 设计 `/app/embed/session` 左侧全局总结浮窗：采用隐藏 child session 生成总结，并由 strategy-service 独立持久化，避免总结会话出现在 root 会话列表

## Recent Changes

- 2026-05-14 11:06 - Analyzed strategy-front and strategy-service codebase for workspace-level question history feature
- 2026-05-14 13:33 - Finalized: minimal approach — only `embed-session.tsx` changed; `use-chat-runtime.ts` and `strategy-chat-panel.tsx` restored to original (zero changes to existing components)
- 2026-05-14 14:39 - 执行交付校验：已用 git restore 还原 `use-chat-runtime.ts` 与 `strategy-chat-panel.tsx`，并修复 `embed-session.tsx` 中遗留的 `modelInfo` 无效传参与未使用变量，`bun typecheck` 再次通过
- 2026-05-14 15:15 - 将工作区问题记录改为由 strategy-service 统一管理，新增 `/api/question` 读写接口，并将前端 `use-workspace-questions` 切换为直接调用服务端 API
- 2026-05-15 10:21 - 在 `packages/strategy-front` 执行 `bun typecheck` 验证，`tsc -b` 成功通过，未发现类型错误
- 2026-05-15 10:30 - 删除已废弃的 [`event-bus.ts`](packages/strategy-front/src/lib/event-bus.ts)，并在 [`packages/strategy-front`](packages/strategy-front) 重新执行 `bun typecheck`，验证通过
- 2026-05-15 10:44 - 再次在 [`packages/strategy-front`](packages/strategy-front) 运行 `bun typecheck`，`tsc -b` 退出码 0，类型检查通过
- 2026-05-15 11:06 - 调整 [`workspace-questions-panel.tsx`](packages/strategy-front/src/components/chat/workspace-questions-panel.tsx) 列表展示，仅保留问题文本与真实时间，去掉“未命名会话”占位文案
- 2026-05-15 11:06 - 在 [`question.Service.Append()`](packages/strategy-service/internal/question/service.go:43) 内补齐 `CreatedAt`，确保工作区问题记录时间由后端统一生成
- 2026-05-15 11:06 - 在 [`packages/strategy-front`](packages/strategy-front) 执行 `bun typecheck`，`tsc -b` 退出码 0
- 2026-05-15 11:24 - 删除 [`question.Index`](packages/strategy-service/internal/question/model.go:13) 中未使用的 `Version` 字段，并同步简化 [`store.load()`](packages/strategy-service/internal/question/store.go:23) 默认返回值
- 2026-05-15 11:24 - 在 [`packages/strategy-service`](packages/strategy-service) 执行 `go test ./...`，全部通过
- 2026-05-15 12:03 - 移除前后端问题记录模型中的 `sessionTitle`，问题列表搜索仅按问题文本匹配，进一步简化持久化结构
- 2026-05-15 12:03 - 在 [`packages/strategy-front`](packages/strategy-front) 执行 `bun typecheck` 与 [`packages/strategy-service`](packages/strategy-service) 执行 `go test ./...`，均通过
- 2026-05-19 09:31:56 - 完成 [`/app/embed/session`](packages/strategy-front/src/pages/embed-session.tsx) 总结浮窗架构分析，新增 [`embed-session-summary-floating-window-design.md`](memory-bank/embed-session-summary-floating-window-design.md)

## Open Questions/Issues

- 已存在的旧问题记录如果缺少 `createdAt`，前端仍会回退到当前时间显示；新写入记录已由后端统一补齐

* [2026-05-19 09:51:52] - 完成 /app/embed/session 左侧总结浮窗实现：strategy-service 新增 summary API 与隐藏 child session 后台总结，strategy-front 新增 summary API/hook/浮窗并接入 EmbedSessionPage

* [2026-05-19 10:00:10] - 修复 summary 后端 OpenCode URL 拼接：避免把带 query 的路径整体写入 URL.Path 导致请求落到 HTML 路由

* [2026-05-19 10:10:29] - 修复总结浮窗两个问题：summary prompt 直接注入父会话 transcript，前端会话列表额外过滤 **summary** 标题

* [2026-05-19 10:37:16] - 调整右侧问题悬浮入口定位为 top-4，与左侧会话总结浮窗保持同高
* [2026-05-19 10:41:14] - 将会话总结浮窗挂载条件同步到代码区 open 状态，打开代码区时与问题入口一起隐藏
* [2026-05-19 13:56:17] - 调整会话总结自动触发条件：当前会话存在非 abort 的 assistant 错误时不触发总结
* [2026-05-19 14:31:57] - 修正会话总结 ready 条件：长会话下只根据最新一条 assistant 消息是否正常完成且无错误来触发总结
* [2026-05-20 09:10:50] - 将会话总结浮窗改为默认左侧悬浮图标入口，点击后展开现有总结窗口；类型检查受既有 sessionLoading/loading 类型错误阻塞
* [2026-05-20 09:50:40] - 为会话总结新增打断能力：运行新总结时保留最近 ready 总结，打断后调用 summary stop API 并回退展示最近总结；strategy-service go test ./... 通过，strategy-front bun typecheck 仍受既有 sessionLoading/loading 类型错误阻塞

* [2026-05-20 10:04:38] - ���� useStrategySession ״̬��Դ���Ƴ����� inferStatus �ƶϣ���Ϊֱ��ʹ�� Redux selectSessionStatus ��·�������� sessionLoading/loading �����ֶ�

* [2026-05-20 10:25:10] - �Ự�ܽ�ǰ�˸������� Redux �¼�״̬���� hidden summary session����ȡ selectSessionEventError/selectSessionStatus�����ܽ�����̬չʾ retry ��Ϣ���� session.error תΪ���������� toast

* [2026-05-20 10:29:45] - ���Ự�ܽ���Ȼ�ȡ�� 2.5s ��ʱ��ѯ��Ϊ���� hidden summary session ״̬��summary session �� busy/retry �ص� idle �󴥷�һ�� refresh ��ѯ���ճ־û����
* [2026-05-20 11:00:45] - 调整会话总结自动触发条件：主会话最后一条消息为 MessageAbortedError 时不启动总结，并清理 use-session-summary 调试日志；strategy-front bun typecheck 仍受既有 sessionLoading/loading 类型错误阻塞
* [2026-05-20 11:25:47] - 补充会话总结自动触发空消息保护：input.messages 为空时跳过自动 run，避免空会话触发总结
* [2026-05-20 11:28:05] - 调整会话总结打断判断位置：last 消息只在 count 非 0 后于自动触发 effect 内读取，避免 render 阶段对空数组下标取值
