# System Patterns _Optional_

This file documents recurring patterns and standards used in the project.
It is optional, but recommended to be updated as the project evolves.
2026-05-12 14:04:38 - Log of updates made.

## Coding Patterns

- **单词变量名优先**: 变量和函数优先使用单词命名（如 `pid`, `cfg`, `err`, `opts`, `dir`），仅在必要时使用多词命名
- **函数式数组方法**: 优先使用 `flatMap`, `filter`, `map` 而非 for 循环；filter 中使用 type guards 保持类型推断
- **const 优先**: 使用 `const` 而非 `let`，用三元表达式或 early return 替代变量重新赋值
- **Early Return**: 避免 `else` 语句，优先使用 early return 模式
- **避免 try/catch**: 尽可能避免 try/catch 块
- **避免解构**: 使用点号访问（`obj.a`）而非解构，保留上下文
- **Bun API 优先**: 使用 Bun 原生 API（如 `Bun.file()`）而非 Node.js 等价物
- **类型推断优先**: 依赖类型推断，仅在导出或必要时添加显式类型注解
- **Drizzle Schema**: 使用 snake_case 字段名，无需重新定义为字符串

## Architectural Patterns

- **Monorepo Workspace**: Bun Workspaces 管理多包，`catalog:` 统一依赖版本
- **Turbo 构建**: 使用 Turbo 进行构建缓存和任务编排
- **SST 基础设施**: SST v3 + Cloudflare 部署，多阶段环境（production 保护/保留）
- **OpenAPI SDK 生成**: SDK 通过 OpenAPI 规范自动生成（`packages/sdk/js/src/gen/`）
- **Go 分层架构**: Strategy Service 采用 `internal/` 分层（asset, workspace, bootstrap 等）
- **React + Redux**: Strategy Front 使用 Redux Toolkit 进行全局状态管理
- **SolidJS 控制台**: Console 包使用 SolidJS + Kobalte 组件库

## Testing Patterns

- **无 Mock 优先**: 尽可能避免 mock，测试实际实现
- **不重复逻辑**: 不将逻辑复制到测试中
- **包级测试**: 测试不能从 repo 根目录运行，需在包目录（如 `packages/opencode`）中执行
- **根目录保护**: 根目录 `bun test` 会触发 `do-not-run-tests-from-root` 守卫
