# Strategy Workflow Config

## 场景：可配置工作区分析与流程图

### 1. 范围与触发条件

- 修改 `strategy-front` 工作台系统设置、`strategy-service` 系统配置，或 `smartx-workflow` baseline 编排时，必须遵守本契约。
- 工作区分析和流程图是同一个安装级 baseline 能力，不得拆成可产生无效组合的独立开关。

### 2. 签名

- 读取：`GET /api/system/config`
- 保存：`PUT /api/system/config`
- 配置：`workflow.baseline: boolean`
- 存储：`config.workflow_baseline integer not null default 0`
- workflow 服务地址：`STRATEGY_SERVICE_URL`

### 3. 契约

```json
{
  "workflow": {
    "baseline": false
  }
}
```

- 默认值必须为 `false`；旧数据库通过幂等增量迁移补列，已有 analysis/flowchart 数据不得删除。
- workflow 在每次 system transform 开始时读取一次开关，并在同一轮 before/after hook 中复用该快照。
- 配置缺失、服务地址缺失、非 `2xx` 或读取异常均按关闭处理，不得猜测为开启。
- 关闭时不得注入 boot/chart/refresh/final baseline 提示，也不得启动 `workspace-analyzer`、`strategy-flowchart-generator` 或调用 `save_analysis`、`save_flowchart`、`refresh_workspace`。
- 关闭时 clean workspace 的 baseline 生命周期视为 ready；dirty workspace 仍保持 dirty 以驱动 project memory 保存，但 baseline 专属的 refresh/final/close 分支必须显式跳过。review、backtest、Python 和普通开发流程不得被关闭。
- 关闭期间发生写入时，已有 analysis/flowchart pending 必须立即失效，并将本地基线状态重置为 refresh 起点；重新启用后必须重新分析，不得保存旧 pending 或用旧流程图清除 dirty。
- 关闭不清除历史快照；前端有历史结果时继续只读展示，无历史结果时显示未启用而不是等待中。
- 配置切换从下一轮 system transform 生效，不强制中止已经启动的子任务。
- `smartx-helper` 与 `smartx-workflow` 必须匹配发布；helper 静态提示词不得无条件要求 baseline。

#### 状态职责不变量

| 状态或分支 | 所有权 | 关闭 baseline 时的行为 |
| --- | --- | --- |
| `dirtyState`、`projectMemory.needsSave` | 通用工作流 | 继续记录并驱动 `save_project_state`，不得伪装成 clean/ready |
| analysis/flowchart pending | baseline | 无新写入时保留；关闭期间一旦写入，立即作废并重置到 refresh 起点 |
| refresh/final/close baseline 提示 | baseline | 必须以本轮 `enabled` 显式旁路，不能只依赖 `life` 的间接状态 |
| 普通写入与 Python taint | 通用工作流入口 | 必须携带同一轮配置快照，确保 pending 失效判断与 before/after 一致 |

#### 蓝图文案契约

- analysis 和 flowchart 面向不写代码的策略研究、交易和运营人员；源码仅作为事实证据，最终文案必须描述业务条件、市场信息、指标计算、交易动作、风控规则和状态结果。
- analysis 条目和 flowchart 节点不得出现文件名、函数名、变量名、参数名、枚举名、调用语法或 Python、JavaScript、SDK、API 等开发术语。
- 函数调用必须改写为业务含义，订阅和回调必须改写为触发关系，计算函数必须改写为指标含义；重试、范围扩大、默认值和上限等实际行为必须保留。
- 禁止在 `strategy-front` 展示层用正则猜测或替换技术标识符；前端原样展示已保存快照，语义转换由生成端负责。
- 修改该契约时必须同步 `packages/smartx-workflow/agents/{workspace-analyzer,strategy-flowchart-generator}.md`、`packages/strategy-service/internal/asset/workspace/agents/` 中的同名发布资产，以及 `packages/smartx-workflow/src/note.ts` 的运行时提醒。
- 历史 analysis/flowchart 快照不自动改写；新规则只对下一次 baseline 分析与流程图生成生效。

### 4. 校验与错误矩阵

