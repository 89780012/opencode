# 策略全流程自动化

## Goal

在策略工作台中提供安装级的自动审查、自动调试和自动回测开关。全部开启后，用户只需输入一次开发需求，主会话在完成代码修改后依次执行审查、修复、SmartX 启动与日志检查、异步回测，并在工作台持续展示可信状态。

## Background

- `strategy-front` 已有系统配置面板、审查面板、回测面板和 WebSocket 状态同步。
- `smartx-workflow` 已有显式审查意图、最多三轮审查修复、MCP 身份绑定和回测工具门禁，但不会在代码完成后自动启动完整流水线。
- `strategy-service` 已有安装级配置、审查持久化、MCP `start`/`logs`、异步回测、SQLite 和 WebSocket；`logs` 目前只返回日志文本，不能形成可靠调试结论。
- 现有 AI 回测任务禁止回测完成后自动唤醒 AI。本任务只要求自动启动并跟踪回测到终态，不自动追加模型消息或生成第二轮总结。

## Requirements

- R1：系统设置必须新增“自动审查”“自动调试”“自动回测”三个独立开关，默认关闭，并持久化到安装级配置。
- R2：三个阶段按审查、调试、回测固定顺序执行；关闭的阶段直接跳过，开启的阶段必须成功后才能进入下一个开启阶段。
- R3：只有主会话发生明确的源码写入并准备收口时才能自动创建流水线；Python/Bash 调试执行只记录 workspace 活动和 project memory，不得单独生成代码 revision 或触发审查。纯问答、只读分析、子 agent 和未修改代码的会话不得误触发。
- R4：自动审查最多三轮，任意一轮全部检查项为 `passed` 后立即进入下一阶段；未通过时主 agent 修复并复审，第三轮仍未通过则以 `review_exhausted` 停止，不进入调试。
- R5：手工审查继续可用；同一 workspace/session/code revision 的手工和自动请求必须幂等，不能并发启动两个 reviewer。
- R6：自动调试必须依次调用 strategy-service MCP `start` 和 `logs`。workflow 必须覆盖模型提供的 workspace/session/requestKey，服务端从 workspace 推导策略名。
- R7：调试通过必须同时满足启动命令成功、扩展启动后仍存活、观察窗口内没有新的致命日志。至少识别语法错误、Traceback、模块导入失败、启动失败和异常退出；历史日志不得导致本次误判。
- R8：调试失败必须保存脱敏后的结构化问题并停止流水线；不得自动修改代码后绕过重新审查，用户可在修复后重新发起一条新 revision 流水线。
- R9：自动回测复用现有 `run_backtest`、后台 worker、SQLite、HTTP/WebSocket 和 revision 合并，不新增第二套回测生命周期。
- R10：回测启动必须使用当前 workspace/session 和稳定 requestKey；重复工具调用、模型重试、页面刷新或服务恢复不得创建第二条远端任务。
- R11：流水线状态必须按 workspace/session 隔离并可恢复，至少记录 code revision、当前阶段、审查轮次、调试结果、backtest ID、错误、revision 和更新时间。
- R12：工作台必须展示流水线各阶段及失败原因；后台更新不得自动抢占用户正在查看的历史审查或回测报告。
- R13：保留现有手工审查、手工回测、系统日志、工作区基线和旧配置兼容行为。
- R14：自动阶段不得仅依赖 system prompt 约束模型调用工具。主会话以普通 `stop` 结束但 workflow 仍处于非终态时，`smartx-workflow` 必须通过已有 `session.status=idle` 事件恢复并继续调度。
- R15：`strategy-reviewer` 只向主 agent 返回普通中文审查报告，不承担 JSON schema 输出。主 agent 必须理解报告并调用 `smartx_save_review` 保存结构化 `summary/items/suggestions`；`smartx-workflow` 只绑定可信身份、等待 MCP 成功并推进状态，不解析 reviewer 文本结论。
- R16：自动调试和自动回测由 `smartx-workflow` 直接调用 strategy-service 的现有 `/mcp` `tools/call`，不得再依赖主模型主动选择 `start`、`logs` 或 `run_backtest`。
- R17：审查失败后的代码修复仍由主 agent 完成；无代码进展的自动恢复必须有界，超过上限明确失败，不得无限续跑或静默退出。
- R18：一次自动 run 的多次内部 `promptAsync` 必须携带稳定 workflowId；工作台只隐藏 synthetic 用户提示，审查/修复的 assistant 与工具输出仍在主会话可见，workflow 阶段状态和运行中进度放在右侧可展开收起的悬浮面板；直接 MCP 调试/回测只在 done/error 后向主会话补充终态结果。
- R19：reviewer 报告返回后、主 agent 保存前的插件重启必须可恢复；workflow 从持久化会话消息按 workflowId 重建 reviewId 和普通文本报告，不得因进程内 pending 丢失直接终止。
- R20：停止操作必须先发起 OpenCode 会话 abort，workflow 取消独立执行且不得阻塞 abort；失败终态必须保留实际失败阶段，前端不得把未执行阶段显示为完成或失败。

