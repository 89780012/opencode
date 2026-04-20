---
name: project-manager
description: 管理跨会话项目状态、进度跟踪与交接协议。用于初始化项目状态、恢复上次工作、记录进度、更新待办、生成交接摘要，或当其他技能需要遵循统一项目管理流程时使用。
---

# 项目管理

这个技能负责跨会话的项目状态管理，不负责业务实现本身。
目标是让每次会话开始前能恢复上下文，会话结束前能更新状态，并让其他技能按统一协议协作。

默认约定：
- 项目状态目录为工作区根目录下的 `.project-state/`。
- 状态文件默认包括 `.project-state/feature-list.json`、`.project-state/progress.md`、`.project-state/session-log.md`。
- 初始化时优先复用本技能目录下的 `templates/` 模板。
- 如果已有 `.project-state/`，优先读取和延续，不要重复初始化。

## 触发与协作

在这些场景使用本技能：
- 用户要求“初始化项目”“开始新项目”“创建进度跟踪”“建立交接机制”。
- 用户要求“恢复工作”“继续开发”“上次做到哪了”“读一下当前进度”。
- 用户要求“记录进度”“更新状态”“生成交接报告”“收尾当前会话”。
- 其他技能在开始正式实施前，需要先确认项目上下文和待办顺序。

与其他技能协作时：
- 如果工作区存在 `.project-state/`，其他技能开始前先执行本技能的“会话启动协议”。
- 如果本次任务改动了代码、计划或任务拆分，结束前执行本技能的“会话结束协议”。
- 如果任务只是纯分析且没有形成新的项目状态，不强制写回。

## 核心约束

1. 不要跳过状态恢复直接开始做实现。
2. 不要在已有 `.project-state/` 的情况下再次初始化。
3. 不要凭记忆描述上次进度；优先读取状态文件和 Git 记录。
4. 不要在未核对当前状态的情况下私自切换会话目标。
5. 不要自动执行破坏性 Git 操作，例如 `reset --hard`、强制覆盖或自动 rebase。

## 项目初始化协议

当用户明确要求初始化项目状态时，按以下顺序执行：

1. 确认工作区根目录是否已存在 `.project-state/`。
2. 如果不存在，创建：
   - `.project-state/feature-list.json`
   - `.project-state/progress.md`
   - `.project-state/session-log.md`
3. 从 `templates/` 复制模板内容，并替换为当前项目的基础信息。
4. 如果仓库尚未初始化 Git，可以建议初始化；只有在用户明确希望初始化版本管理时再执行 Git 初始化。
5. 初始化完成后，向用户说明：
   - 状态目录已建立
   - 当前默认的首个任务
   - 后续恢复与收尾会依赖这些文件

初始化时至少补齐这些内容：
- 项目名称
- 创建日期
- 首批功能或任务列表
- 当前阶段
- 下一步计划

## 会话启动协议

当任务涉及继续开发、恢复上下文、多步项目推进或存在 `.project-state/` 时，按以下顺序执行：

1. 检查是否存在 `.project-state/`。
2. 如果存在，依次读取：
   - 最新一次 Git 提交摘要
   - `.project-state/progress.md`
   - `.project-state/feature-list.json`
   - 如有需要，再读取 `.project-state/session-log.md`
3. 提取并总结：
   - 上次完成了什么
   - 当前阶段是什么
   - 下一个待办是什么
   - 是否存在阻塞项或警告
4. 如果 `feature-list.json` 中存在 `status = "in-progress"` 的任务，优先将其视为当前会话目标。
5. 如果没有 `in-progress`，优先选择第一个 `status = "pending"` 且依赖已满足的任务。
6. 向用户报告恢复结果，并说明本次会话准备推进的目标。

如果不存在 `.project-state/`：
- 当任务明显是一次性小改动，可以继续当前任务，但要说明未启用项目状态管理。
- 当任务明显是长期项目或多阶段交付，应建议初始化项目状态。

## 会话结束协议

