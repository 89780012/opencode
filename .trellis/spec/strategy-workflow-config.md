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
| 普通写入与 Python taint | 通用工作流入口 | 都可更新 workspace 活动和 project memory；只有明确源码写入推进 code revision，Python/Bash 运行不得单独触发审查 |

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

## 场景：策略开发后的人工/自动审查、调试与回测

### 1. 范围与触发条件

- 修改系统自动化开关、`workflow_runs`、review 自动触发、MCP `start/logs/run_backtest` 串联或工作台流水线同步时，必须遵守本契约。
- 自动流程只由主会话成功的明确源码写入触发；Python/Bash 调试执行可标记 workspace 活动，但不得单独生成 code revision。纯问答、只读探索、子会话和没有代码 revision 的会话不得启动真实策略或回测。

### 2. 签名

- 配置：`workflow.review|debug|backtest: boolean`，默认均为 `false`。
- 创建：`POST /api/workbench/workflow`。
- 快照：`GET /api/workbench/workflow?workspacePath=<path>&sessionId=<id>`。
- 推进：`PUT /api/workbench/workflow`。
- 事件：`workflow.updated`。
- 存储：`workflow_runs`，唯一键 `(workspace_path, session_id, code_revision)`，内部字段包含 `debug_cursor`、`debug_request_key` 和 `resume_state`，每次有效推进递增 `revision`。
- 暂停/恢复：`PUT /api/workbench/workflow/cancel` 将活动 Run 写为 `paused`；`PUT /api/workbench/workflow/resume` 恢复最近一次暂停 Run。
- 自动调试：MCP `start -> logs`，start requestKey 固定为 `pipeline:<workflowId>:start`；自动回测：MCP `run_backtest`，requestKey 固定为 `pipeline:<workflowId>`。
- 人工 reviewer、`start` 和 `run_backtest` 也必须绑定持久化 Run；reviewer 仍要求用户明确请求，没有文本请求记录时仅由实际 `start/run_backtest` 使用 `manual:<callID>` 补建 Run。带可信 `workflowId` 的 debug 路径由服务端从 workspace 覆盖名称。
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
- 人工审查、调试和回测按同一条消息合并为 `manual:<messageID>` 阶段计划；没有源码 revision 时只执行明确请求阶段，有新源码 revision 时与自动开关合并。实际工具调用不得越过活动 Run 的前序阶段。
- baseline 和 project memory 只注入提示，不得通过通用 `gate` 阻断普通工具；阶段越序、子 session 越权和已关闭 baseline 能力仍必须在副作用前拒绝。
- review 最多三轮，任意一轮全部 item 为 passed 后立即继续；第三轮失败必须保存并转 `review_exhausted`，不得执行未复审的最后修复或进入调试。
- baseline 关闭时，system save 分支只能跳过 analysis/flowchart pending；review pending 必须继续注入 `save_review`。开启 baseline 且 review 通过时，先完成 final snapshot 再调试。
- workflow 在每次 system transform 读取服务端配置和活动 run；before/after 复用同轮配置。内存 Map 只做当前工具链缓存，SQLite/HTTP 是恢复事实来源。
- 成功收口使用 `done/passed`；失败必须使用实际阶段加 `failed`（例如 `review/failed`、`debug/failed`、`backtest/failed`），不得统一折叠为 `done/failed`。前端对旧 `done/failed` 数据只能根据精确 reviewId、debugId、backtestId 和对应持久化结果回退判断，不得把全部启用阶段视为已执行。
- 主会话进入 `session.status=idle` 时，idle 驱动必须重新读取配置和服务端 run。若尚无 run，但当前会话刚产生了新的 dirty revision，则由 idle 驱动先创建 run，再按持久化阶段续跑；不得假设代码写入后一定还会发生下一次 system transform。
- dirty 状态必须分别记录最近活动时间和源码 revision；revision 必须绑定产生写入的 owner session，另一个主会话的运行活动和 idle 事件不得接管。创建 run 以 codeRevision 是否变化判断，不得用 run.updatedAt 与本地活动时间比较。review/fixing 中的源码写入只设置当前修复上下文的 `changed=true`，必须保留当前触发 revision；只有终态后的新源码写入才能生成下一条 revision 和 workflow。三个自动开关全关时，idle 驱动不得创建 run 或调用 reviewer/debug/backtest。
- system transform 创建或恢复自动 run 前必须查询 session parent；`session.created` 内存集合只做快速缓存，OpenCode/plugin 重启后的子会话仍不得触发流水线。
- review 调度使用 `requested -> dispatching -> running`。`dispatching` 与进程内 single-flight 共同阻止重复 idle 启动多个 reviewer；超时的 `dispatching` 可恢复为 `requested` 后重试。
- review 轮次以服务端同 workflow ID 的 `reviewRound` 为事实来源；保存结果时必须使用远端轮次与本地 fixing 缓存轮次的较大值并限制到 3。本地缓存落后不得把第 3 轮降回第 1/2 轮；同一非终态 run 的 `reviewRound >= 3` 时必须在执行前拒绝再次启动 reviewer。`paused/cancelled` 的手工阶段调用先恢复同一 run 并继承轮次；`failed/review_exhausted/done` 等终态后的新手工审查链从第 1 轮开始。
- review 进入 `fixing` 后若插件重启，idle 驱动必须用 workspace/session 查询最近一次 `failed` 审查，重建中文修复上下文；不得因为进程内 `reviewFixes` 为空而终止仍可恢复的 run。
- review 为 `running` 且 pending 丢失时，idle 驱动必须从 OpenCode 持久化会话消息恢复：父 synthetic metadata 必须命中当前 workflowId，选择时间最新的 `strategy-reviewer` task，且只有 completed output 才能用 tool part ID 和普通文本报告重建 pending。不得误用上一轮或其他 workflow 报告。
- fixing 阶段只有明确源码写入才能设置 `changed` 并触发复审；运行测试、Python 调试或 Bash 执行不得伪装成代码修复，无源码进展时继续受有界恢复次数约束。
- 自动 `start/logs` 的 workspace/session/workflowId/requestKey/debugId 由 workflow 注入；服务端校验 session 归属并从 workspace 推导扩展名。start 必须在启动后复查 live；logs 只读取启动游标后的日志，再次复查 live，并返回脱敏、有限的日志行。
- 只有精确的 `smartx_start`、`smartx_logs` 且当前 session 存在或可补建 debug-stage run 时，workflow 才覆盖可信参数；其他 MCP server 的 `*_start`、`*_logs` 不得误匹配。
- 自动 start 调用 SmartX 前必须先将稳定 `debug_request_key`、确定性 debug ID 和启动前 `debug_cursor` 写入 `workflow_runs`；三个内部字段都不得进入 HTTP/WebSocket JSON。若进程或响应在外部启动后中断，重试先用持久化 claim 检查同名扩展：已存活则补齐 `debug/running`，未存活才使用同一 debug ID/cursor 启动。首次新 claim 不得误复用此前手工启动的同名实例。
- logs 至少分类 SyntaxError、Traceback、ImportError、ModuleNotFoundError、启动失败和异常退出。通过条件是 start 成功、live=true 且新增日志无 fatal issue。
- 回测继续使用现有 backtest worker。workflowId 绑定后立刻对账一次终态，后续由 `backtest.updated` 推进，不能用浏览器或模型轮询维持生命周期。同一 workflow 在 `backtest/running` 且 backtest ID 相同时，重复绑定必须返回幂等成功。
- 暂停回测只停止本地 worker；恢复前必须读取持久化回测。已有远端 btId 才能重启轮询，已终态则立即对账；本地任务已绑定但远端 btId 为空表示提交结果不确定，必须把 workflow 收敛为 failed 并要求重新发起，不得重复提交或永久停在 running。
- 前端同 workflow ID 按 revision 单调合并；同 workspace/session 的不同 workflow ID 按 `updatedAt` 判断新旧，迟到 HTTP、空快照和其他 scope 事件不得覆盖较新的 Socket run。`done` 使用中性“流程”时间线类别，不得默认标成回测。
- 自动 reviewer、结果保存和修复恢复产生的 synthetic 消息必须携带 `smartxWorkflowId` 与 action metadata。前端只隐藏 synthetic 用户消息，保留 assistant、工具和 reviewer 报告；当前 scope 已接收的 workflow 按 ID 保留快照，未知旧 ID 必须在绑定消息后显示中性历史卡，明确快照未加载且结果未知，不得隐藏或标成运行、成功、失败。阶段和终态来自持久化 `workflow.updated`，不得从聊天文本猜测；无 metadata 的手工 reviewer 保持手工审查文案。
- workflow 状态和运行中进度必须只在右侧独立的可展开/收起悬浮面板展示：审查显示轮次和已保存结论，调试显示启动/日志检查状态与 debug ID，回测显示任务 ID 与实时进度；不暴露 prompt、MCP 参数或内部工具调用。主会话不渲染 requested/running 进度卡；直接 MCP 调试/回测没有模型消息时，只根据持久化状态补充 done/error 终态结果。
- EventSource 初次连接和每次重连后必须重新读取 `/session/status`，避免漏掉 idle 事件后界面永久显示“正在回复”。会话打断必须立即发起 OpenCode abort，并独立调用 strategy-service 的原子暂停接口；暂停接口按 workspace/session 保留真实阶段、写入 `paused` 和安全 `resume_state`，前端不得先 GET 再携带可能过期的 stage PUT。strategy-service 缓慢或不可用不得延迟 abort，idle 驱动读取到 paused 后直接返回。用户发送精确“继续/接着/恢复/resume”时才恢复同一 Run；“继续修改策略”等普通句子不得误恢复。历史 `cancelled` 数据允许显式恢复以兼容升级。
- reviewer 只返回普通中文审查报告，不要求 JSON，也不由 workflow 解析 schema 或用字符串推断最终状态。workflow 把报告与可信 reviewId/session/workspace 上下文交给主 agent；主 agent 调用 `smartx_save_review` 后，workflow 只根据成功 MCP 参数和服务端结果推进状态。
- `smartx_save_review` 成功后的 after hook 必须先按 workspace/session 重新读取同一 workflow ID 的服务端快照，再计算 reviewRound 和终态更新；进程内 Map 可能因上下文压缩、插件重启或重复 idle 落后。更新时不得降低远端 reviewRound；远端已是相同终态时按幂等成功处理，远端已被其他流程推进为不同终态时记录跳过原因，不得把已保存的审查结果改报为保存失败。

