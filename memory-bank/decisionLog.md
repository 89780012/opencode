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
