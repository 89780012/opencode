# 可配置工作区分析与流程图

## Goal

提供安装级系统开关，只有用户明确启用时，SmartX 会话才执行工作区分析和流程图生成。

## Requirements

- 系统配置增加 `workflow.baseline` 布尔值，默认关闭并持久化到 SQLite。
- 工作台设置弹窗增加“系统”页签和“工作区分析与流程图”开关。
- workflow 每轮会话读取一次配置并在该轮保持一致；读取失败按关闭处理。
- 关闭时不得启动 `workspace-analyzer`、`strategy-flowchart-generator` 或对应保存、刷新工具。
- 关闭时不得影响 project memory、review、backtest、Python 和普通开发流程。
- 关闭不删除已有分析和流程图；重新开启后可以继续现有 baseline 流程。
- SmartX helper 静态指引不得再无条件要求分析和流程图。

## Acceptance Criteria

- [x] 新安装及旧数据库迁移后的默认值均为关闭。
- [x] 配置可通过现有 `GET/PUT /api/system/config` 正确读写。
- [x] 关闭时新会话不注入 baseline 提示，也不能执行相关 agent/MCP 工具。
- [x] 开启时保持现有 boot、chart、refresh、final baseline 行为。
- [x] 关闭期间代码变更仍被记录，重新开启后可进入刷新流程。
- [x] 前端关闭状态不显示“等待分析/等待流程图”，历史结果仍可查看。
- [x] 三个包的相关测试、类型检查和构建通过。

## Out Of Scope

- 不拆分分析和流程图为两个独立开关。
- 不删除或迁移已有 workspace analysis/flowchart 数据。
- 不强制中止已经启动的分析或流程图子任务。