| 条件 | 结果 | 行为 |
| --- | --- | --- |
| `workflow.baseline === true` | 开启 | 继续现有 baseline 生命周期 |
| 字段缺失或为 `false` | 关闭 | 不触发分析和流程图 |
| system config 读取失败 | 关闭 | fail closed，下一轮重新读取 |
| 关闭时调用 baseline agent/MCP | 工具错误 | 在执行前拒绝，不产生 baseline 副作用 |
| 关闭期间发生代码写入 | dirty | 保留 dirty 与 project memory 保存需求 |
| 已有分析或流程图 | 历史数据 | 保留并允许查看，不自动刷新 |

### 5. Good / Base / Bad Cases

- Good：用户开启后，下一轮依次执行分析、保存分析、生成流程图和保存流程图。
- Base：用户关闭后继续开发、审查和回测；侧栏显示未启用或最后一次历史结果。
- Bad：只在 `session-message-list.tsx` 隐藏工具卡片，后台仍然执行分析和流程图。

### 6. 必需测试

- 配置存储：默认关闭、开启值保留、旧表迁移可重复执行且旧行得到 `0`。
- workflow：配置读取成功/缺失/失败、关闭时不注入、相关工具执行前拒绝、普通写入仍标记 dirty、下一轮切换生效。
- 蓝图文案：`noteAnalysis()` 必须保留非技术读者、禁止源码标识符和业务化改写示例的断言；两份 Agent 配置必须同步相同输出约束。
- 前端：类型检查、定向 ESLint 和生产构建；关闭时不得显示等待分析/流程图。
- 从包目录运行 `go test -p 1 ./...`、`go build ./...`、`go vet ./...`、`bun test`、`bun typecheck` 和 `bun run build`。

### 7. Wrong vs Correct

错误：

```ts
if (!cfg.workflow.baseline) return // 跳过整个 workflow，连 review/project memory 一起丢失
```

正确：

```ts
const state = view({ ...input, baseline: cfg.workflow.baseline })
// 只旁路 baseline 生命周期，其他工作流继续执行。
```

## 场景：策略开发后的自动审查、调试与回测

### 1. 范围与触发条件

- 修改系统自动化开关、`workflow_runs`、review 自动触发、MCP `start/logs/run_backtest` 串联或工作台流水线同步时，必须遵守本契约。
- 自动流程只由主会话成功的代码写入或执行触发；纯问答、只读探索、子会话和没有 dirty revision 的会话不得启动真实策略或回测。

### 2. 签名

- 配置：`workflow.review|debug|backtest: boolean`，默认均为 `false`。
- 创建：`POST /api/workbench/workflow`。
- 快照：`GET /api/workbench/workflow?workspacePath=<path>&sessionId=<id>`。
- 推进：`PUT /api/workbench/workflow`。
- 事件：`workflow.updated`。
- 存储：`workflow_runs`，唯一键 `(workspace_path, session_id, code_revision)`，内部字段包含 `debug_cursor` 和 `debug_request_key`，每次有效推进递增 `revision`。
- 自动调试：MCP `start -> logs`，start requestKey 固定为 `pipeline:<workflowId>:start`；自动回测：MCP `run_backtest`，requestKey 固定为 `pipeline:<workflowId>`。
- 手工 MCP `start` 的公开 schema 继续要求 `name`；带可信 `workflowId` 的自动路径由服务端从 workspace 覆盖名称。
- fixing 恢复：MCP `get_review(workspacePath, sessionId)` 返回该 session 最近一次持久化审查。

### 3. 契约

```json
{
  "id": "workflow_xxx",
  "workspacePath": "D:/workspace/demo",
  "sessionId": "ses_xxx",
  "codeRevision": "1784196595000",
  "stage": "review",
  "state": "requested",
  "reviewRound": 0,
  "debugId": "",
  "backtestId": "",
  "revision": 1,
  "updatedAt": 1784196595000
}
```

