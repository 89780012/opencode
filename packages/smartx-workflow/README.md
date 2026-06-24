# `@opencode-ai/smartx-workflow`

`smartx-workflow` 是一个给 SmartX 策略开发流程加顺序约束的插件。它同时维护两类约束：

1. 会话级顺序约束
2. 工作区级基线约束

## 会话级顺序约束

插件会继续跟踪两组已有顺序：

- `smartx_start` / `smartx-start` -> `smartx_logs`
- `skill({ name: "smartx-develop" })` -> `skill({ name: "smartx-debug" })`

只要前一步已经发生、后一步还没补齐，插件就会在下一轮模型继续生成前注入系统提示，要求先完成对应 follow-up。

## 工作区级基线约束

工作区基线由两份产物组成：

1. `workspace-analyzer` 生成并保存的工作区分析
2. `strategy-flowchart-generator` 生成并保存的流程图

### 初始化阶段

一个工作区在当前会话第一次被使用时，必须先完成初始化基线：

1. 调用 `workspace-analyzer`
2. 调用 `smartx_save_analysis`
3. 调用 `strategy-flowchart-generator`
4. 调用 `smartx_save_flowchart`

初始化完成前：

- 可以继续只读探索
- 不允许修改代码
- 不允许执行会改变工作区状态的命令

### 迭代阶段

初始化完成后，只要主会话里发生成功的写入或执行，工作区就会被标记为 `dirty`。

`dirty` 的含义是：

- 已保存的分析和流程图已经过期
- 但开发、验证、调试都可以继续

因此插件不会在每次调试前强制刷新分析和流程图。`dirty` 只表示“最终快照已经过期”，不表示“当前不能继续干活”。

### Review 阶段

代码审查仍然是独立流程：

- 用户明确要求 review 时才进入
- review 前如果工作区是 `dirty`，会先刷新基线
- review 结果必须先通过 `smartx_save_review` 落盘
- 未通过时由主 agent 自己修代码，再发起下一轮 review

### 最终收口阶段

当工作区是 `dirty` 且主 agent 准备自然收尾时，插件会优先走 AI 自动收口：

- 注入一条软提示，要求模型在“准备结束这一轮并输出最终总结”之前，先刷新一次最终快照
- 最终快照顺序仍然是：分析 -> 保存分析 -> 流程图 -> 保存流程图

如果模型没有主动判定到自然收尾，用户显式说“最终总结”“收尾”“wrap up”等话术，仍然会触发显式收口兜底。

最终收口完成前：

- 可以继续做只读检查
- 不应再继续改代码
- 不应再发起新的调试

## 生命周期

插件内部把工作区状态收敛为几个阶段：

- `idle`：还没有初始化基线
- `booting`：初始化基线进行中
- `ready`：基线齐全且是最新状态
- `dirty`：代码变了，但允许继续开发和调试
- `refreshing`：为了 review 之类的动作在刷新基线
- `finalizing`：为了最终收口在刷新最终快照

## 构建与验证

在 `packages/smartx-workflow` 目录执行：

```bash
bun typecheck
bun test
bun run build
```

产物输出到：

```text
packages/smartx-workflow/dist/smartx-workflow.js
```
