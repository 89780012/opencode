# 需求面板编辑与持久化 - 实施计划

## 实施顺序

- [x] 1. 在 `packages/strategy-service/internal/workbench/types.go` 增加保存请求类型。
- [x] 2. 在 `packages/strategy-service/internal/workbench/service.go` 实现校验、会话归属检查、事务覆盖保存和规范化响应。
- [x] 3. 在 `packages/strategy-service/internal/web/workbench_api.go` 与 `api.go` 注册 `PUT /api/workbench/requirements`。
- [x] 4. 为服务层补充有序覆盖、幂等、删除至空、空白拒绝、会话不存在和工作区不匹配测试。
- [x] 5. 在 `packages/strategy-front/src/api/modules/workbench.ts` 增加保存契约和请求方法。
- [x] 6. 在 Redux workbench slice 增加仅更新目标会话需求的 reducer，并补聚焦测试。
- [x] 7. 新增需求编辑子组件，接入 `RequirementsTab`/`Side`，实现新增、修改、单条删除、清空、取消、保存状态、错误保留与响应回填。
- [x] 8. 在现有 side CSS 中补充标题栏新增入口、原地自适应输入行、图标按钮、紧凑操作区和状态样式，并检查 220-460px 面板宽度下的文本换行与按钮稳定性。
- [x] 9. 运行包内格式化、测试、类型检查、lint 和构建，随后在桌面与窄屏视口做截图检查。
- [x] 10. 在 workbench Redux 中增加按工作区和会话隔离的待重审状态，以及标记、清除和删除会话清理 reducer。
- [x] 11. 需求保存成功后标记原始目标会话需要重审，不改变 `saveRequirements` HTTP 契约，也不从保存流程直接调用 AI。
- [x] 12. 在 `StageView` 顶部增加紧凑横条，复用 `chat.submit` 向当前会话发送固定重审指令；处理忙碌、成功清除和失败保留。
- [x] 13. 补充 reducer 状态测试，检查会话隔离、版本竞争和删除清理；完成前端类型检查、相关 ESLint 和差异检查，界面交互由用户验收。

## 验证命令

后端（`packages/strategy-service`）：

```powershell
gofmt -w internal/workbench/types.go internal/workbench/service.go internal/workbench/service_test.go internal/web/workbench_api.go internal/web/api.go
go test ./internal/workbench ./internal/web ./internal/db
go test ./...
go build ./...
```

前端（`packages/strategy-front`）：

```powershell
bun test ./test/requirements.test.ts
bun run typecheck
bun run lint
bun run build
```

## 重点检查

- 后端必须在写入前验证 session 与 workspace 归属，避免现有无外键表产生孤儿记录。
- `[]` 必须成功覆盖旧列表；`null`、字段缺失或夹杂空白字符串必须失败且不改变旧值。
- 保存响应晚于会话切换时，不得覆盖当前另一会话的编辑器状态。
- API 失败后 Redux 服务端值保持不变，草稿、删除操作和新增内容仍可继续编辑并重试。
- 保存需求不得改变会话标题、列表排序或触发任何 AI/工作流副作用。
- 待重审横条只能由成功且有实际变化的保存触发；点击横条才允许发送会话指令，且发送成功前不得清除提示。

## 回滚点

- 后端提交前：新增路由尚未被前端调用，可独立回滚。
- 前端接入前：已有只读需求列表保持可用。
- 联调异常时：先移除编辑入口和 PUT 调用，数据库 schema 与历史数据无需恢复。
