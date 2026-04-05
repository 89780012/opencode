# Strategy Service Logging Refactor Design

**Goal:** 梳理 `packages/strategy-service` 当前分散的日志体系，明确统一的日志模型、后端抽象、API 收口方案与迁移路径，降低后续排障、前端接入和维护成本。

**Scope:** 仅覆盖 `strategy-service` 服务自身、托管的 `opencode` 子进程日志，以及外部 `smartx` 日志浏览能力。不涉及前端 UI 具体实现，也不在本阶段引入全文检索、远程日志聚合或 observability 平台。

**Status:** Draft

---

## 1. 背景

`packages/strategy-service` 当前同时处理三类日志：

1. 服务自身运行日志
2. `opencode` 托管进程日志
3. `smartx` 外部目录日志

这三类日志分别使用不同的写入方式、存储位置、轮转策略和读取 API。短期内虽然都能工作，但系统边界已经开始模糊：

- 同样叫“日志”，有的是本服务写入，有的是子进程原始输出，有的是对外部目录的只读浏览
- 同样是查看日志，API 却分散在多条路径上，返回结构也不一致
- `opencode` 同时存在“文件落盘日志”和“内存态日志”两套来源
- `service` 有轮转，`opencode` 目前是无限追加，生命周期策略不一致

结果是：

- 前端和调用方要适配多套协议
- 排障时不容易回答“我该看哪个日志”
- 后续如果要加过滤、统一日志页、下载导出、搜索，会被现状拖累

---

## 2. 当前实现梳理

## 2.1 服务自身日志

- 入口：`internal/logger/logger.go`
- 写入方式：全局 `slog.SetDefault(...)`
- 落盘位置：`~/.strategy-service/logs/strategy-service.log`
- 特点：
  - JSON 日志
  - `lumberjack` 轮转
  - 同时输出到 `stdout`

结论：这是当前唯一较完整的“正式日志管道”。

## 2.2 `opencode` 日志

- 入口：`internal/oprun/manager.go`
- 写入方式：
  - 子进程 stdout/stderr 逐行扫描
  - 调用 `logs.Append(logs.OpencodeKind, line)` 直接追加文件
  - 同时写入 `state.Log` 内存切片
- 落盘位置：`~/.strategy-service/logs/opencode-startup.log`
- 特点：
  - 文本行，不是结构化日志
  - 无轮转
  - 内存和文件并存
  - 对外接口既能读文件 tail，也能读内存日志

结论：当前最混乱的部分是 `opencode`，因为它既像“日志”，又像“状态事件流”，还分裂成两套读取口径。

## 2.3 `smartx` 日志

- 入口：`internal/smartx/logs.go`
- 来源：外部目录，默认 `~/.xtp-smart/log/default`
- 行为：
  - 扫描目录
  - 返回最新文件列表
  - 支持按文件 tail/watch
- 特点：
  - 本服务不写日志，只负责浏览
  - 是“外部日志读取器”，不是本地日志存储

结论：`smartx` 的定位本质上不是 logger，而是 log browser。

## 2.4 当前 API

- `/api/system/logs?kind=service|opencode`
- `/api/system/opencode/logs`
- `/api/system/smartx/logs/meta`
- `/api/system/smartx/logs/watch`

问题：

- API 路径不统一
- 返回模型不统一
- 同一来源可能有多个读取入口

---

## 3. 现存核心问题

## 3.1 概念混淆

当前把三种不同能力都称为“日志”：

- internal managed logs
- managed child process logs
- external observed logs

这三个概念应该分层，而不是并列堆在一起。

## 3.2 来源和存储耦合

现在很多逻辑默认“日志 = 某个固定文件”。但 `smartx` 是目录聚合型来源，后续也可能出现“单来源多文件”或“非文件来源”的情况。

## 3.3 API 契约分裂

统一日志页无法自然建模，因为：

