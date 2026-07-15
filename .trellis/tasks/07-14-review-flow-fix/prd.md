# 审查流程缺陷检查与修复

## Goal

修复截图中审查面板从提交、运行、保存到实时回写的完整链路，确保用户只能发起一轮有效审查，并始终看到可信、单调、不串工作区或会话的审查状态。

## Background

- 审查入口向当前 OpenCode 会话异步发送审查意图，`smartx-workflow` 启动 reviewer，`strategy-service` 保存审查与进度，再通过 WebSocket 回写前端。
- 现有 workspace/worktree 级审查历史需要兼容；本次新增的会话和审查实例标识用于进度归属、幂等和并发隔离，不删除旧记录。
- 现有 `smartx-workflow` 全量测试有一个确定失败：刷新期间写操作未被门禁阻止。

## Requirements

- R1：截图中的“提交审查”和输入框“发送并审查”都必须触发真实审查；提交后立即进入请求中状态，直到收到 running/终态或请求失败，期间不得重复提交。
- R2：提交前必须验证路由工作区、已加载工作区和活动会话一致；工作区切换窗口不得把审查发往旧会话。
- R3：`review.got` 快照和 `review.updated` 实时事件必须按请求作用域与时间单调合并，旧 running 不得覆盖较新的 passed/failed/error。
- R4：每轮审查必须携带稳定 `reviewId` 和可信 `sessionId`；running、终态及重试更新同一轮，并发会话不得互相消费 pending 或覆盖结果。
- R5：服务端必须拒绝空摘要、空检查项、非法检查项状态及总体状态与检查项不一致；未知或空 reviewer 输出必须按 error 处理，不能默认为 passed。
- R6：审查历史查询必须隔离 worktree；审查进度必须写入触发它的 session。
- R7：审查记录与对应进度事件必须原子提交；只有提交成功后才能广播 `review.updated` / `progress.updated`。
- R8：审查通过后必须真正进入最终基线刷新；refreshing 期间禁止继续写入，审查不得基于过期基线静默推进。
- R9：WebSocket 只接受已注册的查询/命令，客户端不得伪造广播事件；断线与异步回复并发不得导致 send-on-closed-channel panic。
- R10：保留现有中文 UI、提示与注释，不扩大到无关包或无关重构。

## Acceptance Criteria

- [x] AC1：两个审查入口均发送一次有效意图；异步响应与 running 事件之间连续点击不会产生第二轮请求。
- [x] AC2：工作区切换未完成时审查入口禁用，服务端拒绝 URL session、body session 与 workspace 归属错配。
- [x] AC3：乱序快照/事件测试证明 terminal@new 不会回滚为 running@old，迟到的旧工作区响应不会清空当前数据。
- [x] AC4：稳定 reviewId 的 running -> terminal、重复 running、重复 terminal 和双会话乱序完成均不串记录。
- [x] AC5：空输出、无明确结论、空 items、非法 status、warning/failed item + passed state 均不能形成“已通过”。
- [x] AC6：worktree A/B 历史隔离，review.start/done/error 只进入显式 session。
- [x] AC7：故障注入证明 progress 写入失败时 review 同时回滚，且不广播半成功状态。
- [x] AC8：passed 保存后会触发 final 基线刷新，refreshing 写入门禁测试通过。
- [x] AC9：未知 WebSocket 入站事件不会广播；客户端断线后迟到 reply 不 panic。
- [x] AC10：三个包的定向测试、类型检查/Go build 和前端生产构建通过；如有既有失败，必须明确区分。

## Out Of Scope

- 不改变审查报告的业务检查项内容或 reviewer 的职责范围。
- 不实现跨进程分布式事件总线；事件仍使用本地 SQLite 与 WebSocket。
- 不删除或重写用户已有的审查历史。
