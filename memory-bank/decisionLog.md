# Decision Log

This file records architectural and implementation decisions using a list format.
2026-05-12 14:04:38 - Log of updates made.

---

### Decision

[2026-05-12 14:04:38] - 采用 Bun Workspaces + Turbo 构建 Monorepo 架构

**Rationale:**
Bun 提供高性能的包管理和脚本执行能力，Turbo 负责构建缓存和任务编排。两者结合适合包含多语言（TypeScript/Go）和多框架（SolidJS/React/Tauri/Wails）的大型项目。

**Implications/Details:**

- 所有 TypeScript 包共享 `catalog:` 版本管理
- Go 包（strategy-service）独立管理依赖（go.mod）
- 构建脚本统一放在 `packages/script/` 和各包的 `script/` 目录

---

### Decision

[2026-05-12 14:04:38] - Strategy Service 采用 Go + Wails + Gin 技术栈

**Rationale:**
Go 提供高性能后端服务能力，Wails 支持桌面应用打包，Gin 提供 HTTP API 框架。适合需要本地桌面运行和远程服务双重场景的策略管理服务。

**Implications/Details:**

- Go 1.22+ 运行时
- Wails v2 用于桌面端集成
- Gin 用于 HTTP API
- WebSocket（gorilla/websocket）用于实时通信
- 内置终端模拟（conpty）支持 Windows

---

### Decision

[2026-05-12 14:04:38] - Strategy Front 采用 React + Vite + Redux 技术栈

**Rationale:**
React 生态成熟，配合 Redux Toolkit 进行状态管理，Monaco Editor 提供代码编辑能力，Vite 保证开发体验。适合构建复杂的策略配置界面。

**Implications/Details:**

- React 19 + React Router v7
- Redux Toolkit + React Redux 状态管理
- Monaco Editor 代码编辑
- Radix UI + Tailwind CSS 组件库
- Streamdown 用于 Markdown 渲染

---

### Decision

[2026-05-14 11:07] - 工作区全局问题面板：采用"写入时记录 + useEffect 监视 + 最小化改动"策略（v3-final）

**Rationale:**

- 不追溯历史 Session 消息，避免全量遍历的性能问题（10~30s）
- 改为通过 `useEffect` 监听 Redux 中的 `chat.messages`，每次检测到新的 user message 时自动写入 `.strategy/workspace-questions.json`
- **零改动** `use-chat-runtime.ts` 和 `strategy-chat-panel.tsx`，完全恢复原始状态
- 仅修改 `embed-session.tsx`（增加 ~20 行逻辑）+ 3 个新增文件

**Implications/Details:**

- ✅ 使用 `useEffect` + `Set` 去重监视 `chat.messages` 中的新 user message
- ✅ 检测到新消息时自动调用 `questions.append()` 写入缓存文件
- ✅ 点击问题 → `chat.selectSession(sessionId)` 跳转
- ✅ 零后端改动，零新增 API
- ⚠️ 只能看到"本次之后"的问题，不追溯历史

---

### Decision (Code)

[2026-05-14 14:39:00] - 保持 `StrategyChatPanel` 原始接口不变，改为移除 `embed-session.tsx` 中遗留的 `modelInfo` 传参

**Rationale:**
本次交付要求先将 [`use-chat-runtime.ts`](packages/strategy-front/src/hooks/use-chat-runtime.ts) 与 [`strategy-chat-panel.tsx`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx) 恢复到 HEAD。恢复后，[`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:40) 的 [`Props`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:12) 不包含 `modelInfo`。因此最小修复是在 [`EmbedSessionPage`](packages/strategy-front/src/pages/embed-session.tsx:28) 中删除无效传参与未使用变量，而不是再次扩展面板接口。

**Details:**

- 删除 [`modelInfo` 常量](packages/strategy-front/src/pages/embed-session.tsx:207)
- 删除 [`<StrategyChatPanel />` 的 `modelInfo` 传参](packages/strategy-front/src/pages/embed-session.tsx:306)
- 保持 [`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:40) 与已 restore 的 HEAD 状态一致

