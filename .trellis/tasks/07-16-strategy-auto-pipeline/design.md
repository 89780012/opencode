# 技术设计

## 架构边界

```text
strategy-front system switches
  -> strategy-service config / SQLite
  -> smartx-workflow main-session orchestration
  -> strategy-reviewer + smartx_save_review
  -> MCP start -> MCP logs
  -> MCP run_backtest
  -> strategy-service backtest worker
  -> workflow.updated / review.updated / backtest.updated
  -> strategy-front Redux + workbench timeline
```

- `strategy-front` 只配置意图并消费事实状态，不负责驱动后台阶段。
- `smartx-workflow` 识别代码写入、选择下一个启用阶段、注入强制指令和绑定可信身份。
- `strategy-service` 是配置、流水线、审查、调试结果和回测绑定的事实来源。

## 配置契约

`workflow` 增加 `review`、`debug`、`backtest` 三个布尔字段，和现有 `baseline` 一起由 `/api/system/config` 读写。旧数据库通过增量列迁移补默认值 `0`；前端和服务端缺字段时都按关闭处理。

workflow 每次 system transform 刷新配置，tool before/after 使用本会话最近快照，避免一次模型工具链中出现配置漂移。

## 流水线状态

增加 `workflow_runs`，按 workspace + session + code revision 唯一。记录：

- `id`、`workspace_path`、`session_id`、`code_revision`
- `stage`、`state`、`review_round`
- `debug_id`、内部 `debug_request_key`、内部 `debug_cursor`、`backtest_id`
- `summary`、`error`、`revision`、`created_at`、`updated_at`

阶段为 `coding`、`review`、`debug`、`backtest`、`done`；状态使用阶段内的 requested/running/passed/failed，以及 `review_exhausted`、`cancelled`。服务端用事务和条件 revision 更新保证单调转换，并在提交后发送 `workflow.updated`。

code revision 由 workflow 在主会话首次成功写入后生成，后续同一自动修复链沿用；用户在流水线终止后再次修改代码生成新 revision。

## 自动触发

workflow 继续使用成功的 `write/edit/apply_patch/bash/smartx_python` 结果标记 dirty。主会话进入自然收口、项目记忆已保存且没有活动 review/fix 时：

1. 查询或幂等创建当前 revision 的 workflow run。
2. 选择第一个启用阶段。
3. 向 system transform 注入该阶段指令。

子会话、只读会话和没有 dirty revision 的会话不创建 run。每次 transform 先从服务端恢复活动 run，进程重启后可以继续未完成阶段。

system prompt 只承担上下文说明，不再承担自动阶段的唯一调度职责。`smartx-workflow` 监听主会话 `session.status=idle`；若服务端仍有非终态 run，则使用已有 `promptAsync + SubtaskPart` 确定提交 reviewer，或直接调用 strategy-service `/mcp` 推进调试和回测。调度使用 run revision、稳定 requestKey 和进程内 single-flight 防重。

## 审查阶段

复用现有 reviewId/sessionId、running 预写、`smartx_save_review` 校验和自动修复队列。新增 runId/codeRevision 绑定和轮次更新。

- 全部 item 为 passed：审查阶段通过，选择下一启用阶段。
- 第 1、2 轮失败：保存结果，主 agent 修复，使用同一 run 的下一轮复审。
- 第 3 轮失败：保存结果后转 `review_exhausted`，不再执行最后一次未验证修复，也不进入调试。

手工审查命中当前活动 revision 时复用该 run；没有自动 run 时保持现有独立审查行为。

自动 reviewer 输出内部结构化中文 JSON。workflow 必须严格校验 state、summary、items 和 suggestions，并按 items 聚合最终状态；校验通过后直接保存结构化 review，不再要求主模型转换 MCP 参数。原始 reviewer JSON 只允许作为受限诊断日志，不能写入用户可见字段或发送到前端。

插件重启后若 workflow 仍为 `review/fixing`，通过 `get_review(workspacePath, sessionId)` 读取同 session 最近一次 failed review，并重建中文修复上下文；进程内 Map 不作为恢复事实来源。

## 调试阶段

保留 MCP 工具名 `start` 和 `logs`，扩展参数和 v1 结果：

- workflow 注入 `workspacePath`、`sessionId`、`requestKey`，删除模型提供的身份字段。
- service 校验 session 归属，从 workspace basename 推导扩展名。
- `start` 执行 SmartX 扩展加载与启动、启动后 status 确认，返回 debugId、startedAt、日志游标和 live 状态；加载阶段错误和后续增量日志共同覆盖基础语法检查。
- `logs` 接收 debugId，从启动游标后观察增量日志，返回 `passed|failed`、issues 和截断日志摘要。
- MCP `start` 在外部启动前先把稳定 requestKey、确定性 debugId 和启动前 cursor 写入 workflow。启动响应或进程中断后，重试先检查持久化 claim 对应扩展是否 live；live 时补写 running，未 live 时才使用同一 claim 启动。requestKey/cursor 不进入前端 JSON。
- 没有活动自动 debug run 时，手工 `smartx_start/logs` 保持原参数和原行为；workflow 不接管其他 MCP server 的同后缀工具。
- 手工 `start` 的 MCP schema 保持 `name` 必填；自动路径仍由服务端从可信 workspace 推导名称。

致命问题至少覆盖 SyntaxError、Traceback、ImportError、ModuleNotFoundError、启动失败、扩展不存在和异常退出。通过条件是 live=true、start 成功且观察窗口没有 fatal issue。

自动路径由 workflow 直接向本地 `/mcp` 发送 JSON-RPC `tools/call`，顺序固定为 `start -> logs`；手工模型工具调用继续走原 OpenCode MCP 路径。两条路径复用同一 strategy-service handler、可信身份校验和幂等键。

## 回测阶段

workflow 在调试通过后调用现有 `run_backtest`，使用 `pipeline:<runId>` 作为稳定 requestKey。strategy-service 将返回的 backtest ID 绑定到 workflow run。

同 requestKey 的重试返回既有 backtest；当 workflow 已为 `backtest/running` 且 backtest ID 相同，绑定操作直接幂等成功，不重复推进 revision。

backtest worker 保存 running/done/failed 时同步推进 workflow run；不通过模型轮询维持生命周期。前端继续通过现有 scoped HTTP、`backtest.updated` 和 revision 合并回测详情。

## 前端同步

在 Workbench 挂载 `useWorkbenchWorkflowSync`：进入 workspace/session 时读取快照，监听 `workflow.updated`；同 ID 按 revision、不同 ID 按 updatedAt 单调合并。时间线增加 coding/review/debug/backtest 节点，done 使用中性流程类别；审查和回测详情仍由现有面板负责。

设置页在一个“自动工作流”区块展示三个 Switch。开关独立，不在 UI 强制联动；说明文字展示固定执行顺序和失败停链规则。

前端 review 契约保持 `summary/items/suggestions`，不新增原始 JSON 字段，也不在聊天、面板或时间线渲染内部传输文本。解析异常只展示中文通用错误。

## 兼容与回滚

- 三个开关默认关闭，发布后现有用户行为不变。
- 新 MCP 参数保持 name 等旧参数兼容；只有带可信 session/run 上下文时写流水线状态。
- 前端无法解析 workflow 事件时忽略新视图，不影响审查和回测旧面板。
- 可通过关闭三个开关快速停用自动流程，手工入口继续工作。
