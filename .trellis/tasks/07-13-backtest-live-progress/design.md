# 技术设计

## 架构与边界

```text
流程图按钮 / 回测按钮
          | POST /api/backtest/run
          v
strategy-service Backtest Manager ----> SmartX startBackTest/queryBackTestProgress
          |                         
          +--> SQLite backtest_runs
          +--> WebSocket backtest.updated --> Redux/UI

首次进入 / 切会话 / socket.open --> GET /api/backtest/runs --> 快照对账
终态事件 --> GET /api/backtest/runs/:id --> 完整结果
```

- HTTP 负责命令受理、列表和完整详情。
- 后台 Manager 负责 SmartX 启动、轮询、重试、超时和重启恢复。
- WebSocket 只推送已持久化的轻量状态，不承载回测命令和完整报告。
- 前端 Redux 维护当前工作区/会话快照，用户选择和活动任务分别派生。

## HTTP 契约

### 发起回测

`POST /api/backtest/run`

```json
{
  "workspacePath": "D:/workspace/demo",
  "sessionId": "ses_123",
  "pluginId": "demo",
  "requestKey": "client-generated-id",
  "config": {}
}
```

所有分支返回 HTTP `200`：

- `code: 200`：创建或幂等命中成功，`data` 为任务快照。
- `code: 400`：输入或配置无效。
- `code: 409`：同一会话已有其他活动任务，`data` 返回活动任务快照。
- `code: 500`：内部启动或持久化错误，响应不泄露内部堆栈。

成功返回的初始状态为 `pending`。现有 `/runs` 与 `/runs/:id` 保留；浏览器不再通过 `/refresh` 驱动任务，旧接口暂时保留兼容，后续可移除。

## 状态机

```text
pending --SmartX 返回有效 btId--> running --完成--> done
   |                                  |
   +------------错误/超时------------+--> failed
```

- `pending`：本地已受理，后台正在调用 SmartX 启动命令。
- `running`：已获得有效 `btId`，正在查询真实进度。
- `done`：结果和汇总已经持久化。
- `failed`：参数错误以外的启动失败、连续查询失败、服务重启时无法确认的无 `btId` 活动任务或总运行超时。
- 进度在后端限制为 `0..100`，更新取 `max(old, new)`。

## 后台 Manager

- `backtest.Service` 持有服务级 `context.Context`、取消函数、`WaitGroup` 和运行任务集合，保证同一任务只有一个 worker。
- 创建任务采用事务完成幂等键检查、活动任务检查和插入。
- SmartX 启动不得使用 HTTP request context；拿到空 `btId` 视为启动失败。
- 查询间隔初始 2 秒，稳定运行后可调整到 5 秒；瞬时错误指数退避并设置连续错误上限。
- 每次变更执行“数据库更新并递增 revision -> 广播事件”，终态后退出 worker。
- 启动时扫描 `pending/running`：有 `btId` 的任务恢复查询，无 `btId` 的旧任务标记为中断失败，避免远端重复任务。
- 关闭服务时取消 worker 并等待退出。

## 数据模型

`backtest_runs` 最小新增：

- `request_key text not null default ''`
- `revision integer not null default 0`

增加幂等键索引，并通过事务保证单会话、单插件只有一个活动任务。现有数据库需要执行可重复的增量迁移，不能只修改 `create table if not exists`。

## WebSocket 契约

事件类型为 `backtest.updated`，payload 只包含：

```json
{
  "id": "bt_local",
  "workspacePath": "D:/workspace/demo",
  "sessionId": "ses_123",
  "status": "running",
  "statusCode": 0,
  "progress": 42,
  "error": "",
  "revision": 6,
  "updatedAt": 1783912345000,
  "hasResult": false
}
```

- 前端按工作区和会话过滤，并忽略 revision 不大于当前版本的事件。
- `hasResult: true` 时通过详情接口获取完整结果。
- `socket.open` 后重新请求列表，弥补断线期间丢失的事件。
- 沿用当前本地单进程广播模型；网络暴露场景的鉴权、Origin 和服务端订阅隔离另行规划。

## 前端状态与交互

- 同步 hook 负责“列表快照 + socket 增量 + 重连对账”，不再运行 3 秒 refresh 定时器。
- 回测缓存更新前验证 `workspacePath/sessionId`；切换会话后的旧请求只能结束自身，不能覆盖新会话。
- `active run` 从所有记录的 `pending/running` 状态派生，不从用户选中的历史记录派生。
- 新建任务时选择新记录；普通进度更新保留用户当前历史选择。
- 流程图入口：空闲时“运行回测”；活动时“查看回测 42%”，点击只导航。
- 回测面板：`pending` 显示启动状态，`running` 显示进度条和耗时，`failed` 显示错误及重试，`done` 显示报告及重新运行。
- SmartX 没有真实取消协议，因此不展示取消按钮。

## 兼容与回滚

- 旧 `/refresh` 路由暂留，便于分阶段回滚前端，但正常前端不再调用。
- 新增字段使用增量迁移和默认值，旧记录可以继续读取。
- 若 Socket 更新出现问题，列表/详情接口仍可恢复状态；可以临时恢复低频只读对账，不恢复由浏览器驱动 SmartX 的长期方案。
- 后端 Manager 可独立回滚到旧 Refresh 路径，数据库新增字段保持兼容。

## 已知约束

- SmartX 当前没有取消命令，不能提供真实取消。
- SmartX 是否支持同插件并行不明确，本方案按单会话且同插件串行保护。
- 从“SmartX 已接收任务”到“本地持久化 btId”之间发生进程崩溃时无法保证远端 exactly-once；重启后不盲目重试，以避免重复回测。
