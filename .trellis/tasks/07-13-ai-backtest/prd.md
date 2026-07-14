# Workbench AI 回测

## 目标

让 `packages/strategy-front` 工作台会话中的 `smartx-helper` 能够启动、查询并解释当前会话的回测，同时复用 `strategy-service` 已有的异步任务、SQLite、WebSocket 和 revision 状态同步，不新增第二套回测生命周期。

## 背景

- `packages/strategy-front/src/components/workbench/workbench.tsx:16` 已挂载回测同步；缺口不在工作台容器。
- 手工入口通过 `packages/strategy-front/src/components/workbench/hooks/use-workbench.ts:187` 调用 `POST /api/backtest/run`。
- `packages/strategy-service/internal/backtest/service.go:223` 已实现 pending 快返、幂等创建和后台 worker。
- `packages/strategy-service/internal/web/mcp_api.go:68` 当前没有回测工具，AI 无法调用现有能力。
- 用户已确认：启动回测不需要额外权限审批。

## 需求

- R1：strategy-service MCP 必须提供 `run_backtest`、`list_backtests`、`get_backtest` 和 `get_backtest_config` 四个工具。
- R2：`run_backtest` 只在本地任务完成校验和落库后返回 `pending`；不得等待 SmartX 回测完成，也不得由 MCP 请求轮询推进任务。
- R3：smartx-workflow 必须覆盖模型传入的 `workspacePath`、`sessionId`、`requestKey` 和 `pluginId`：workspace/session 使用当前主会话上下文，requestKey 使用稳定 tool call ID，pluginId 由服务端从 workspace 推导；子 agent 不得调用回测工具。
- R4：同一 tool call 重试必须命中原任务；已有活动任务时返回可处理的结构化快照，不诱导模型重复提交。用户明确要求重新运行时使用新的 tool call ID。
- R5：启动工具不弹权限审批；读取工具同样直接允许。smartx-helper 只能在用户明确要求执行回测时启动任务，讨论回测设计或代码不得触发执行。
- R6：AI 不得修改全局回测配置。启动工具接收可选的单次配置 patch，由服务端以已保存配置为基线合并且不持久化；开始/结束时间缺失或配置非法时返回可操作的结构化错误。
- R7：服务端必须校验 session 属于 workspace；详情读取必须按 workspace + session + run ID 限定；pluginId 不信任模型输入。跨作用域冲突不得泄露其他会话的完整任务。
- R8：列表工具只返回轻量状态；详情工具默认返回状态、配置和 summary，不无上限返回原始 result、dataFiles 或内部日志路径；内部错误必须脱敏。
- R9：workflow 必须把启动工具归类为独立 backtest 动作：project memory 未恢复、baseline 未建立或 finalizing 时阻止，ready/dirty 时允许。回测不修改源码，不得标记 workspace dirty。
- R10：前端必须识别稳定的 v1 工具结果，按当前 workspace/session 校验，并显示回测工具卡和“查看回测”动作；解析失败回退通用工具面板。
- R11：AI 启动的任务必须通过一次 scoped HTTP 对账进入现有 Redux 状态，后续继续由 HTTP 快照、`backtest.updated` 和 revision 合并；不得自动切页或抢占用户正在查看的历史报告。
- R12：回测完成不得自动唤醒或再次提交 AI；用户后续询问时，AI 通过只读工具读取并解释 done 结果。
- R13：发布链必须确保 strategy-service MCP 配置在 OpenCode 启动/重启前同步，并重新构建 smartx-workflow 产物。

## 验收标准

- [ ] AC1：用户明确要求回测时，AI 无审批弹窗地创建一条 pending 任务并立即返回 run ID。
- [ ] AC2：模型重试、重复 tool call 和活动任务冲突不会创建第二条远端回测。
- [ ] AC3：AI 不能伪造 workspace、session 或 pluginId；子 agent 和跨会话 run ID 均被拒绝且不泄露数据。
- [ ] AC4：省略配置时使用已保存配置；单次 patch 仅影响本任务；配置错误能引导用户补充而不暴露内部错误。
- [ ] AC5：列表输出有上限且不含大结果；详情仅在 done 时提供可解释 summary，pending/running 不被表述为完成。
- [ ] AC6：AI 创建的任务出现在现有回测面板，WebSocket 断线、切换会话或重新进入后可通过 HTTP 恢复。
- [ ] AC7：会话工具卡展示 pending/running/done/failed，显式点击才打开对应报告，历史选择不被后台更新抢占。
- [ ] AC8：回测工具调用不会把 workspace 或 project memory 标为 dirty，也不会绕过初始化和 finalizing gate。
- [ ] AC9：现有手工回测入口、状态机、HTTP 200 + 业务 code、revision 合并和重启恢复行为不回归。
- [ ] AC10：三个包的目标测试、完整包级 typecheck/build 及 Go test/build/vet 通过。

## 范围外

- 回测完成后自动生成新的 AI 消息或主动总结。
- SmartX 回测取消、并行回测队列或多实例任务协调。
- 让 AI 修改全局回测默认配置。
- 改造回测报告指标和图表体系。