- 顺序固定为 review -> debug -> backtest；关闭的阶段跳过，开启的阶段只有通过后才能进入下一阶段。
- review 最多三轮，任意一轮全部 item 为 passed 后立即继续；第三轮失败必须保存并转 `review_exhausted`，不得执行未复审的最后修复或进入调试。
- baseline 关闭时，system save 分支只能跳过 analysis/flowchart pending；review pending 必须继续注入 `save_review`。开启 baseline 且 review 通过时，先完成 final snapshot 再调试。
- workflow 在每次 system transform 读取服务端配置和活动 run；before/after 复用同轮配置。内存 Map 只做当前工具链缓存，SQLite/HTTP 是恢复事实来源。
- 主会话进入 `session.status=idle` 时，idle 驱动必须重新读取配置和服务端 run。若尚无 run，但当前会话刚产生了新的 dirty revision，则由 idle 驱动先创建 run，再按持久化阶段续跑；不得假设代码写入后一定还会发生下一次 system transform。
- dirty revision 必须记录产生变更的 session；另一个主会话的 idle 事件不得接管该 revision。三个自动开关全关时，idle 驱动不得创建 run 或调用 reviewer/debug/backtest。
- system transform 创建或恢复自动 run 前必须查询 session parent；`session.created` 内存集合只做快速缓存，OpenCode/plugin 重启后的子会话仍不得触发流水线。
- review 调度使用 `requested -> dispatching -> running`。`dispatching` 与进程内 single-flight 共同阻止重复 idle 启动多个 reviewer；超时的 `dispatching` 可恢复为 `requested` 后重试。
- review 进入 `fixing` 后若插件重启，idle 驱动必须用 workspace/session 查询最近一次 `failed` 审查，重建中文修复上下文；不得因为进程内 `reviewFixes` 为空而终止仍可恢复的 run。
- 自动 `start/logs` 的 workspace/session/workflowId/requestKey/debugId 由 workflow 注入；服务端校验 session 归属并从 workspace 推导扩展名。start 必须在启动后复查 live；logs 只读取启动游标后的日志，再次复查 live，并返回脱敏、有限的日志行。
- 只有精确的 `smartx_start`、`smartx_logs` 且当前 session 存在活动 debug-stage run 时，workflow 才覆盖可信参数；没有自动 run 的手工启动和日志调用必须原样透传，其他 MCP server 的 `*_start`、`*_logs` 不得误匹配。
- 自动 start 调用 SmartX 前必须先将稳定 `debug_request_key`、确定性 debug ID 和启动前 `debug_cursor` 写入 `workflow_runs`；三个内部字段都不得进入 HTTP/WebSocket JSON。若进程或响应在外部启动后中断，重试先用持久化 claim 检查同名扩展：已存活则补齐 `debug/running`，未存活才使用同一 debug ID/cursor 启动。首次新 claim 不得误复用此前手工启动的同名实例。
- logs 至少分类 SyntaxError、Traceback、ImportError、ModuleNotFoundError、启动失败和异常退出。通过条件是 start 成功、live=true 且新增日志无 fatal issue。
- 回测继续使用现有 backtest worker。workflowId 绑定后立刻对账一次终态，后续由 `backtest.updated` 推进，不能用浏览器或模型轮询维持生命周期。同一 workflow 在 `backtest/running` 且 backtest ID 相同时，重复绑定必须返回幂等成功。
- 前端同 workflow ID 按 revision 单调合并；同 workspace/session 的不同 workflow ID 按 `updatedAt` 判断新旧，迟到 HTTP、空快照和其他 scope 事件不得覆盖较新的 Socket run。`done` 使用中性“流程”时间线类别，不得默认标成回测。
- reviewer 原始 JSON 必须在任何可能失败的远程保存之前替换为中文摘要。保存失败可以让流水线失败，但不得把内部 JSON 留在父会话工具输出或前端视图中。

### 4. 校验与错误矩阵

