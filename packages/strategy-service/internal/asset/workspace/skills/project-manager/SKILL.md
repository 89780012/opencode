---
name: project-manager
description: 管理跨会话项目状态、进度跟踪与交接协议。用于初始化项目状态、恢复上次工作、记录进度、更新待办、生成交接摘要，或当其他技能需要遵循统一项目管理流程时使用。
---

# 项目管理

这个技能只负责项目状态管理，不负责业务实现。目标是把项目进度、当前阶段和交接信息稳定落到磁盘，而不是放在会话记忆里。

默认约定：

- 项目状态目录为工作区根目录下的 `.project-state/`。
- 默认状态文件为：
  `feature-list.json`、`progress.md`、`session-log.md`
- 初始化时优先复用 `templates/` 下的模板。
- 如果已有 `.project-state/`，优先读取和延续，不要重复初始化。

统一术语：

- “本地依据”在本技能中主要指 `.project-state/` 文件、最近进度记录和当前工作区状态。
- “交接摘要”默认包括：已完成内容、当前状态、下一步、风险或阻塞。
- “外部阻塞”指导致项目当前阶段无法继续推进或验证的外部条件。

在这些场景使用本技能：

- 初始化项目状态
- 恢复上次工作
- 继续多步项目推进
- 更新进度、待办或交接摘要

核心约束：

1. 不要跳过状态恢复直接开始做实现。
2. 不要在已有 `.project-state/` 的情况下再次初始化。
3. 不要凭记忆描述进度；优先读取状态文件和最近记录。
4. 不要自动执行破坏性 Git 操作。

## 初始化

当用户明确要求初始化项目状态时：

1. 检查工作区根目录是否已有 `.project-state/`。
2. 如果不存在，创建：
   - `.project-state/feature-list.json`
   - `.project-state/progress.md`
   - `.project-state/session-log.md`
3. 从 `templates/` 复制初始内容并填入当前项目基础信息。
4. 初始化完成后告诉用户：
   - 状态目录已建立
   - 当前默认首个任务
   - 后续恢复和收尾都会依赖这些文件

## 会话启动协议

当任务涉及继续开发、恢复上下文或多步推进时：

1. 检查是否存在 `.project-state/`。
2. 如果存在，优先读取：
   - `.project-state/progress.md`
   - `.project-state/feature-list.json`
   - 需要时再读 `.project-state/session-log.md`
3. 总结：
   - 上次完成了什么
   - 当前阶段是什么
   - 当前待办是什么
   - 是否存在阻塞
4. 如果有 `in-progress` 任务，优先把它视为本次目标。
5. 如果没有 `in-progress`，优先选择依赖已满足的 `pending` 任务。

如果不存在 `.project-state/`：

- 小型一次性任务可继续，但要说明当前未启用项目状态管理。
- 长期或多阶段任务应建议初始化项目状态。

## 会话结束协议

当本次任务产生了新进展、状态变化、代码改动或交接信息时：

1. 更新 `.project-state/progress.md`：
   - 当前阶段
   - 本次完成事项
   - 当前风险或阻塞
   - 明确下一步
2. 更新 `.project-state/feature-list.json`：
   - 完成的任务标为 `done`
   - 当前推进中的任务标为 `in-progress`
   - 新发现任务按需要加入 `pending` 或 `blocked`
3. 追加 `.project-state/session-log.md`：
   - 时间
   - 本次动作摘要
   - 关键结论
   - 交接说明
4. 向用户输出简洁交接摘要：
   - 已完成内容
   - 当前状态
   - 下一步
   - 风险或阻塞

## 文件规则

- `feature-list.json` 只使用 `pending`、`in-progress`、`done`、`blocked` 四种状态。
- `progress.md` 顶部应保持最新状态。
- `session-log.md` 每条记录至少包含：时间、目标、动作、结果、下一步。

## 异常处理

- 如果 `.project-state/` 存在但个别文件缺失，优先按模板补齐，不要覆盖已有内容。
- 如果状态文件冲突，优先根据本地依据修正。
- 如果工作区不干净，明确标记未提交状态，但不要自动清理。

## 可用资源

- 模板：`templates/feature-list.json`
- 模板：`templates/progress.md`
- 模板：`templates/session-log.md`
- 可选校验脚本：`scripts/validate_state.py`
- 可选校验脚本：`scripts/validate_state.js`

校验顺序：

1. 有 `python` 就优先运行：

```bash
python scripts/validate_state.py <项目根目录>
```

2. 否则有 `node` 或 `bun` 时运行：

```bash
node scripts/validate_state.js <项目根目录>
```

或：

```bash
bun scripts/validate_state.js <项目根目录>
```

3. 如果没有运行时，就直接检查目录和三个状态文件是否存在且内容基本完整。