### 4. 校验与错误矩阵

| 条件 | 结果 | 行为 |
| --- | --- | --- |
| 三个自动开关全关且无人工请求 | 不创建 run | 普通开发保持不变；人工审查/调试/回测仍按请求创建 Run |
| 仅执行 Python/Bash 调试且源码未写入 | 不创建新 run | 只更新 workspace 活动/project memory，不再次审查 |
| 终态 run 后明确源码写入 | 新 code revision | 创建新 run；其他会话运行不得接管 owner |
| 代码写入后模型在下一次 transform 前直接 stop | idle 创建 run | 只为产生该 dirty revision 的主会话创建并继续审查 |
| 其他主会话收到同 workspace idle | 跳过 | 不接管别的 session 产生的 dirty revision |
| workspace/session/codeRevision 缺失或 session 错配 | `400/404` | 不创建 run，不泄露其他会话 |
| 同 scope + revision 重试 | 返回原 run | 不重复 reviewer/start/backtest |
| 无活动 debug run 的 `smartx_start` | 人工 Run | 在副作用前补建 Run 并注入可信 workflow 身份 |
| 恢复的 child session 执行 system transform | 跳过 | 不创建或推进自动 run |
| 阶段倒退或 terminal 后继续推进 | 参数错误 | 保留原终态 |
| 第三轮审查未通过 | `review_exhausted` | 停止，不调用 start/logs/backtest |
| 远端为第 3 轮、本地 fixing 缓存仍为第 1/2 轮 | `review_exhausted` | 以远端轮次聚合；不得继续 fixing 或启动第 4 轮 reviewer |
| 旧 run 已通过、失败或耗尽后再次手工审查 | 新的手工审查链 | 按 1、2、3 递增，第三轮失败后停止，不继承旧 run 的轮次 |
| paused/cancelled run 再次调用人工阶段 | 恢复同一 run | 保留 workflow ID、阶段和 reviewRound，不重置三轮限制 |
| fixing 阶段源码写入 | 当前 run 已修复 | 设置 `changed=true` 并复审同一 workflow；不得生成新 code revision |
| reviewer 返回普通中文或 Markdown 报告 | review pending | 不直接保存 terminal；交给主 agent 转换并调用 `smartx_save_review` |
| reviewer 返回空报告 | review pending | 注入“未返回审查报告”，由主 agent 保存 error；不得伪造 passed |
| reviewer 完成后插件在 MCP 保存前重启 | 恢复 review pending | 从同 workflowId 的最新 completed task 消息恢复，不把 run 直接标记失败 |
| 上下文压缩后延迟保存第 3 轮 failed 审查 | `review_exhausted` | after hook 以远端第 3 轮快照推进，不得用本地第 2 轮写回 fixing 或收到 `400` |
| 第 3 轮仅含 passed/warning | 进入下一阶段或 done/passed | 保留建议，不进入 fixing/review_exhausted |
| 仅启用自动调试或自动回测 | 右侧 workflow 面板 | 无 synthetic 消息时在悬浮面板渲染过程数据，主会话只在 done/error 后补终态结果 |
| SSE 重连时服务端已 idle | 前端 idle | 重连后重新查询 session status，不保留旧 busy |
| 用户打断活动流程且阶段同时推进 | abort 与原子 `paused` 并行 | abort 不等待 workflow HTTP；服务端保留真实阶段和恢复点；停止本地回测 worker，已提交的远端回测可能继续运行 |
| paused 后发送精确“继续” | 恢复同一 Run | review 回到安全调度点；debug/backtest 有已绑定 ID 时恢复 running；下一次 idle 续跑 |
| 主 agent 的 review 参数结构或 state/items 不一致 | MCP 参数错误 | pending 保留，不推进 fixing/debug/backtest |
| start 失败或启动后不存活 | `debug/failed` | 保存脱敏原因，停止 |
| start 已成功但响应/after hook 丢失 | `debug/running` | 服务端已绑定 debug ID；重试返回幂等结果，不重新启动 |
| start claim 已落库但响应或进程中断 | 恢复 claim | requestKey 不同则拒绝；相同 key 先检查 live，再补绑定或启动 |
| service 在 start 与 logs 之间重启 | 恢复 debug | 从 workflow cursor 重建，只读取启动后的增量日志 |
| fixing 时插件重启 | 恢复审查 | 按 workspace/session 读取 failed review 并继续主 agent 修复 |
| backtest 已 running 且 ID 相同 | 幂等成功 | 不重复更新 workflow，不把活动回测标记失败 |
| 手工 start 缺少 name | schema/运行期错误 | 不调用 SmartX；自动 workflow 不依赖模型提供的 name |
| logs 出现新增 fatal | `debug/failed` | 保存分类和有限日志，停止 |
| backtest done/failed 先于 workflow 绑定事件 | 绑定后主动对账 | 不丢最终状态 |
| HTTP 快照晚于高 revision Socket | 忽略快照 | UI 不回退 |

