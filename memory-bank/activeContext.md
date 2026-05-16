# Active Context

This file tracks the project's current status, including recent changes, current goals, and open questions.
YYYY-MM-DD HH:MM:SS - Log of updates made.

---

## Current Focus

- Stabilize workspace question panel behavior and simplify question record persistence model

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

## Open Questions/Issues

- 已存在的旧问题记录如果缺少 `createdAt`，前端仍会回退到当前时间显示；新写入记录已由后端统一补齐
