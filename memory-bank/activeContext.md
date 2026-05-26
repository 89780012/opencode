# Active Context

This file tracks the project's current status, including recent changes, current goals, and open questions.
YYYY-MM-DD HH:MM:SS - Log of updates made.

---

## Current Focus

- Stabilize workspace question panel behavior and simplify question record persistence model
- 2026-05-19 09:31:56 - 设计 `/app/embed/session` 左侧全局总结浮窗：采用隐藏 child session 生成总结，并由 strategy-service 独立持久化，避免总结会话出现在 root 会话列表

## Recent Changes

- 2026-05-26 11:22:00 - 收敛聊天错误渲染：[`ChatMessageList`](packages/strategy-front/src/components/chat-message-list.tsx:615) 不再接收会话级 `err`，[`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 仅使用 [`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:270) 写入的 `info.error` 渲染消息级错误
- 2026-05-26 10:59:35 - 修复聊天事件渲染链路：[`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:265) 改为 upsert，恢复 [`session.error`](packages/strategy-front/src/lib/chat-event-reducer.ts:255) / [`eventErrs`](packages/strategy-front/src/lib/chat-event-reducer.ts:36) 暂存，并让 [`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 渲染无 part 的 assistant 错误
- 2026-05-26 10:31:07 - 分析聊天事件渲染链路：`message.updated` 应保证消息存在或更新，`message.part.updated` 独立维护 message parts；`ChatMessageList` 保持外层消息遍历，`ChatMessageItem` 只消费对应 messageID 的 parts
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
* [2026-05-20 13:44:14] - 完成嵌入会话全局链式模型选择架构设计：模型选择从 [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 迁移到 [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:141)，并新增 [`embed-session-model-chain-design.md`](memory-bank/embed-session-model-chain-design.md)
* [2026-05-20 13:56:55] - 完成嵌入会话全局链式模型选择实现：新增模型链持久化与排序、设置弹窗链式排序 UI、嵌入页隐藏输入区模型选择；packages/strategy-front bun typecheck 通过
* [2026-05-20 14:42:24] - 完成模型链后端同步与故障切换：strategy-service 新增 modelchain JSON 存储、模型链 API、后端 OpenCode SSE 监听与关键词命中后按链路自动调用下一模型；strategy-front 将模型链保存到后端并改由 model-chain prompt 路由发送
* [2026-05-20 14:48:06] - 移除模型链列表中的“设为当前”操作，当前模型固定按链路第一位展示，避免与链式顺序语义冲突；packages/strategy-front bun typecheck 通过
* [2026-05-20 15:51:42] - 修复模型链 prompt 兼容处理：保留 [`modelchain.Prompt`](packages/strategy-service/internal/modelchain/model.go:15) 的 model 字段，后端 [`modelchain.Service.Prompt()`](packages/strategy-service/internal/modelchain/service.go:49) 在 req.model 为空时使用持久化 chain 首位模型；随后按 chain 归一化模型，确保首发与 fallback 已尝试记录一致
* [2026-05-20 20:48:39] - 调整会话总结模型来源：summary 服务注入并复用后端 modelchain 服务，从持久化 cfg.Chain 首位读取总结模型；packages/strategy-service go test ./... 通过
* [2026-05-20 20:50:41] - 为会话总结 prompt 增加模型链顺序重试：summary 遍历 cfg.Chain，当前模型 post 失败或返回空总结时记录 warn 并尝试下一模型；packages/strategy-service go test ./... 通过
* [2026-05-20 21:04:47] - 修复 use-chat-runtime 类型错误：发送 prompt 前显式校验 workspacePath，收窄为 string；清理 model-chain 未使用类型导入与 embed-session 未使用 agent，packages/strategy-front bun typecheck 通过
* [2026-05-20 21:55:17] - 修复 Windows 下 model-chain.json 保存失败：modelchain Get/Save 加互斥锁避免并发读写，Rename 失败时删除旧目标后重试并清理 tmp；同时修正 summary slog 参数格式，packages/strategy-service go test ./... 通过
* [2026-05-20 22:42:51] - 将模型链事件监听改为复用 `/opencode/event` 代理流：[`NewOpencodeProxy()`](packages/strategy-service/internal/web/opencode.go:16) 旁路解析 SSE data 后调用 [`modelchain.Service.Event()`](packages/strategy-service/internal/modelchain/service.go:91)，模型链服务不再主动连接 OpenCode `/event`；packages/strategy-service go test ./... 通过
* [2026-05-20 23:15:54] - 简化会话总结前端状态跟踪：[`useSessionSummary()`](packages/strategy-front/src/hooks/use-session-summary.ts:24) 初始只查询一次，运行后仅等待 hidden summary session 的真实 status 变为 idle 再 refresh，移除 retry 文案与 session.error toast 分支
* [2026-05-21 08:54:48] - 调整会话总结自动触发逻辑：useSessionSummary 改为仅在 input.busy 从 true 变为 false 的下降沿调用 run，移除主会话 Redux status idle 触发依赖
* [2026-05-21 10:00:56] - �޸� strategy-front store �ۺϵ���ȱʧ selectSessionAbort����� useSessionSummary �� @/store ����ʱ�� Vite requested module export ����
* [2026-05-21 10:19:00] - �޸� modelchain �¼��������� OpenCode session.status retry �¼�ʶ��Ϊģ����������Ϣ��֧�� Free usage exceeded ��״̬������ʽ�л�
* [2026-05-21 10:47:30] - 调整 modelchain 故障切换流程：retry 命中后先调用 OpenCode session abort 打断当前生成，再用下一模型发送继续恢复会话
* [2026-05-24 18:56:18] - 调整链式模型优先级列表容器：为 [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:142) 中的排序列表增加最大高度与纵向滚动
* [2026-05-24 18:59:21] - 同步调整模型目录 provider 分组模型列表：为 [`CardContent`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:594) 区域增加最大高度与纵向滚动
* [2026-05-24 19:03:51] - 设计链式模型优先级 10 个上限方案：前端归一化与保存前裁剪，后端保存/执行双重防御截断
* [2026-05-24 19:07:21] - 实现链式模型优先级最多 10 个限制：前端 [`modelChainLimit`](packages/strategy-front/src/lib/model-catalog.ts:22) 统一裁剪，设置弹窗展示计数与说明，后端 [`ChainLimit`](packages/strategy-service/internal/modelchain/config.go:5) 防御性截断
* [2026-05-24 19:21:44] - 梳理嵌入会话输入区去除 agent/model 选择方案：建议将 [`EmbedSessionPage`](packages/strategy-front/src/pages/embed-session.tsx:285) 的发送链路收敛到设置弹窗链式模型，不再透传 agent/model 偏好到 [`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:41)
* [2026-05-24 19:34:25] - 方案调整为全局删除聊天输入区 agent/model 选择：[`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:41) 后续内聚链式模型设置，[`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 简化为纯输入控件
* [2026-05-24 21:08:01] - 完成聊天输入区 agent/model 删除实现：[`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:1) 简化为纯输入，发送链路 [`useChatRuntime`](packages/strategy-front/src/hooks/use-chat-runtime.ts:35) 不再透传 agent/model，[`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:14) 调用方同步清理
* [2026-05-24 21:32:34] - 按后端统一配置要求继续移除前端 variant 配置：[`useChatRuntime`](packages/strategy-front/src/hooks/use-chat-runtime.ts:34) 发送链路不再透传 variant，[`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:39) 删除变体 UI 与 props
* [2026-05-24 21:49:23] - 完成 composer 偏好层清理：删除未使用的 `useComposer` / `resolveComposer` / composer provider 与旧设置弹窗，创建工作区首条 prompt 改为只发送 parts，避免前端 agent/model/variant 偏好继续参与发送
* [2026-05-26 13:44:00] - 完成 [`strategy-service`](packages/strategy-service) 本地 SQLite 持久化接入：新增 [`db`](packages/strategy-service/internal/db/store.go:1) 初始化与业务表 schema，配置、工作区、问题、总结与模型链全部切换为 [`strategy.db`](packages/strategy-service/internal/db/store.go:48) 专用表读写，并移除旧 JSON 兼容迁移代码