### 5. Good / Base / Bad Cases

- Good：三个开关全开，代码写入后 review 第一轮通过，start 和增量 logs 通过，创建一条 pending 回测；worker 完成后 workflow 到 `done/passed`。
- Base：只开 debug/backtest，代码完成后跳过 review；调试通过后进入回测。只开 review 时通过后直接 `done/passed`。
- Bad：用聊天文本推断回测完成、baseline 关闭时丢掉 review pending、第三轮失败后未经复审继续调试，或用历史 Traceback 判定本次启动失败。

### 6. 必需测试

- 配置/迁移：三个字段默认关闭、保存保留、旧 config 表幂等补列。
- service：workflow 创建幂等、session 隔离、阶段单调、第三轮终态、快速 backtest 终态对账、running backtest 同 ID 重试、start 前 debug claim、requestKey/cursor 迁移与隐藏、日志游标和 fatal 分类。
- workflow：dirty 才触发、事件已知和重启恢复的子会话都不触发、三个阶段顺序、审查后单 transform 续跑、关闭阶段跳过、baseline 关闭仍保存 review、第三轮停止且第 4 轮 reviewer 在执行前被拒绝、fixing 写入保留当前 code revision、自动 MCP 参数覆盖和手工 start/logs 透传。
- idle：无既有 run 的 dirty stop 能创建并只调度一个 reviewer；其他 session 和三个开关全关均不创建；reviewer 普通中文报告进入 pending，主 agent 保存成功前 run 保持 running；fixing 重启从同 session 持久化审查恢复。
- review 恢复：本地缓存为第 2 轮、服务端为第 3 轮时保存 failed，断言只发出 `review/review_exhausted/reviewRound=3`；另测 warning-only 保存为 passed 并继续下一阶段。
- frontend：解析 fail-closed、scope 隔离、同 ID revision 单调、不同 ID updatedAt 单调、迟到 HTTP/空快照不覆盖 Socket、刷新恢复、done 中性分类，以及同 workflowId 多轮消息聚合和 synthetic 提示隐藏。
- frontend：无 synthetic 消息的 debug/backtest workflow 仍渲染右侧悬浮面板；面板展示审查轮次/摘要、debug ID、backtest ID/进度，主会话不显示 requested/running 卡且只补 done/error 终态结果；SSE 重连后重新读取 session status。
- pause/resume：活动 workflow 更新为 paused 后发送 session idle，断言不再 dispatch 或调用 MCP；精确“继续”和暂停后重新调用当前人工阶段均恢复同一 Run，非精确继续文案不恢复；兼容 cancelled 恢复，回测暂停不落 failed，恢复后保持 single-flight。
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