- `service` / `opencode` 走 kind tail
- `opencode` 还有额外专属接口
- `smartx` 走 meta/watch 双接口

## 3.4 生命周期不一致

- `service` 有轮转
- `opencode` 无轮转
- `smartx` 生命周期由外部系统控制

这会造成磁盘占用不可控，也不利于定位“保留多久”。

## 3.5 `opencode` 语义不清

`opencode` 当前混合了三种内容：

- 真实 stdout
- 真实 stderr
- 管理事件，如 `starting`, `ready`, `stopped`

这些内容都被混在同一个文本文件和同一个内存数组里，后续分析和展示都会受限。

---

## 4. 设计目标

本次改造建议以“统一模型与访问方式”为主，不强求物理上只保留一个日志文件。

目标如下：

1. 明确区分“日志来源”与“底层存储”
2. 为所有日志来源提供统一抽象
3. 收敛 API，避免同一来源多个真相源
4. 让 `opencode` 和 `service` 的保留策略一致
5. 将 `smartx` 明确为 external source
6. 为未来前端统一日志页、筛选、搜索、下载留接口空间

非目标：

- 不在本阶段引入 ELK、Loki、OpenTelemetry
- 不在本阶段做全文索引
- 不在本阶段统一所有历史日志格式

---

## 5. 设计原则

1. 一个来源，一个主读取口径
2. 先统一抽象，再考虑统一文件
3. external source 不伪装成 internal logger
4. API 收口优先于底层重写
5. 允许渐进迁移，避免一次性推倒

---

## 6. 目标架构

建议把日志系统拆成三层：

## 6.1 Source 层

定义“日志来源”，而不是先定义文件。

建议来源模型：

- `service`
- `opencode`
- `smartx/<file>`

可选元信息：

- `id`
- `label`
- `type`: `managed` | `child` | `external`
- `format`: `json` | `text`
- `path`
- `rotated`
- `watchable`

## 6.2 Adapter 层

每种来源实现统一接口。

建议接口：

```go
type Source interface {
  Meta(ctx context.Context) (Meta, error)
  Tail(ctx context.Context, input TailInput) (TailResult, error)
  Watch(ctx context.Context, input WatchInput) (WatchResult, error)
}
```

建议实现：

- `serviceSource`
- `opencodeSource`
- `smartxSource`

说明：

- `serviceSource` 读本地轮转主文件
- `opencodeSource` 读托管子进程日志文件
- `smartxSource` 读外部目录和文件

## 6.3 API 层

建议收敛成统一日志 API：

- `GET /api/logs/sources`
- `GET /api/logs/{id}/meta`
- `GET /api/logs/{id}/tail?lines=200`
- `GET /api/logs/{id}/watch?lines=200&seconds=10`

保留兼容期内旧接口，但后端内部全部转发到新 source 层。

---

## 7. 数据模型建议

## 7.1 Source 列表

```json
{
  "sources": [
    {
      "id": "service",
      "label": "Strategy Service",
      "type": "managed",
      "format": "json",
      "path": "C:/Users/.../.strategy-service/logs/service.log",
      "watchable": true
    },
    {
      "id": "opencode",
      "label": "OpenCode",
      "type": "child",
      "format": "text",
      "path": "C:/Users/.../.strategy-service/logs/opencode.log",
      "watchable": true
    },
    {
      "id": "smartx/default.log",
      "label": "smartx default.log",
      "type": "external",
      "format": "text",
      "path": "C:/Users/.../.xtp-smart/log/default/default.log",
      "watchable": true
    }
  ]
}
```

## 7.2 Tail 返回

```json
{
  "source": {
    "id": "opencode",
    "type": "child",
    "format": "text"
  },
  "path": "C:/Users/.../.strategy-service/logs/opencode.log",
  "lines": [
    "2026-04-04T22:10:00Z starting opencode process",
    "server listening on 127.0.0.1:4096"
  ]
}
```

## 7.3 Watch 返回

