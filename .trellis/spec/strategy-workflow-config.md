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