## Acceptance Criteria

- [x] AC1：三个开关可独立保存、刷新恢复，旧数据库升级后默认全部关闭。
- [x] AC2：全部开启时，一次开发需求按 coding -> review -> debug -> backtest 顺序推进，回测进入并最终到达现有 done/failed 终态。
- [x] AC3：任意审查轮次通过立即进入调试；第三轮未通过停在 review_exhausted，且没有 start/logs/backtest 调用。
- [x] AC4：自动审查关闭时可直接进入调试；自动调试关闭时审查通过后可直接回测；三个开关全关时现有行为不变。
- [x] AC5：纯只读会话、子会话、重复 transform、重复 tool call 和同 revision 重试不会重复创建流水线或副作用任务。
- [x] AC6：语法错误、Traceback、ImportError/ModuleNotFoundError、启动失败和异常退出均形成 debug_failed；旧日志中的同类文本不影响新启动。
- [x] AC7：调试通过需要 start 成功、运行态确认和无新增致命日志，单纯“未看到 error”不能通过。
- [x] AC8：自动回测绑定现有 run ID，WebSocket 断线、页面刷新或重新进入工作区后可通过 HTTP/SQLite 恢复。
- [x] AC9：流水线事件按 revision 单调合并，旧状态不能覆盖新终态，不同 workspace/session 不串数据。
- [x] AC10：三个包的定向测试、完整包级 typecheck/build 及 Go build/vet 通过；全量命令中的仓库既有失败单独列出。
- [x] AC11：模型在 review gate 注入后直接返回 `stop`，idle 驱动仍只启动一次 `strategy-reviewer`；普通中文审查报告返回主 agent 后，由主 agent 调用一次 `smartx_save_review`，成功前 workflow 保持 review pending/running。
- [x] AC12：自动流程通过 `/mcp` 确定调用 `start -> logs -> run_backtest`；重复 idle、重复回调和恢复不会产生重复副作用。
- [x] AC13：前端只接收并展示 MCP 持久化后的结构化审查字段；reviewer 不需要生成原始 JSON，普通中文报告仅作为主 agent 的内部转换输入。
- [x] AC14：纯 Python/Bash 调试不会在已有终态 run 后创建新审查；真实 edit/write/apply_patch 会生成新 revision，且 revision owner 不会被其他会话的运行活动接管。
- [x] AC15：同一 workflowId 的 reviewer、结果保存、自动修复等真实 assistant/工具消息保留在主会话并隐藏 synthetic 控制提示；右侧悬浮面板聚合展示阶段状态，不显示“已调用 task”等无关实现文案。
- [x] AC16：review/running 在 pending 丢失后可从同 workflowId 的最新已完成 reviewer tool part 恢复；历史 workflow 卡保留已接收终态，未知历史显示中性状态；手工 reviewer 仍显示“策略审查”。
- [x] AC17：多次自动 run 的输出按消息 workflowId 分别定位，审查结果按 reviewer tool part ID 精确关联；停止不等待 workflow HTTP 请求，review/debug/backtest 失败时后续阶段保持未执行。

## Out Of Scope

- 回测完成后自动唤醒 AI、追加对话消息或自动解释报告。
- 自动修复调试或回测阶段发现的问题并无限循环重试。
- 并行运行多个审查、调试或回测任务。
- 修改回测指标、图表和 SmartX 交易策略业务规则。