错误：要求 `strategy-reviewer` 严格输出 JSON，并由 workflow 解析失败后直接把流水线标记为 failed。

正确：reviewer 返回普通中文报告；主 agent 理解报告并调用 `smartx_save_review`，MCP/strategy-service 只校验最终结构化参数，workflow 在保存成功后推进。

错误：用 `tool.endsWith("_start")` 接管所有 MCP 启动工具，或在 SmartX start 成功响应后只靠客户端 after hook 保存 debug ID。

正确：只在活动自动 run 中精确接管 `smartx_start/logs`；MCP handler 在成功响应前持久化 debug ID 和 cursor，客户端 hook 只负责继续编排。

错误：idle 只调用 `loadRun()`，查不到 run 就返回，假设代码写入后总会再执行一次 system transform。

正确：idle 发现当前 session 拥有更新的 dirty revision 时先幂等创建 run，再从持久化阶段继续调度。

错误：把每次成功 Bash/Python 调试都当成新代码版本，或把每次自动续跑渲染成一条新的 AI 回复。

正确：运行活动与源码 revision 分离；内部续跑按 workflowId 关联到右侧由事实状态驱动的工作流面板，同时保留主会话的 assistant、工具和阶段结果输出。

错误：保存审查结果时优先使用可能落后的 `fix.attempt`，或让 fixing 中的每次 `edit/write` 生成新 code revision。

正确：审查轮次取 `Math.max(fix.attempt, run.reviewRound)` 后限制到 3；fixing 写入只标记 `changed` 并沿用当前 workflow revision，终态后的新写入才创建新 run。

错误：先调用 SmartX start，再把随机 debug ID 写入 workflow；或把 `backtest/running` 的同 ID 重试当作非法状态。

正确：start 前持久化稳定 requestKey、确定性 debug ID 和 cursor；回测重复绑定只有 ID 不一致时才冲突。