```json
{
  "source": {
    "id": "smartx/default.log",
    "type": "external",
    "format": "text"
  },
  "path": "C:/Users/.../.xtp-smart/log/default/default.log",
  "lines": [
    "..."
  ],
  "truncated": false
}
```

---

## 8. 文件与命名规范

建议先统一命名，再统一实现。

当前：

- `strategy-service.log`
- `opencode-startup.log`

建议：

- `service.log`
- `opencode.log`

理由：

- 更短
- 避免“startup”误导，实际上记录的不只是启动过程
- 为未来增加 `smartx-proxy.log`、`worker.log` 等来源留出一致命名空间

目录建议：

```text
~/.strategy-service/
  config.json
  logs/
    service.log
    opencode.log
```

说明：

- `smartx` 日志仍保留在其原始外部目录，不迁入 `.strategy-service/logs`
- `strategy-service` 只记录自身和托管进程日志

---

## 9. `opencode` 专项方案

`opencode` 是本次改造重点。

## 9.1 当前问题

- 文件日志与内存日志双轨
- stdout/stderr 与管理事件混在一起
- 无轮转
- API 有重复入口

## 9.2 目标方案

建议把 `opencode` 定位成“托管子进程来源”，只有一个主日志文件。

保留内容：

- 子进程 stdout
- 子进程 stderr
- 管理事件

但建议统一 envelope 语义，哪怕暂时仍然写文本行，也应保证前缀清晰：

- `[mgr] starting opencode process`
- `[stdout] server listening on ...`
- `[stderr] warning ...`

更进一步的目标是写结构化 JSON 行：

```json
{"ts":"...","source":"opencode","stream":"stdout","msg":"server listening on 127.0.0.1:4096"}
{"ts":"...","source":"opencode","stream":"mgr","msg":"opencode is ready"}
```

## 9.3 内存日志处理

不建议继续让 `state.Log` 成为独立真相源。

建议改成：

- `state.Log` 仅作为短窗口缓存
- API 读取统一走 file/source adapter
- 状态接口只返回摘要，如最后一条消息、最后更新时间、ready/running 状态

这样能避免“页面 A 看见的是内存日志，页面 B 看见的是文件日志”的分裂。

---

## 10. `smartx` 专项方案

`smartx` 不建议强行并入本地 logger。

正确定位应为：

- 外部日志来源
- 多文件目录型来源
- 由 `strategy-service` 提供浏览与 watch 能力

建议保留以下能力：

- 列文件
- 选文件 tail
- watch 单文件

建议调整点：

- 不再使用专属路径语义去表达“日志系统”
- 改为作为统一 `source` 列表中的 external entries 暴露
- 若前端需要“最近三个 smartx 日志文件”，由 sources/list 接口附带排序结果

---

## 11. API 改造方案

## 11.1 新接口

建议新增：

- `GET /api/logs/sources`
- `GET /api/logs/{id}/tail`
- `GET /api/logs/{id}/watch`
- `GET /api/logs/{id}/meta`

## 11.2 旧接口兼容

兼容期保留：

- `/api/system/logs`
- `/api/system/smartx/logs/meta`
- `/api/system/smartx/logs/watch`
- `/api/system/opencode/logs`

但内部全部改走新 source 层。

兼容映射建议：

- `/api/system/logs?kind=service` -> `service`
- `/api/system/logs?kind=opencode` -> `opencode`
- `/api/system/opencode/logs` -> `opencode`
- `/api/system/smartx/logs/meta?name=x` -> list/filter `smartx/*`
- `/api/system/smartx/logs/watch?name=x` -> watch matched file

## 11.3 废弃节奏

1. 先新增新接口
2. 前端切换到新接口
3. 旧接口保留一个版本周期
4. 再统一删除

---

## 12. 轮转与保留策略

建议把 `service` 和 `opencode` 统一到同一套策略：

- 最大文件大小：50MB
- 最大保留天数：30 天
- 压缩：开启
- 本地时间：开启