当本次任务形成了新的项目进展、状态变化、代码改动或交接信息时，结束前执行：

1. 更新 `.project-state/progress.md`：
   - 当前阶段
   - 本次完成事项
   - 当前阻塞或风险
   - 明确的下一步
2. 更新 `.project-state/feature-list.json`：
   - 已完成任务改为 `done`
   - 正在进行的任务改为 `in-progress`
   - 新发现任务按需要追加为 `pending` 或 `blocked`
3. 追加 `.project-state/session-log.md`：
   - 日期时间
   - 本次动作摘要
   - 关键结论
   - 交接说明
4. 如果用户明确要求提交代码，再把状态文件与代码一并提交。
5. 向用户输出简洁的交接摘要。

交接摘要至少包括：
- 已完成内容
- 当前状态
- 下一步
- 风险或阻塞

## 状态文件规则

### `feature-list.json`

用途：
- 保存任务拆分、优先级、状态和依赖。

要求：
- 任务状态仅使用 `pending`、`in-progress`、`done`、`blocked`。
- 每个任务都应有稳定的 `id`。
- 新增任务时优先补充 `description` 和 `priority`。
- 如果任务被阻塞，写清阻塞原因。

### `progress.md`

用途：
- 保存当前阶段、完成进展、问题与下一步。

要求：
- 始终让“最新状态”位于文件顶部。
- 下一步必须具体且可执行。
- 如果当前状态与 `feature-list.json` 不一致，优先修正两者一致性。

### `session-log.md`

用途：
- 保存每次会话的摘要，方便恢复和交接。

要求：
- 按时间倒序或追加记录都可以，但整个文件要保持一致。
- 每条记录至少包含：时间、目标、动作、结果、下一步。

## 异常处理

### 状态文件缺失

- 如果 `.project-state/` 存在但单个文件缺失，优先按模板补齐缺失文件。
- 补齐前先读取其他状态文件，避免覆盖现有上下文。

### 状态文件损坏

- 先尝试从现有内容中提取可恢复信息。
- 如果仓库中已有 Git 历史，可建议用户从历史中恢复。
- 不要未经确认直接覆盖为新模板。

### Git 工作区不干净

- 如果存在未提交改动，先在恢复摘要中明确指出。
- 不要自动清理、回滚或合并。
- 如本次仍继续工作，应在交接中记录这些未提交状态。

### 任务状态冲突

- 如果 `progress.md` 与 `feature-list.json` 对当前任务描述冲突，先指出冲突。
- 优先根据最新代码、最近日志和最近会话记录修正状态。

## 使用资源

按需使用以下资源：
- 模板：`templates/feature-list.json`
- 模板：`templates/progress.md`
- 模板：`templates/session-log.md`
- 可选校验脚本：`scripts/validate_state.py`
- 可选校验脚本：`scripts/validate_state.js`

这个技能不要求用户必须安装任何额外运行时。
校验 `.project-state/` 时，按下面顺序选择：

1. 如果环境里有 `python`，优先运行：

```bash
python scripts/validate_state.py <项目根目录>
```

2. 如果没有 `python`，但环境里有 `node` 或 `bun`，运行：

```bash
node scripts/validate_state.js <项目根目录>
```

或：

```bash
bun scripts/validate_state.js <项目根目录>
```

3. 如果以上运行时都没有，直接读取文件并按下面的检查清单判断：

- `.project-state/` 目录存在
- `feature-list.json`、`progress.md`、`session-log.md` 三个文件存在
- `feature-list.json` 是合法 JSON，且包含 `project`、`created`、`features`
- 每个任务至少包含 `id`、`name`、`description`、`status`、`priority`、`dependencies`
- `status` 只使用 `pending`、`in-progress`、`done`、`blocked`
- `progress.md` 与 `session-log.md` 不为空

如果发现状态文件不一致：
- 先以工作区当前代码、最近进度记录和最近会话记录为准
- 再修正 `.project-state/` 中冲突的内容
