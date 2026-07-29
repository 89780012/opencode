# 修复模型异常续接与重试状态

## Goal

让模型异常结束、provider 限流重试和前端重试提示遵循一致且有界的状态机，避免 `finish=other` 立即换模型、模型链无限切换，以及重试成功后界面仍显示旧提示。

## Background

- `deepseek-v4-flash-free` 会以 `finish=other` 结束，但没有抛出 provider API 错误。
- `strategy-service/internal/modelchain` 当前把首次 `finish=other` 直接转换为下一模型 continuation。
- OpenCode 会话层对可重试错误使用无上限循环；模型链只在 `attempt == 3` 时尝试 fallback，单次事件被阻挡或漏掉后不会恢复。
- 工作台消息列表缓存最后一次 retry，仅在 idle 时清除，因此 `retry -> busy` 后仍显示旧提示。

## Requirements

- `finish=other` 第一次出现时使用当前模型发送一次 continuation，不重放原始用户请求，不消耗模型链中的下一个模型。
- 同一 assistant `messageID` 的重复 `finish=other` 事件只能处理一次。
- 同一模型 continuation 后再次以 `finish=other` 结束时，切换到下一个尚未使用的模型。
- 正常 `finish=stop`、用户 abort 和 stale event 不得触发恢复或模型切换。
- provider retry 达到 3 次时必须至多触发一次模型 fallback；判断不能依赖只出现一次的精确等于事件。
- 工作台只在实时状态为 `retry` 时显示重试提示；进入 `busy` 或 `idle` 立即清除旧提示。
- 保留当前模型链顺序、continuation 机制和 session/provider 公共事件结构，不修改 OpenCode 或 SDK API。

## Acceptance Criteria

- [x] 第一次 active `finish=other` 发送一次同模型 continuation。
- [x] 重复的相同 message event 不产生第二次 continuation。
- [x] 同模型第二次连续 `finish=other` 切到下一模型，正常 stop 会重置恢复计数。
- [x] retry attempt 3 及之后只触发一次 fallback，不会因重复事件重复切换。
- [x] `retry -> busy` 和 `retry -> idle` 均立即隐藏工作台重试提示。
- [x] modelchain 和前端状态相关测试通过。
- [x] strategy-service 构建/检查与受影响 TypeScript 包 typecheck 通过。

## Out Of Scope

- 修改 provider 模型可用性、配额或模型链配置。
- 修改 OpenAI-compatible provider 对原始 finish reason 的映射。
- 重构整个 OpenCode session loop 或新增公共 API 字段。
