# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2026-05-12 14:04:38 - Log of updates made will be appended as footnotes to the end of this file.

## Project Goal

OpenCode 是一个开源的 AI Coding Agent，旨在为开发者提供智能编码辅助工具。项目支持终端 CLI、桌面应用（Tauri/Electron）和 Web 控制台多种使用方式，并通过插件系统和 SDK 实现可扩展性。

## Key Features

- **AI Coding Agent**: 核心功能，提供 AI 驱动的代码生成、编辑和辅助
- **多平台支持**: CLI、桌面应用（macOS/Windows/Linux）、Web 控制台
- **插件系统**: 通过 `@opencode-ai/plugin` 支持扩展
- **SDK**: 提供 JavaScript SDK (`@opencode-ai/sdk`) 用于集成
- **Strategy Service**: Go 后端服务（Wails + Gin），提供策略和工作空间管理
- **Strategy Front**: React + Vite 前端，提供策略配置界面
- **SmartX Workflow**: 工作流引擎（hooks + state 管理）
- **企业版**: 通过 `packages/enterprise` 提供企业级功能
- **多 LLM 支持**: 通过 AI SDK 和 OpenRouter 支持多种大语言模型

## Overall Architecture

### Monorepo 结构（Bun Workspaces + Turbo）

```
opencode/
├── packages/
│   ├── opencode/          # 核心 CLI 包（TypeScript/Bun）
│   ├── app/               # Web 应用
│   ├── console/           # SolidJS 控制台 UI
│   ├── desktop/           # Tauri 桌面应用
│   ├── desktop-electron/  # Electron 桌面应用
│   ├── enterprise/        # 企业版功能
│   ├── extensions/        # 扩展
│   ├── plugin/            # 插件系统
│   ├── sdk/               # JavaScript SDK（OpenAPI 生成）
│   ├── slack/             # Slack 集成
│   ├── strategy-service/  # Go 后端服务（Wails + Gin）
│   ├── strategy-front/    # React 前端（Vite + Redux + Monaco）
│   ├── smartx-workflow/   # 工作流引擎
│   ├── storybook/         # UI 组件文档
│   ├── ui/                # 共享 UI 组件
│   ├── util/              # 工具函数库
│   ├── web/               # 官网（Astro）
│   └── script/            # 构建脚本
├── infra/                 # SST 基础设施配置（Cloudflare）
├── docs/                  # 文档
└── sdks/                  # 外部 SDK（如 VSCode 扩展）
```

### 技术栈

| 层级     | 技术                                      |
| -------- | ----------------------------------------- |
| 运行时   | Bun (TypeScript), Go 1.22+                |
| 前端框架 | SolidJS (Console), React (Strategy Front) |
| 桌面端   | Tauri, Electron, Wails (Go)               |
| Web 框架 | Hono, Astro (官网)                        |
| 数据库   | Drizzle ORM                               |
| 验证     | Zod                                       |
| 基础设施 | SST + Cloudflare                          |
| 构建     | Turbo (monorepo), Vite, esbuild           |
| 包管理   | Bun (pnpm store 兼容)                     |

### 基础设施

- **SST v3** 部署到 Cloudflare
- **PlanetScale** 作为数据库 provider
- **Stripe** 支付集成
- 多阶段部署：production（保留/保护）、其他阶段（可移除）
