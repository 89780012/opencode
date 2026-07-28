---
name: smartx-backtest
description: 在 SmartX 工作区内依据 pythonApiBt.md 准备和审阅可回测 Python 策略，读取默认回测配置，按用户明确要求启动异步回测，查询当前会话的回测状态或历史，并解释已完成报告中的收益率、夏普、最大回撤和胜率。用户提到回测策略、回测参数、运行或重跑回测、回测进度、历史任务、失败原因或回测报告时使用；仅讨论设计、阅读代码或询问能力时不得启动回测。
---

# SmartX 回测

把策略代码和回测任务视为两层：使用 `references/pythonApiBt.md` 核对回测态 Python SDK，使用 strategy-service 的回测工具管理当前工作区的异步任务。不要用开发态 `pythonApiDev.md` 替代回测态文档，不要自行实现第二套回测循环，也不要用 `smartx_python` 直接运行插件来代替正式回测。

## 先判定意图

- 讨论方案、阅读代码、审阅策略或询问回测能力：只分析，不调用 `smartx_run_backtest`。
- 编写或修改回测策略：按 `references/pythonApiBt.md` 和 `demo.py` 核对入口、事件、订阅、下单与回报；用户没有同时要求运行时，到验证代码为止。
- 运行、重新运行、重试或“跑一下看看”：用户表达已经明确时直接启动，不额外要求确认，也不弹权限审批。
- 查询进度、历史或指定结果：只使用读取工具，不创建新任务。

## 读取顺序

1. 准备或审阅策略时，先读 `references/pythonApiBt.md` 开头的 API 全景图和 `demo.py`，再按本次使用的接口名、事件名或类型名搜索文档，只读取命中章节及其签名、参数、返回值和示例。
2. 准备调用回测工具时，以当前工具的输入 schema 和实际响应为准；只传 schema 明确支持的字段，不从 Python SDK 文档推断任务参数或状态。
3. 解释报告时，只读取 `done` 任务返回的实际 `summary`；不要根据示例、前端占位值或模型记忆补指标。

## 准备策略

1. 确认当前工作区就是要回测的 SmartX 插件，并定位真实入口；优先读取 `.strategy/meta.json`、`package.json`、README 和现有 Python 文件。`demo.py` 只是结构示例，不会自动成为工作区入口。
2. 列出本次会使用的 SmartX API，并在 `references/pythonApiBt.md` 中核对名称、签名、字段和枚举；文档未覆盖的能力不得用开发态 API 或其他交易框架补齐。
3. 把订阅、账户访问和下单初始化放到 `smart.on_init` 之后。使用一种 Bar 回调注册方式，避免同一事件被重复处理。
4. 保持每个标的的状态独立，消除不可达分支、重复赋值和依赖墙钟时间的信号。把委托提交与 `on_order`、`on_trade` 的最终回报分开处理。
5. 在启动回测前说明已检查的入口、标的、周期、信号、仓位与退出条件；示例中没有的业务规则不得声称已经实现。

## 启动任务

1. 默认不传 `config`，让服务使用已保存配置。用户只指定部分参数时，仅传这些字段作为本次 patch；不要补齐整份配置，也不要调用任何保存全局配置的接口。
2. 不传 `workspacePath`、`sessionId`、`pluginId` 或 `requestKey`。这些字段由 workflow 和 strategy-service 根据当前主会话绑定，模型输入不会被信任。
3. 每个明确的运行请求只调用一次 `smartx_run_backtest`。不要因为响应慢、工具重试或已有活动任务再次提交。
4. 对 `created`、`idempotent` 或 `active`，立即向用户返回任务 ID、当前状态和进度。对 `busy`，只说明当前无法创建任务，不猜测其他会话的信息。
5. `pending` 或 `running` 只表示任务已受理或正在执行。不要在同一轮中反复调用查询工具等待终态；后台 Manager 会独立推进任务，工作台通过 HTTP、WebSocket 和 revision 同步状态。

## 查询与解释

- 用户询问当前进度或历史时调用 `smartx_list_backtests`；默认条数已足够，只有用户需要更多历史时才提高 `limit`。
- 用户指定任务或询问具体结果时调用一次 `smartx_get_backtest`。若仍是 `pending` 或 `running`，报告真实状态和进度，不循环轮询。
- 只有 `status == "done"` 且 `hasResult == true` 时解释 `summary`。优先解释实际存在的 `total_return`、`sharpe_ratio`、`max_falldown` 和 `win_rate`，保留原始单位与精度。
- `summary.truncated == true` 时明确指出摘要被截断；缺少字段时写“结果未提供”，不要计算或猜测替代值。
- `failed` 时只说明工具返回的脱敏错误和可执行下一步。不要输出内部日志路径、远端原始结果、数据文件、账号或凭据。

## 完成检查

- 没有把代码讨论或代码修改误当成运行授权。
- 没有用 `smartx_python`、Shell 或自建循环代替 `smartx_run_backtest`。
- 没有伪造身份字段、持久化全局配置或重复创建任务。
- 没有把 `pending`、`running`、`active` 或 `busy` 描述为回测完成。
- 报告结论只来自当前会话中 `done` 任务的实际配置和 `summary`。