---

### Decision (Code)

[2026-05-14 15:15:00] - 工作区问题记录从工作区文件迁移到 strategy-service 全局存储，并通过独立 `/api/question` 接口管理

**Rationale:**
`.strategy` 目录属于工作区内容，可能被删除或清理，不适合作为跨会话问题记录的持久化存储。改用 [`config.ServerRootDir()`](packages/strategy-service/internal/config/store.go:40) 返回的 `~/.strategy-service` 目录，可以让记录独立于单个工作区生命周期，并由后端集中保证写入格式与原子保存。

**Details:**

- 新增 [`question.Entry`](packages/strategy-service/internal/question/model.go:3) 与 [`question.Index`](packages/strategy-service/internal/question/model.go:12) 作为持久化模型
- 新增 [`store.load()`](packages/strategy-service/internal/question/store.go:23) / [`store.save()`](packages/strategy-service/internal/question/store.go:43) 读写 `questions.json`
- 新增 [`Service.Append()`](packages/strategy-service/internal/question/service.go:42) 与 [`Service.ListByWorkspace()`](packages/strategy-service/internal/question/service.go:20) 统一管理工作区问题记录
- 在 [`API.Register()`](packages/strategy-service/internal/web/api.go:63) 下挂载 `/api/question`，前端改为通过 [`workspaceQuestionApi`](packages/strategy-front/src/api/modules/question.ts:32) 与 [`useWorkspaceQuestions`](packages/strategy-front/src/hooks/use-workspace-questions.ts:53) 访问服务端数据

---

### Decision (Code)

[2026-05-15 11:06:00] - 工作区问题列表仅展示问题文本与时间，且时间戳由 strategy-service 写入

**Rationale:**
用户不需要“未命名会话”这类占位文案，列表中保留问题文本与时间即可。同时，如果时间戳依赖前端兜底，旧数据或缺省数据会让时间显示看起来像固定值或不可信。将时间写入统一收敛到后端 [`Service.Append()`](packages/strategy-service/internal/question/service.go:43)，可以保证后续新增记录的时间来源一致。

**Details:**

- 在 [`WorkspaceQuestionsPanel`](packages/strategy-front/src/components/chat/workspace-questions-panel.tsx:28) 中删除会话标题占位展示，仅保留 [`fmt.format(new Date(item.createdAt))`](packages/strategy-front/src/components/chat/workspace-questions-panel.tsx:119)
- 在 [`question.Service.Append()`](packages/strategy-service/internal/question/service.go:43) 中，当 [`CreatedAt`](packages/strategy-service/internal/question/model.go:9) 为空时补写 `time.Now().UnixMilli()`
- 前端现有 [`shape()`](packages/strategy-front/src/hooks/use-workspace-questions.ts:26) 仍保留兼容兜底，但新记录将优先使用后端真实时间

---

### Decision (Code)

[2026-05-15 11:24:00] - 删除问题记录索引中的冗余 `Version` 字段，保持持久化模型最小化

**Rationale:**
当前问题记录文件没有版本迁移、兼容分支或 schema 演进逻辑，[`Index.Version`](packages/strategy-service/internal/question/model.go:14) 只会增加无效噪音。移除该字段可以让 [`questions.json`](packages/strategy-service/internal/question/store.go:11) 结构更直接，也避免误导后续维护者以为存在版本管理机制。

**Details:**

- 从 [`question.Index`](packages/strategy-service/internal/question/model.go:12) 删除 `Version`
- 将 [`store.load()`](packages/strategy-service/internal/question/store.go:23) 的默认返回值统一改为 [`Index{}`](packages/strategy-service/internal/question/store.go:26)
- 在 [`packages/strategy-service`](packages/strategy-service) 执行 [`go test ./...`](packages/strategy-service/go.mod) 验证通过

---

### Decision (Code)

[2026-05-15 12:03:00] - 删除前后端问题记录中的 `sessionTitle` 字段，仅保留问题文本检索