`smartx` 不由本服务控制，不纳入本地轮转策略。

这样可以保证：

- 磁盘占用可控
- 行为一致
- 配置项更容易解释

如后续需要，可在用户配置中开放：

- `logs.tail`
- `logs.max_age`
- `logs.max_size`

但当前阶段建议先后端固定，避免 UI 配置膨胀。

---

## 13. 实施步骤

建议按三期推进。

## Phase 1: 收口底层来源

目标：不改前端行为，先统一后端抽象。

任务：

1. 引入统一 `logs/source` 抽象
2. 实现 `serviceSource`
3. 实现 `opencodeSource`
4. 实现 `smartxSource`
5. 让旧接口内部改为调用 source adapter
6. 给 `opencode` 日志加轮转
7. 统一本地日志命名

交付结果：

- 后端内部只有一套日志读取模型
- 旧 API 仍可用

## Phase 2: 收口 API

目标：对外统一接口。

任务：

1. 增加 `/api/logs/sources`
2. 增加 `/api/logs/{id}/tail`
3. 增加 `/api/logs/{id}/watch`
4. 前端切到新接口
5. `opencode` 去掉专属日志接口依赖

交付结果：

- 日志页只依赖统一 API

## Phase 3: 统一事件语义

目标：让 `service` 和 `opencode` 更容易分析和展示。

任务：

1. 给 `opencode` 引入明确 stream 语义
2. 评估是否统一为 JSON lines
3. 为 UI 增加按来源、按级别、按 stream 过滤能力

交付结果：

- 支持更好的搜索和结构化展示

---

## 14. 涉及模块建议

建议改造重点集中在以下文件附近：

- `packages/strategy-service/internal/logger/logger.go`
- `packages/strategy-service/internal/logs/store.go`
- `packages/strategy-service/internal/oprun/manager.go`
- `packages/strategy-service/internal/smartx/logs.go`
- `packages/strategy-service/internal/web/system_api.go`
- `packages/strategy-service/internal/web/opencode_api.go`

建议新增目录：

```text
packages/strategy-service/internal/logs/
  source.go
  service.go
  opencode.go
  smartx.go
  model.go
```

`store.go` 可以继续保留，但职责建议缩成：

- 路径和基础文件操作
- 通用 tail/read helper

而不是继续承载所有类型的日志规则。

---

## 15. 风险与权衡

## 15.1 为什么不直接合并成一个总日志文件

不建议直接把 `service`、`opencode`、`smartx` 全并成一个文件。

原因：

- `smartx` 是外部来源，不属于本服务写入域
- 子进程原始输出和服务结构化日志混写，后续更难读
- 一个总文件并不能解决 API、语义和职责边界问题

## 15.2 为什么先抽象来源，不先重写 logger

因为当前最痛的不是写法，而是消费方式混乱。

先统一来源模型，可以：

- 小步迁移
- 控制风险
- 先把最明显的重复接口收掉

## 15.3 兼容成本

短期内会有一段新旧接口并存期，后端代码量会略增，但这是可控成本，且值得。

---

## 16. 最终建议

推荐采用下面这条主线：

1. 保留多来源，不追求单文件
2. 统一抽象为 source
3. 统一读取 API
4. 收掉 `opencode` 的双真相源
5. 明确 `smartx` 是 external log browser

一句话总结：

`strategy-service` 的日志改造重点不该是“把多个日志文件变成一个文件”，而应该是“把多个日志来源收敛成一个清晰的日志系统模型”。只要来源模型、API 契约和生命周期统一了，多文件本身并不是问题。

---

## 17. 推荐后续动作

建议下一步直接补一份实施计划，按 Phase 1 拆成可执行任务：

1. 抽象 `Source` 接口与模型
2. 重构 `internal/logs`
3. 收敛 `opencode` 读取口径
4. 新增统一日志 API
5. 保留旧接口兼容
6. 补测试和迁移说明
