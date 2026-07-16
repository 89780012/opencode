# Technical Design

## Contract

`SystemConfig` 新增：

```json
{
  "workflow": {
    "baseline": false
  }
}
```

该配置属于本地安装，不属于 workspace 或 session。

## Data Flow

1. strategy-front 通过现有 `/api/system/config` 保存开关。
2. strategy-service 规范化配置并写入 `config.workflow_baseline`。
3. smartx-workflow 在 system transform 开始时读取配置，将值保存为当前 session 本轮策略。
4. workspace 编排器根据策略决定是否注入或接受 baseline 相关动作。
5. strategy-front 继续展示已有快照，但关闭时展示停用状态而不是等待状态。

## Workflow Semantics

- 开启时复用现有生命周期。
- 关闭时 clean workspace 的 baseline 生命周期视为 ready；dirty workspace 仍保持 dirty 以驱动 project memory 保存，baseline 专属 refresh/final/close 分支由开关显式跳过。
- 关闭期间发生写入时立即作废已有 analysis/flowchart pending，并将本地基线重置到 refresh 起点，避免重新启用后用旧 pending 覆盖新修改的刷新需求。
- project memory 状态独立处理，不因 baseline 关闭而跳过。
- system transform 注入关闭策略；before hook 对相关 agent/MCP 做最终保护。
- 配置请求失败时 fail closed。
- 同一轮从 system transform 到 tool after 使用相同策略，切换在下一轮生效。

## Compatibility

- SQLite 通过幂等 `ALTER TABLE` 迁移旧库。
- 历史 analysis/flowchart 行保持不变。
- 发布时 smartx-workflow 与 smartx-helper 必须匹配。
- 现有 system config PUT 继续使用完整配置对象。

## Rollback

关闭开关即可停止新 baseline；回滚代码不会破坏既有配置列和历史快照。
