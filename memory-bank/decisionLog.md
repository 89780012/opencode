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