| 条件 | 结果 | 行为 |
| --- | --- | --- |
| 三个自动开关全关 | 不创建 run | 保持现有手工行为 |
| 代码写入后模型在下一次 transform 前直接 stop | idle 创建 run | 只为产生该 dirty revision 的主会话创建并继续审查 |
| 其他主会话收到同 workspace idle | 跳过 | 不接管别的 session 产生的 dirty revision |
| workspace/session/codeRevision 缺失或 session 错配 | `400/404` | 不创建 run，不泄露其他会话 |
| 同 scope + revision 重试 | 返回原 run | 不重复 reviewer/start/backtest |
| 无活动自动 debug run 的 `smartx_start/logs` | 手工调用 | 参数原样透传，不注入 workflow 身份 |
| 恢复的 child session 执行 system transform | 跳过 | 不创建或推进自动 run |
| 阶段倒退或 terminal 后继续推进 | 参数错误 | 保留原终态 |
| 第三轮审查未通过 | `review_exhausted` | 停止，不调用 start/logs/backtest |
| start 失败或启动后不存活 | `done/failed` | 保存脱敏原因，停止 |
| start 已成功但响应/after hook 丢失 | `debug/running` | 服务端已绑定 debug ID；重试返回幂等结果，不重新启动 |
| start claim 已落库但响应或进程中断 | 恢复 claim | requestKey 不同则拒绝；相同 key 先检查 live，再补绑定或启动 |
| service 在 start 与 logs 之间重启 | 恢复 debug | 从 workflow cursor 重建，只读取启动后的增量日志 |
| fixing 时插件重启 | 恢复审查 | 按 workspace/session 读取 failed review 并继续主 agent 修复 |
| backtest 已 running 且 ID 相同 | 幂等成功 | 不重复更新 workflow，不把活动回测标记失败 |
| 手工 start 缺少 name | schema/运行期错误 | 不调用 SmartX；自动 workflow 不依赖模型提供的 name |
| logs 出现新增 fatal | `done/failed` | 保存分类和有限日志，停止 |
| backtest done/failed 先于 workflow 绑定事件 | 绑定后主动对账 | 不丢最终状态 |
| HTTP 快照晚于高 revision Socket | 忽略快照 | UI 不回退 |

### 5. Good / Base / Bad Cases

- Good：三个开关全开，代码写入后 review 第一轮通过，start 和增量 logs 通过，创建一条 pending 回测；worker 完成后 workflow 到 `done/passed`。
- Base：只开 debug/backtest，代码完成后跳过 review；调试通过后进入回测。只开 review 时通过后直接 `done/passed`。
- Bad：用聊天文本推断回测完成、baseline 关闭时丢掉 review pending、第三轮失败后未经复审继续调试，或用历史 Traceback 判定本次启动失败。

### 6. 必需测试

- 配置/迁移：三个字段默认关闭、保存保留、旧 config 表幂等补列。
- service：workflow 创建幂等、session 隔离、阶段单调、第三轮终态、快速 backtest 终态对账、running backtest 同 ID 重试、start 前 debug claim、requestKey/cursor 迁移与隐藏、日志游标和 fatal 分类。
- workflow：dirty 才触发、事件已知和重启恢复的子会话都不触发、三个阶段顺序、审查后单 transform 续跑、关闭阶段跳过、baseline 关闭仍保存 review、第三轮停止、自动 MCP 参数覆盖和手工 start/logs 透传。
- idle：无既有 run 的 dirty stop 能创建并只调度一个 reviewer；其他 session 和三个开关全关均不创建；保存 review 抛错后父会话输出仍为中文摘要且不含 `{`；fixing 重启从同 session 持久化审查恢复。
- frontend：解析 fail-closed、scope 隔离、同 ID revision 单调、不同 ID updatedAt 单调、迟到 HTTP/空快照不覆盖 Socket、刷新恢复和 done 中性分类。
- 从三个包目录运行 Go test/build/vet、Bun tests/typecheck/build 和触及文件 ESLint；仓库既有失败必须单独列出。

### 7. Wrong vs Correct

错误：

```ts
if (!cfg.workflow.baseline) return // review pending 也永远无法保存
```

正确：

```ts
if (!cfg.workflow.baseline && pending.kind !== "review") return
```

错误：浏览器或模型每 10 秒轮询回测，再根据文本决定流水线是否完成。

正确：`run_backtest` 只绑定持久化 run ID；strategy-service worker 先保存 backtest revision，再通过事件和终态对账推进 workflow。

错误：用 `tool.endsWith("_start")` 接管所有 MCP 启动工具，或在 SmartX start 成功响应后只靠客户端 after hook 保存 debug ID。

正确：只在活动自动 run 中精确接管 `smartx_start/logs`；MCP handler 在成功响应前持久化 debug ID 和 cursor，客户端 hook 只负责继续编排。

错误：idle 只调用 `loadRun()`，查不到 run 就返回，假设代码写入后总会再执行一次 system transform。

正确：idle 发现当前 session 拥有更新的 dirty revision 时先幂等创建 run，再从持久化阶段继续调度。

错误：先调用 SmartX start，再把随机 debug ID 写入 workflow；或把 `backtest/running` 的同 ID 重试当作非法状态。

正确：start 前持久化稳定 requestKey、确定性 debug ID 和 cursor；回测重复绑定只有 ID 不一致时才冲突。