**Rationale:**
问题列表已经不再展示会话标题，继续保留 [`sessionTitle`](packages/strategy-front/src/api/modules/question.ts:26) 只会增加数据结构噪音和不必要的透传链路。直接按问题文本搜索即可满足当前使用场景，同时能进一步收缩前后端契约。

**Details:**

- 从前端 [`QuestionEntry`](packages/strategy-front/src/api/modules/question.ts:22) 与 [`useWorkspaceQuestions`](packages/strategy-front/src/hooks/use-workspace-questions.ts:7) 移除 `sessionTitle`
- 将 [`WorkspaceQuestionsPanel`](packages/strategy-front/src/components/chat/workspace-questions-panel.tsx:36) 的搜索范围改为仅匹配 `item.text`
- 从后端 [`question.Entry`](packages/strategy-service/internal/question/model.go:3) 移除 `SessionTitle`
- 在 [`packages/strategy-front`](packages/strategy-front) 执行 [`bun typecheck`](packages/strategy-front/package.json)，并在 [`packages/strategy-service`](packages/strategy-service) 执行 [`go test ./...`](packages/strategy-service/go.mod)，均通过

---

### Decision

[2026-05-19 09:32:07] - `/app/embed/session` 总结浮窗采用隐藏 child session + strategy-service 独立 summary 存储

**Rationale:**
用户需要在 [`EmbedSessionPage`](packages/strategy-front/src/pages/embed-session.tsx:35) 左侧展示全局总结浮窗，但总结过程不能污染业务会话，也不能出现在现有会话列表。当前会话列表通过 [`chatApi.listSessions()`](packages/strategy-front/src/api/modules/chat.ts:8) 请求 `/session` 且带 `roots=true`，OpenCode 的 [`Session.list()`](packages/opencode/src/session/index.ts:542) 会在 `roots=true` 时过滤 `parent_id` 非空会话。因此将总结生成载体建模为当前业务会话的 child session，可以天然避免出现在 root 会话列表中。

**Implications/Details:**

- 不调用 [`POST /session/:sessionID/summarize`](packages/opencode/src/server/routes/session.ts:488) 作为主流程，避免 compaction 语义改写当前业务会话上下文
- `strategy-service` 新增 `/api/summary` 编排接口，负责创建/复用 hidden child session、生成总结、持久化状态
- 前端新增左侧浮窗与 `useSessionSummary`，仅监听当前业务会话完成后触发，不调用 `chat.selectSession(summarySessionId)`
- 总结结果保存到 `~/.strategy-service/summaries.json` 一类外部配置目录，前端刷新后可恢复
- 详细设计记录在 [`embed-session-summary-floating-window-design.md`](memory-bank/embed-session-summary-floating-window-design.md)

---

### Decision (Code)

[2026-05-19 09:51:52] - 前端会话列表在 Redux 写入层过滤 parentID 非空会话

**Rationale:**
后端总结任务会创建 OpenCode child session。虽然列表请求已使用 roots=true，但 SSE session.created/session.updated 仍可能把 child session upsert 到前端状态。为满足总结会话不出现在会话列表中的要求，在 setWorkspaceSessions 与 upsertWorkspaceSession 层统一过滤 parentID。

**Details:**

- packages/strategy-front/src/store/chat-session-slice.ts

---

### Decision (Code)

[2026-05-20 09:50:40] - 会话总结打断采用“保留最近 ready 快照 + abort hidden child session”机制

**Rationale:**
会话总结运行态会覆盖当前 entry 为 running。如果用户打断时直接置空或置错状态，会导致界面没有可展示内容。运行新总结前将当前 ready 文本保存为最近快照，打断时先恢复该快照并调用 OpenCode child session abort，可以立即展示最近一次总结，同时阻止后台新结果覆盖用户选择。

**Details:**

