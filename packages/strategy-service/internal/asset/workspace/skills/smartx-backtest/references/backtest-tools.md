# 回测工具契约

## 生命周期

```text
smartx_run_backtest
  -> strategy-service 校验当前 workspace/session
  -> 合并已保存配置与本次 patch
  -> 创建并返回 pending 任务
  -> 后台 Manager 启动 SmartX、查询进度并持久化状态
  -> pending -> running -> done | failed
```

启动请求只负责校验、落库和快返。任务不会依赖 MCP 请求继续运行，AI 也不会在完成时被自动唤醒。用户后续询问时再读取持久化状态。

## 工具

| 工具 | 模型提供的参数 | 用途与限制 |
| --- | --- | --- |
| `smartx_run_backtest` | 可选 `config` | 显式运行请求只调用一次；立即返回受理结果 |
| `smartx_list_backtests` | 可选 `limit` | 返回当前会话的轻量快照；默认 5，最大 20 |
| `smartx_get_backtest` | 必填 `id` | 返回当前会话内指定任务的状态、配置和有限 summary |
| `smartx_get_backtest_config` | 无 | 只读已保存的默认配置，不修改配置 |

不要提供 `workspacePath`、`sessionId`、`pluginId` 或 `requestKey`。workflow 会覆盖身份字段，服务端从 workspace 推导插件，并使用稳定 tool call ID 保证幂等。子 agent 不能调用这四个工具。

`smartx_` 是当前 MCP 配置名生成的固定工具前缀。不要改用其他前缀；工作台的回测工具卡与 HTTP 对账按 `smartx_run_backtest` 精确识别。

## 单次配置 patch

只传用户明确指定的字段。未知字段和 `null` 会被拒绝，布尔值 `false` 与数值 `0` 是有效的显式值。

| 字段 | 约束 |
| --- | --- |
| `startTime`、`endTime` | 必须能解析，且结束时间晚于开始时间；支持日期、分钟、秒或 RFC3339 形式 |
| `cash` | 必须大于 0 |
| `shStockSx`、`szStockSx` | 沪深佣金，必须大于等于 0，单位为万分比 |
| `shStockMinSx`、`szStockMinSx` | 沪深最低佣金，必须大于等于 0 |
| `shStockGh`、`szStockGh` | 沪深过户费，必须大于等于 0，单位为万分比 |
| `buyYh`、`sellYh` | 买卖印花税，必须大于等于 0，单位为万分比 |
| `rf` | 无风险利率，必须大于等于 0 |
| `slippage` | 滑点百分比，必须大于等于 0 |
| `isTickMode` | `true` 表示快照模式，此时 `interval` 必须为空 |
| `useNewPrice` | 只允许在快照模式为 `true` 时启用 |
| `interval` | Bar 模式只允许 `"1d"` 或 `"1m"`；非空值会关闭快照与现价成交 |
| `closeLog` | 是否关闭 SmartX 回测日志 |

以下 patch 非法：

```json
{"config":{"isTickMode":true,"interval":"1m"}}
```

```json
{"config":{"isTickMode":false,"useNewPrice":true}}
```

## 启动响应

新任务：

```json
{
  "version": 1,
  "accepted": true,
  "reason": "created",
  "run": {
    "id": "bt_xxx",
    "workspacePath": "当前工作区",
    "sessionId": "当前会话",
    "status": "pending",
    "progress": 0,
    "revision": 0
  }
}
```

- `created`：已创建新任务。
- `idempotent`：同一 tool call 重试命中原任务，不得再次提交。
- `active`：当前作用域已有活动任务，返回该任务快照，不得再次提交。
- `accepted: false, reason: "busy"`：其他作用域存在互斥任务；响应不会泄露对方任务。

## 状态与详情

| 状态 | 含义 | 可解释内容 |
| --- | --- | --- |
| `pending` | 本地已落库，等待或正在提交 SmartX | ID、配置、进度；不能解释绩效 |
| `running` | 后台 Manager 正在查询 SmartX 进度 | ID、配置、进度；不能解释绩效 |
| `done` | SmartX 返回终态，进度为 100 | 实际 `summary` 与配置 |
| `failed` | 启动、查询、超时或远端状态失败 | 脱敏错误和下一步 |

详情不会返回原始 `result`、`dataFiles`、内部 `logPath`、`pluginId`、`requestKey` 或远端 `btId`。非 `done` 任务的 `summary` 为空对象且 `hasResult` 为 `false`。summary 超过服务限制时只保留有限标量并添加 `truncated: true`。

前端当前识别以下指标键，但必须以实际响应为准：

| 键 | 含义 |
| --- | --- |
| `total_return` | 累计收益 |
| `sharpe_ratio` | 夏普比率 |
| `max_falldown` | 最大回撤；字段名按现有 SmartX 契约保留 |
| `win_rate` | 胜率 |

不要自行给无单位数值添加百分号。解释收益与风险时同时说明回测区间、初始资金、行情模式、滑点和费用设置，避免只比较单个指标。

## 错误处理

- `needs_config`：默认配置缺少开始或结束时间；先请用户补充必要字段。
- `invalid_config`：时间、数值或模式组合非法；指出具体字段并给出合法组合。
- `not_found`：任务不存在或不属于当前 workspace/session；不要尝试跨作用域读取。
- `internal_error`：只说明服务暂不可用，不转述内部异常，也不要立即重复提交。

所有 MCP 工具错误都以结构化 v1 结果返回。保留错误 `code` 和脱敏 `message`，不要从服务日志拼接更详细的内部信息。