- [`Entry`](packages/strategy-service/internal/summary/model.go:12) 新增 `LastText` / `LastMessageCount` / `LastUpdatedAt` 快照字段
- [`Service.Stop()`](packages/strategy-service/internal/summary/service.go:136) 恢复最近 ready 总结并调用 hidden child session abort
- [`summaryStop()`](packages/strategy-service/internal/web/summary_api.go:37) 挂载到 `/api/summary/session/stop`
- [`useSessionSummary()`](packages/strategy-front/src/hooks/use-session-summary.ts:39) 暴露 `stop`
- [`SessionSummaryFloatingWindow`](packages/strategy-front/src/components/chat/session-summary-floating-window.tsx:24) 在 running 状态显示“打断”按钮

---

### Decision (Code)

[2026-05-20 10:25:10] - �Ự�ܽ����ɼ��Ը������������¼� Redux ����

**Rationale:**
���� useChatRuntime ��ͨ�� EventSource ���� OpenCode �¼������� chat-event-reducer д�� session.status �� eventErrs���Ự�ܽ� hidden child session ͬ������� session.error/session.status�����ǰ���������� EventSource��ֱ�Ӱ� summarySessionId ��ȡ selectSessionEventError �� selectSessionStatus���ɱ����ظ����Ӻ��¼������߼���

**Details:**

- useSessionSummary ��ȡ selectSessionEventError/selectSessionStatus
- SessionSummaryFloatingWindow �� running ״̬չʾ retry/status �İ�

---

### Decision (Code)

[2026-05-20 10:29:45] - �Ự�ܽ���ɼ����� summary session idle �¼��󵥴�ˢ��

**Rationale:**
��Ȼ hidden summary session �� session.status �ѽ��� Redux���̶� 2.5s ��ѯ������ظ����󡣸�Ϊ�� running ״̬�¼�¼ summary session �Ƿ���ֹ��� idle ״̬��������ص� idle ʱ����һ�� summary get���������¼�����Ҳ�������մ� strategy-service �־û������ȡ�Ŀɿ��ԡ�

**Details:**

- useSessionSummary �Ƴ� setInterval ��ѯ
- useSessionSummary �� status �� busy/retry �ص� idle �� refresh

---

### Decision

[2026-05-20 13:44:14] - 嵌入会话模型选择改为全局链式优先级配置

**Rationale:**
[`EmbedSessionPage`](packages/strategy-front/src/pages/embed-session.tsx:37) 中的模型选择需要从输入区迁移到设置弹窗，避免用户在每次输入时临时切模型，并支持客户自定义模型优先、Claude 优先、GPT 系列其次的全局排序策略。由于 [`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:40) 同时被 [`strategy-detail.tsx`](packages/strategy-front/src/pages/strategy-detail.tsx:181) 复用，不能直接删除 [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 的模型下拉能力，只应在嵌入页通过 `showModel=false` 隔离行为。

**Implications/Details:**

- 新增设计文档 [`embed-session-model-chain-design.md`](memory-bank/embed-session-model-chain-design.md)
- 模型链候选只来自已连接且展示中的 [`visibleModels`](packages/strategy-front/src/types/composer.ts:19)，确保未启动/隐藏/断开的模型不参与排序
- [`model-catalog.ts`](packages/strategy-front/src/lib/model-catalog.ts:13) 建议扩展保存 `chain` 与 `chainTouched`，不保存 API Key 或其他密钥
- [`resolveComposer()`](packages/strategy-front/src/lib/chat-composer.ts:46) 建议优先解析有效链首，再回退到 agent/provider 默认逻辑
- [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:62) 的自动纠偏应避免在 `showModel=false` 时覆盖全局链选择

---

### Decision (Code)

[2026-05-20 13:56:55] - 将 provider 可见模型扩展为可持久化的全局模型链

**Rationale:**
模型优先级需要在嵌入会话设置中全局生效，并且必须只包含已连接且展示中的模型。将链式顺序保存在前端 model catalog，可避免保存密钥，同时让 composer 统一从 provider catalog 读取已归一化的 `chainModels`，保证页面、设置弹窗、发送消息使用同一候选集。

**Details:**

- [`model-catalog.ts`](packages/strategy-front/src/lib/model-catalog.ts:12) 新增 `ModelChain`、自动排序与归一化逻辑
- [`global-data-provider.tsx`](packages/strategy-front/src/data/global-data-provider.tsx:258) 生成 `chainModels` 并通过 [`useProviderList()`](packages/strategy-front/src/data/global-data-provider.tsx:673) 暴露
- [`resolveComposer()`](packages/strategy-front/src/lib/chat-composer.ts:46) 优先使用链内当前模型与链首模型
- [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:141) 承载链式排序 UI 与持久化写入
- [`EmbedSessionPage`](packages/strategy-front/src/pages/embed-session.tsx:37) 通过 `showModel=false` 隐藏输入区模型选择，保留共享组件兼容性

---

### Decision (Code)

[2026-05-20 14:42:24] - 模型链故障切换收敛到 strategy-service 后端编排

**Rationale:**
前端只能在发送前解析链首模型，无法可靠地在运行期关联 OpenCode `session.error` / assistant `message.updated.error` 与最近一次 prompt。将 prompt 入口迁移到 strategy-service 后，后端可以保存最近请求、监听 OpenCode SSE、按 JSON 中的关键词判定故障，并在命中后自动使用同一请求内容调用下一个未尝试模型，避免前端重复实现运行期重试状态机。

**Details:**

- [`modelchain.Service`](packages/strategy-service/internal/modelchain/service.go:20) 保存 prompt 上下文、监听 `/event` SSE 并按关键词触发下一模型
- [`store.save()`](packages/strategy-service/internal/modelchain/store.go:43) 将链路写入 `model-chain.json`
- [`API.Register()`](packages/strategy-service/internal/web/api.go:70) 新增 `/api/model-chain` 与 `/api/model-chain/session/:sessionId/prompt`
- [`modelChainApi`](packages/strategy-front/src/api/modules/model-chain.ts:17) 提供前端保存与发送入口
- [`chatApi.sendPrompt()`](packages/strategy-front/src/api/modules/chat.ts:49) 改由后端 model-chain prompt 路由发送，保留问题记录写入

---

### Decision (Code)

[2026-05-20 22:42:51] - 模型链事件监听复用 strategy-service `/opencode/event` 代理流

**Rationale:**
模型链服务此前在发送 prompt 后主动连接 OpenCode `/event`，会额外建立一条中间监听连接。前端本身已经通过 strategy-service 暴露的 `/opencode/event` 获取事件，因此将事件监听下沉到 OpenCode 反向代理中，可以在不改变前端 SSE 传输的前提下复用同一条事件流，并让模型链自动切换逻辑只消费代理层旁路出来的事件。

**Details:**

- [`NewOpencodeProxy()`](packages/strategy-service/internal/web/opencode.go:16) 新增 `chain` 参数，并在代理 `/event` 响应时用 [`events.Read()`](packages/strategy-service/internal/web/opencode.go:73) 包装 response body
- [`events.line()`](packages/strategy-service/internal/web/opencode.go:97) 解析 SSE `data:` 行后调用 [`modelchain.Service.Event()`](packages/strategy-service/internal/modelchain/service.go:91)
- [`modelchain.Service.Prompt()`](packages/strategy-service/internal/modelchain/service.go:50) 不再启动独立 SSE 监听；服务内移除 `stops` 与主动 stream 循环
- [`bootstrap.New()`](packages/strategy-service/internal/bootstrap/app.go:33) 将 `chain` 注入两个 `/opencode` 代理路由

---

### Decision (Code)

[2026-05-21 10:47:30] - 模型链故障切换改为 abort 后发送继续

**Rationale:**
OpenCode session.status retry 表示当前生成仍处在需要恢复/重试的状态，直接用新模型重发原始 prompt 可能与未终止的生成并发或重复用户意图。先调用 session abort 明确打断当前运行，再以新模型发送继续，可以复用已有会话上下文并让下一模型从中断点继续处理。

**Details:**

- modelchain.Service.fail(): 先调用 modelchain.Service.abort()，再选择未使用模型
- fallback prompt 固定为 text part 继续，并保存为当前 session 的 tracked prompt
- modelchain.Config 补回 Enabled 字段以匹配现有 config 清洗逻辑

---

### Decision

[2026-05-24 19:03:51] - 链式模型优先级限制为最多 10 个有效模型

**Rationale:**
模型链用于运行期故障切换与默认模型选择，链路过长会增加用户排序成本、后端 fallback 追踪复杂度与异常恢复时延。将链式优先级限制为最多 10 个，可以覆盖主流“默认 + 多级备用”场景，同时保持 UI 可读、状态持久化简洁、后端重试边界可控。

**Implications/Details:**

- 前端归一化链路时裁剪到 10 个，避免本地 catalog 和后端保存超长链路
- 自动排序只产出前 10 个候选；用户手动排序只在这 10 个有效链路内移动
- 模型目录中已展示但未进入前 10 的模型仍可显示/隐藏，但不参与链式 fallback
- 后端保存或执行 model-chain 时也应防御性截断到 10 个，避免绕过前端限制

---

### Decision

[2026-05-24 19:34:25] - 聊天输入区统一去除 agent/model 选择，模型能力收敛为通用链式模型

**Rationale:**
[`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:41) 不再作为保留 agent/model 下拉的共享入口；后续链式模型将从 [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:143) 扩展为通用能力并内聚到聊天面板中。继续保留 [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 的 agent/model 输入区域会造成两套模型选择入口并存，且 [`resolveComposer`](packages/strategy-front/src/lib/chat-composer.ts:37) 中的偏好模型仍可能覆盖链式模型首位，破坏“链式模型为唯一模型来源”的语义。

**Implications/Details:**

- 全局聊天输入区应删除 agent/model 下拉，而不是只在嵌入页隐藏
- [`useChatRuntime`](packages/strategy-front/src/hooks/use-chat-runtime.ts:419) 发送 prompt 时不再接收或透传 agent/model
- [`PromptBar`](packages/strategy-front/src/components/chat/prompt-bar.tsx:43) 应简化为纯文本输入、提交和停止控件
- [`EmbedProviderSettingsDialog`](packages/strategy-front/src/components/chat/embed-provider-settings-dialog.tsx:143) 应逐步改名/泛化为通用链式模型设置组件
- [`ComposerPrefs`](packages/strategy-front/src/types/composer.ts:9) 中 agent/model 偏好应从聊天发送链路移除；variant 是否保留需作为链式模型配置的一部分进一步收敛

---

### Decision

[2026-05-26 10:31:07] - 聊天消息展示采用“消息索引 + part 分组索引”的双层状态模型

**Rationale:**
OpenCode 事件流中 `message.updated` 与 `message.part.updated` 是两个粒度不同的事实来源：前者描述消息元信息与时间线归属，后者描述消息内容块。将 UI 直接展平所有 parts 会丢失 user/assistant 外层语义、错误态和 Message 容器布局；将 parts 嵌入 message 又会让流式 delta 与局部更新放大重渲染范围。因此继续保留 Redux 中 `messages[sessionID]` 与 `parts[messageID]` 两个索引，由列表按消息遍历、单项按 messageID 订阅 parts。

**Implications/Details:**

- `message.updated` 必须对不存在的 message 执行 upsert，而不能只 map 替换，否则 SSE 首次到达时 `ChatMessageList` 无外层消息可遍历
- `message.part.updated` 只负责 `state.parts[part.messageID]` 的替换/追加，不应驱动 session 级消息列表
- [`ChatMessageList`](packages/strategy-front/src/components/chat-message-list.tsx:615) 继续遍历 `props.messages`，[`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 通过 `selectSessionParts(state, info.id)` 读取对应 parts
- 若存在 part 先于 message 到达，应允许 parts 暂存；message 到达后自然渲染，避免生成占位消息污染时间线

---

### Decision (Code)

[2026-05-26 10:59:35] - 恢复聊天错误显示链路并保留 message/part 双层渲染

**Rationale:**
原始事件中存在只通过 [`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:265) 携带 `error`、没有任何 `message.part.updated` 文本块的 assistant 失败消息。若 UI 只渲染 parts，这类消息会在 [`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 中显示为空。将错误统一落到 per-message error card，既保留 message 外层时间线，又不伪造 text part。

**Details:**

- [`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:265) 改为替换或追加，确保新消息进入 [`messages`](packages/strategy-front/src/lib/chat-event-reducer.ts:22)
- [`session.error`](packages/strategy-front/src/lib/chat-event-reducer.ts:255) 优先绑定最后一条 assistant 的 [`runErrs`](packages/strategy-front/src/lib/chat-event-reducer.ts:33)，无 assistant 时暂存在 [`eventErrs`](packages/strategy-front/src/lib/chat-event-reducer.ts:36)
- [`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 恢复 [`errorText()`](packages/strategy-front/src/components/chat-message-list.tsx:38) 和错误卡片渲染，使无 parts 的 assistant error 可见

---

### Decision (Code)

[2026-05-26 11:22:00] - 聊天列表错误展示以 message.updated 的消息级错误为准

**Rationale:**
用户明确希望不再关注会话级 [`session.error`](packages/strategy-front/src/lib/chat-event-reducer.ts:253)，因为错误会在 [`message.updated`](packages/strategy-front/src/lib/chat-event-reducer.ts:270) 的 `info.error` 中呈现。UI 层继续消费会话级 `err` 或 per-message `runErrs` fallback 会造成同一错误来源重复、延迟或归属不清，因此聊天列表只根据当前 message 自身错误字段渲染错误卡片。

**Details:**

- 删除 [`ChatMessageList`](packages/strategy-front/src/components/chat-message-list.tsx:615) 的会话级 `err` prop 和全局错误卡片
- 删除 [`ChatMessageItem`](packages/strategy-front/src/components/chat-message-list.tsx:588) 对 [`selectMessageRunError`](packages/strategy-front/src/store/index.ts:86) 的读取，仅使用 `props.info.error`
- [`StrategyChatPanel`](packages/strategy-front/src/components/strategy/strategy-chat-panel.tsx:45) 不再向 [`ChatMessageList`](packages/strategy-front/src/components/chat-message-list.tsx:615) 传递 `eventErr`

---

### Decision (Code)

[2026-05-26 13:44:00] - Strategy Service 客户本地持久化采用纯 Go SQLite 专用业务表

**Rationale:**
客户本地部署需要比多个 JSON 文件更稳定的统一持久化载体，同时当前构建脚本使用 `CGO_ENABLED=0` 做跨平台 CLI 打包。选择 [`modernc.org/sqlite`](packages/strategy-service/go.mod:67) 可避免 CGO 依赖。根据用户反馈，放弃不友好的 bucket/key/value 文档表，改为按业务对象建立独立表，便于后续查询、维护和排查；同时明确不再兼容旧 JSON 文件，避免双写/迁移路径持续增加复杂度。

**Details:**

- [`db.Open()`](packages/strategy-service/internal/db/store.go:23) 初始化 [`strategy.db`](packages/strategy-service/internal/db/store.go:48)，启用 busy timeout、WAL 与业务表 schema
- 新建 [`config`](packages/strategy-service/internal/db/store.go:86)、[`workspaces`](packages/strategy-service/internal/db/store.go:93)、[`questions`](packages/strategy-service/internal/db/store.go:106)、[`summaries`](packages/strategy-service/internal/db/store.go:115)、[`model_chain`](packages/strategy-service/internal/db/store.go:128) 表，移除 `kv`、`Migrate`、`LegacyRead` 等旧 JSON 兼容代码
- [`config.Store.LoadUserConfig()`](packages/strategy-service/internal/config/store.go:55)、[`workspace.store.load()`](packages/strategy-service/internal/workspace/store.go:15)、[`question.store.load()`](packages/strategy-service/internal/question/store.go:7)、[`summary.store.load()`](packages/strategy-service/internal/summary/store.go:7)、[`modelchain.store.load()`](packages/strategy-service/internal/modelchain/store.go:7) 全部改为专用表读写
