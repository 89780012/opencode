# SmartX工作流API

<cite>
**本文引用的文件**
- [packages/smartx-workflow/src/index.ts](file://packages/smartx-workflow/src/index.ts)
- [packages/smartx-workflow/src/hooks.ts](file://packages/smartx-workflow/src/hooks.ts)
- [packages/smartx-workflow/src/workspace.ts](file://packages/smartx-workflow/src/workspace.ts)
- [packages/smartx-workflow/src/gate.ts](file://packages/smartx-workflow/src/gate.ts)
- [packages/smartx-workflow/src/life.ts](file://packages/smartx-workflow/src/life.ts)
- [packages/smartx-workflow/src/model.ts](file://packages/smartx-workflow/src/model.ts)
- [packages/smartx-workflow/src/types.ts](file://packages/smartx-workflow/src/types.ts)
- [packages/smartx-workflow/src/note.ts](file://packages/smartx-workflow/src/note.ts)
- [packages/smartx-workflow/src/remote.ts](file://packages/smartx-workflow/src/remote.ts)
- [packages/smartx-workflow/src/workflow.ts](file://packages/smartx-workflow/src/workflow.ts)
- [packages/smartx-workflow/src/parse.ts](file://packages/smartx-workflow/src/parse.ts)
- [packages/smartx-workflow/src/state.ts](file://packages/smartx-workflow/src/state.ts)
- [packages/smartx-workflow/src/tool.ts](file://packages/smartx-workflow/src/tool.ts)
</cite>

## 更新摘要
**所做变更**
- 移除了调试相关功能，包括pairing模块、调试工具函数和调试会话管理
- 工作流程已从两阶段（审查→调试→最终化）简化为直接审查到最终化流程
- 移除了所有与debug相关的状态管理和工具函数
- 简化了工作流状态机，移除了调试阶段的处理逻辑

## 目录
1. [简介](#简介)
2. [项目结构](#项目结构)
3. [核心组件](#核心组件)
4. [架构总览](#架构总览)
5. [详细组件分析](#详细组件分析)
6. [依赖关系分析](#依赖关系分析)
7. [性能考虑](#性能考虑)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录](#附录)

## 简介
本文件面向SmartX工作流API的使用者与集成者，系统性阐述工作流定义、执行与管理的RESTful接口设计思想与实现机制。重点包括：
- 工作流模板与参数传递规范
- 状态模型与生命周期管理（启动、刷新、审查、最终化）
- 暂停/恢复/终止等控制能力
- 与OpenCode代理系统的协同机制与数据流转
- 错误码与异常处理策略
- 实际编排示例与性能优化建议

本说明以仓库中SmartX工作流插件为核心，结合其内部状态机、门禁控制、系统提示注入与远程服务交互，形成一套可落地的API与工作流编排框架。

**更新** 本次更新反映了SmartX工作流系统已移除调试相关功能的重大变更，工作流程从两阶段（审查→调试→最终化）简化为直接审查到最终化流程。

## 项目结构
SmartX工作流位于packages/smartx-workflow，采用"插件入口 + 工作流编排 + 状态模型 + 门禁与提示 + 远程服务"的分层组织方式：
- 插件入口：导出Plugin接口，将工作流钩子暴露给OpenCode平台
- 工作流编排：按阶段注入系统提示、执行硬门禁、推进状态
- 状态模型：定义Analysis/Chart/Project/Pending/Dirt/Memory/Life/Mode等核心类型
- 门禁与提示：根据生命周期视图生成系统提示与拦截原因
- 远程服务：通过strategy-service提供的REST接口读写分析、流程图与审查结果

```mermaid
graph TB
A["插件入口<br/>src/index.ts"] --> B["钩子装配<br/>src/hooks.ts"]
B --> C["工作区编排器<br/>src/workspace.ts"]
C --> D["门禁与提醒<br/>src/gate.ts + src/note.ts"]
C --> E["生命周期视图<br/>src/life.ts"]
C --> F["状态模型与键值<br/>src/model.ts"]
C --> G["远程服务交互<br/>src/remote.ts"]
C --> H["工作流步骤组合<br/>src/workflow.ts"]
C --> I["类型定义<br/>src/types.ts"]
C --> J["解析与意图识别<br/>src/parse.ts + src/state.ts + src/tool.ts"]
```

**图表来源**
- [packages/smartx-workflow/src/index.ts:1-10](file://packages/smartx-workflow/src/index.ts#L1-L10)
- [packages/smartx-workflow/src/hooks.ts:1-146](file://packages/smartx-workflow/src/hooks.ts#L1-L146)
- [packages/smartx-workflow/src/workspace.ts:1-817](file://packages/smartx-workflow/src/workspace.ts#L1-L817)
- [packages/smartx-workflow/src/gate.ts:1-142](file://packages/smartx-workflow/src/gate.ts#L1-L142)
- [packages/smartx-workflow/src/life.ts:1-104](file://packages/smartx-workflow/src/life.ts#L1-L104)
- [packages/smartx-workflow/src/model.ts:1-94](file://packages/smartx-workflow/src/model.ts#L1-L94)
- [packages/smartx-workflow/src/remote.ts:1-110](file://packages/smartx-workflow/src/remote.ts#L1-L110)
- [packages/smartx-workflow/src/workflow.ts:1-18](file://packages/smartx-workflow/src/workflow.ts#L1-L18)
- [packages/smartx-workflow/src/types.ts:1-113](file://packages/smartx-workflow/src/types.ts#L1-L113)
- [packages/smartx-workflow/src/parse.ts:1-86](file://packages/smartx-workflow/src/parse.ts#L1-L86)
- [packages/smartx-workflow/src/state.ts:1-39](file://packages/smartx-workflow/src/state.ts#L1-L39)
- [packages/smartx-workflow/src/tool.ts:1-84](file://packages/smartx-workflow/src/tool.ts#L1-L84)

**章节来源**
- [packages/smartx-workflow/src/index.ts:1-10](file://packages/smartx-workflow/src/index.ts#L1-L10)
- [packages/smartx-workflow/src/hooks.ts:1-146](file://packages/smartx-workflow/src/hooks.ts#L1-L146)

## 核心组件
- 插件入口与钩子装配：将工作流能力注册为OpenCode插件，桥接事件、聊天消息、系统提示变换与工具执行前后钩子
- 工作区编排器：统一管理workspace级状态推进、系统提示注入与硬门禁拦截
- 生命周期视图：将analysis/chart/project/pending/memory/dirty等状态折叠为统一的生命周期视图
- 门禁与提示：根据不同阶段生成系统提示，或在不合规时抛出错误
- 远程服务交互：与strategy-service通过REST接口读写分析、流程图与审查结果
- 意图识别：自动识别用户聊天消息中的审查请求和最终收口请求

**更新** 移除了会话配对管理模块，简化了工作流架构。

**章节来源**
- [packages/smartx-workflow/src/workspace.ts:170-817](file://packages/smartx-workflow/src/workspace.ts#L170-L817)
- [packages/smartx-workflow/src/life.ts:58-103](file://packages/smartx-workflow/src/life.ts#L58-L103)
- [packages/smartx-workflow/src/gate.ts:5-106](file://packages/smartx-workflow/src/gate.ts#L5-L106)
- [packages/smartx-workflow/src/remote.ts:20-110](file://packages/smartx-workflow/src/remote.ts#L20-L110)
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)

## 架构总览
SmartX工作流通过OpenCode插件机制接入，围绕workspace维度进行编排：
- workspace维度：管理基线（analysis+flowchart）、项目记忆、审查队列、脏状态与基线模式
- 系统提示注入：在experimental.chat.system.transform阶段按生命周期视图注入相应提示
- 硬门禁拦截：在tool.execute.before阶段根据当前状态与动作类型判断是否允许执行
- 远程服务：通过strategy-service的REST接口读写分析、流程图与审查结果
- 意图识别：在chat.message阶段自动识别用户意图，提前准备相应的系统提示

```mermaid
sequenceDiagram
participant OC as "OpenCode平台"
participant SW as "SmartX工作流插件"
participant WS as "工作区编排器"
participant INTENT as "意图识别"
participant SVC as "strategy-service"
OC->>SW : "event/session.created"
OC->>SW : "chat.message"
SW->>INTENT : "识别审查/最终收口请求"
INTENT-->>SW : "设置请求标志"
OC->>SW : "experimental.chat.system.transform"
SW->>WS : "system()"
WS->>WS : "生成生命周期视图"
WS-->>OC : "注入系统提示"
OC->>SW : "tool.execute.before"
SW->>WS : "before()"
WS->>WS : "硬门禁判断"
alt 允许执行
WS-->>OC : "允许"
else 拦截
WS-->>OC : "抛出错误"
end
OC->>SW : "tool.execute.after"
SW->>WS : "after()"
WS->>SVC : "保存分析/流程图/审查"
```

**图表来源**
- [packages/smartx-workflow/src/hooks.ts:83-145](file://packages/smartx-workflow/src/hooks.ts#L83-L145)
- [packages/smartx-workflow/src/workspace.ts:170-817](file://packages/smartx-workflow/src/workspace.ts#L170-L817)
- [packages/smartx-workflow/src/remote.ts:20-50](file://packages/smartx-workflow/src/remote.ts#L20-L50)
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)

## 详细组件分析

### 插件入口与钩子装配
- 插件入口导出SmartxWorkflow，内部调用build装配钩子
- build函数组装工作区编排器，并注入日志写入、远程加载与保存回调
- 钩子覆盖event、chat.message、experimental.chat.system.transform、tool.execute.before、tool.execute.after五个入口
- chat.message阶段增加意图识别功能，自动检测用户是否请求审查或最终收口

**更新** 移除了会话配对管理相关的钩子逻辑。

**章节来源**
- [packages/smartx-workflow/src/index.ts:4-9](file://packages/smartx-workflow/src/index.ts#L4-L9)
- [packages/smartx-workflow/src/hooks.ts:27-145](file://packages/smartx-workflow/src/hooks.ts#L27-L145)

### 工作区编排器（workspace）
- system阶段：按生命周期视图注入11类系统提示，覆盖项目记忆保存提醒、基线初始化、analysis/flowchart推进、审查与最终收口、自然收尾提醒等
- before阶段：执行硬门禁，拦截不合规动作；同时预写chart/analysis/review的启动状态
- after阶段：根据工具执行结果推进项目记忆、基线与审查队列状态，落盘analysis/chart/review

**更新** 移除了调试相关的状态推进逻辑，简化了after阶段的处理流程。

```mermaid
flowchart TD
S["开始(system/before/after)"] --> A["快照加载与合并状态"]
A --> B{"生命周期视图"}
B --> |项目记忆需保存| P["注入保存提醒"]
B --> |未恢复记忆| R["注入恢复/初始化提醒"]
B --> |待保存基线产物| M["注入MCP保存提醒"]
B --> |审查未通过且可修复| F["注入修复指令"]
B --> |用户请求审查| V["注入审查门禁/放行"]
B --> |用户请求最终收口| C["注入final门禁/放行"]
B --> |自然收尾条件满足| Z["注入关闭提醒"]
B --> |首次进入| I["注入基线初始化"]
B --> |analysis完成| G["注入流程图生成"]
B --> |刷新中| X["注入刷新提醒"]
B --> |最终收集中| Y["注入最终提醒"]
P --> E["结束"]
R --> E
M --> E
F --> E
V --> E
C --> E
Z --> E
I --> E
G --> E
X --> E
Y --> E
```

**图表来源**
- [packages/smartx-workflow/src/workspace.ts:186-432](file://packages/smartx-workflow/src/workspace.ts#L186-L432)

**章节来源**
- [packages/smartx-workflow/src/workspace.ts:170-817](file://packages/smartx-workflow/src/workspace.ts#L170-L817)

### 生命周期视图与门禁
- 生命周期视图将analysis/chart/project/pending/memory/dirty/baselineMode映射为idle/booting/ready/dirty/refreshing/finalizing
- 门禁根据当前生命周期与动作类型决定是否拦截，拦截时抛出错误并重置到合适起点

**更新** 移除了调试相关的门禁规则，简化了gate函数的逻辑。

**章节来源**
- [packages/smartx-workflow/src/life.ts:58-103](file://packages/smartx-workflow/src/life.ts#L58-L103)
- [packages/smartx-workflow/src/gate.ts:5-106](file://packages/smartx-workflow/src/gate.ts#L5-L106)

### 状态模型与键值
- 定义Flow/Analysis/Chart/Project/Dirt/Mode/Life/Call/Save/SaveChart/SaveReview/Pending/Fix/Memory等类型
- 提供request/fresh/done等状态工厂方法，以及key/touch等工具函数

**更新** 移除了调试相关的状态类型和工厂方法。

**章节来源**
- [packages/smartx-workflow/src/types.ts:1-113](file://packages/smartx-workflow/src/types.ts#L1-L113)
- [packages/smartx-workflow/src/model.ts:1-94](file://packages/smartx-workflow/src/model.ts#L1-L94)

### 系统提示与约束
- 提供note系列函数生成各阶段系统提示，覆盖基线初始化、analysis/flowchart/审查/修复/保存/关闭/最终收口等
- 对审查流程设定最多修复轮次限制

**更新** 移除了调试相关的系统提示生成函数。

**章节来源**
- [packages/smartx-workflow/src/note.ts:1-201](file://packages/smartx-workflow/src/note.ts#L1-L201)

### 远程服务交互
- 提供load/save分析、流程图与审查结果的远程接口封装
- 通过strategy-service的REST端点进行读写

**章节来源**
- [packages/smartx-workflow/src/remote.ts:20-110](file://packages/smartx-workflow/src/remote.ts#L20-L110)

### 工作流步骤组合
- 提供step与flow工具，按顺序执行步骤，命中首个返回true的步骤即停止

**章节来源**
- [packages/smartx-workflow/src/workflow.ts:1-18](file://packages/smartx-workflow/src/workflow.ts#L1-L18)

### 意图识别与聊天消息处理
- wantsReview函数：自动识别用户是否在请求代码审查
- wantsFinal函数：自动识别用户是否在请求最终收口
- 在chat.message钩子中集成意图识别，提前准备相应的系统提示
- 支持多种语言表达的审查和收口请求识别

**章节来源**
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)
- [packages/smartx-workflow/src/hooks.ts:92-130](file://packages/smartx-workflow/src/hooks.ts#L92-L130)

## 依赖关系分析

```mermaid
classDiagram
class Workspace {
+system(input, output)
+before(input, output)
+after(input, output)
+reset(reason, detail)
}
class Gate {
+gate(state, toolKind)
+closing(state, input)
+saving(state, input)
}
class Life {
+view(input) View
+cleanDirt()
+cleanMemory(project)
}
class Model {
+fresh(session)
+key(workspace, worktree)
+touch(flow, input)
+requestAnalysis(...)
+freshAnalysis(...)
+doneAnalysis(...)
+requestChart(...)
+freshChart(...)
+doneChart(...)
+validAnalysis(...)
+validChart(...)
+validProject(...)
}
class Remote {
+loadRemote(service, workspace, worktree)
+loadChartRemote(service, workspace, worktree)
+loadProjectRemote(service, workspace, worktree)
+saveRemote(service, input)
+saveChartRemote(service, input)
+saveReviewRemote(service, input)
}
class Parse {
+wantsReview(text)
+wantsFinal(text)
+reviewState(text)
+reviewText(text)
}
class State {
<<typedef>>
}
class Tool {
+kind(input)
+mcp(input, name)
}
Workspace --> Gate : "使用"
Workspace --> Life : "使用"
Workspace --> Model : "使用"
Workspace --> Remote : "使用"
Workspace --> Parse : "使用"
Workspace --> Tool : "使用"
Workspace ..> State : "使用"
Parse ..> State : "使用"
Tool ..> State : "使用"
```

**图表来源**
- [packages/smartx-workflow/src/workspace.ts:170-817](file://packages/smartx-workflow/src/workspace.ts#L170-L817)
- [packages/smartx-workflow/src/gate.ts:5-106](file://packages/smartx-workflow/src/gate.ts#L5-L106)
- [packages/smartx-workflow/src/life.ts:58-103](file://packages/smartx-workflow/src/life.ts#L58-L103)
- [packages/smartx-workflow/src/model.ts:1-94](file://packages/smartx-workflow/src/model.ts#L1-L94)
- [packages/smartx-workflow/src/remote.ts:20-110](file://packages/smartx-workflow/src/remote.ts#L20-L110)
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)
- [packages/smartx-workflow/src/state.ts:1-39](file://packages/smartx-workflow/src/state.ts#L1-L39)
- [packages/smartx-workflow/src/tool.ts:1-84](file://packages/smartx-workflow/src/tool.ts#L1-L84)

## 性能考虑
- 异步流水线：系统提示注入与状态推进均采用异步流程，避免阻塞主流程
- 缓存与快照：优先使用内存缓存的analysis/chart/project，必要时才远程加载，减少网络往返
- 条件推进：仅在满足前置条件时推进到下一阶段，避免无效调用
- 门禁拦截：在before阶段尽早拦截不合规动作，降低无效执行成本
- 日志与可观测性：通过统一日志写入接口记录关键事件，便于追踪与优化
- 意图识别缓存：聊天消息意图识别结果会在会话级别缓存，避免重复计算
- 跨平台路径规范化：统一路径分隔符和大小写处理，提升多平台兼容性

**更新** 移除了调试相关的性能优化考虑。

## 故障排查指南
常见错误与处理
- 项目记忆未恢复：在执行任何写入或实现类动作前，必须先恢复或初始化项目记忆
- 基线未完成：在未完成initial baseline前，禁止执行实现类动作
- 基线过期：工作区被写脏后，审查或进一步动作前必须刷新analysis与flowchart
- 审查未通过：根据审查结果进入修复轮次，最多3轮；超过限制后需人工介入
- 自然收尾：在工作区dirty且无挂起修复/审查/最终收口时，可触发自然收尾提醒
- 意图识别失败：如果用户使用了不常见的表达方式请求审查或收口，系统可能无法正确识别，需要用户提供更明确的指令
- 跨平台路径错误：确保工作区路径使用统一的斜杠分隔符，避免大小写敏感问题

**更新** 移除了调试相关的故障排查指导。

**章节来源**
- [packages/smartx-workflow/src/gate.ts:5-106](file://packages/smartx-workflow/src/gate.ts#L5-L106)
- [packages/smartx-workflow/src/note.ts:138-159](file://packages/smartx-workflow/src/note.ts#L138-L159)

## 结论
SmartX工作流API通过严格的生命周期视图、硬门禁与系统提示注入，实现了对workspace的精细化编排。配合strategy-service的REST接口，能够可靠地完成分析、流程图生成、审查、修复与最终收口的全链路管理。对于集成者而言，遵循本文档的工作流模板与参数规范，即可在OpenCode平台上安全高效地落地策略开发与管理工作流。

**更新** 本次更新显著简化了系统架构，移除了调试相关功能，使工作流程更加简洁高效。

## 附录

### 触发时机与推进流程
- 插件加载后，按event/chat.message/experimental.chat.system.transform/tool.execute.before/tool.execute.after四个入口触发
- 在tool.execute.after后推进workspace状态
- chat.message阶段的意图识别会在system.transform之前完成，确保系统提示的准确性

**更新** 移除了会话配对相关的触发时机说明。

**章节来源**
- [packages/smartx-workflow/src/hooks.ts:83-145](file://packages/smartx-workflow/src/hooks.ts#L83-L145)

### 工作流模板与参数传递
- 基线初始化：先启动workspace-analyzer，再启动strategy-flowchart-generator
- 审查流程：先获取requirements，再启动strategy-reviewer，最后保存审查结果
- 修复流程：根据审查报告自行修复，最多3轮
- 保存流程：analysis/flowchart/review完成后，分别调用对应MCP保存工具
- 项目记忆管理：在执行任何写入操作前，必须先恢复或初始化项目记忆

**更新** 移除了调试相关的流程说明。

**章节来源**
- [packages/smartx-workflow/src/note.ts:46-135](file://packages/smartx-workflow/src/note.ts#L46-L135)
- [packages/smartx-workflow/src/note.ts:138-159](file://packages/smartx-workflow/src/note.ts#L138-L159)

### 状态查询与生命周期
- 状态类型：Analysis/Chart/Project/Pending/Dirt/Memory/Life/Mode
- 生命周期：idle → booting → ready → dirty → refreshing → finalizing
- 查询接口：通过strategy-service的REST端点读取analysis/flowchart/project-state
- 项目记忆状态：hasProjectState、hasRestoredState、needsSave三个关键字段

**更新** 移除了调试相关的状态查询说明。

**章节来源**
- [packages/smartx-workflow/src/types.ts:1-113](file://packages/smartx-workflow/src/types.ts#L1-L113)
- [packages/smartx-workflow/src/life.ts:58-103](file://packages/smartx-workflow/src/life.ts#L58-L103)
- [packages/smartx-workflow/src/remote.ts:53-109](file://packages/smartx-workflow/src/remote.ts#L53-L109)

### RESTful接口定义（基于远程服务封装）
- 获取analysis快照
  - 方法：GET
  - 路径：/api/workbench/analysis
  - 查询参数：workspacePath, worktreePath
  - 响应：包含analysis数据的对象
- 保存analysis
  - 方法：POST
  - 路径：/api/workbench/analysis
  - 请求体：包含workspacePath、worktreePath、state、items、text
  - 响应：无（200表示成功）
- 获取flowchart快照
  - 方法：GET
  - 路径：/api/workbench/flowchart
  - 查询参数：workspacePath, worktreePath
  - 响应：包含flowchart数据的对象
- 保存flowchart
  - 方法：POST
  - 路径：/api/workbench/flowchart
  - 请求体：包含workspacePath、worktreePath、state、code、err
  - 响应：无（200表示成功）
- 获取project-state存在性
  - 方法：GET
  - 路径：/api/workbench/project-state
  - 查询参数：workspacePath, worktreePath
  - 响应：包含exists与updatedAt的对象
- 保存review
  - 方法：POST
  - 路径：/api/workbench/review
  - 请求体：包含workspacePath、worktreePath、state、summary、items、suggestions
  - 响应：无（200表示成功）

**章节来源**
- [packages/smartx-workflow/src/remote.ts:20-110](file://packages/smartx-workflow/src/remote.ts#L20-L110)

### 错误码与异常处理
- 通用HTTP错误：当远程服务返回非2xx状态时，抛出包含状态码的错误
- 业务错误：门禁拦截时抛出带明确原因的错误，提示正确的执行顺序
- 异常恢复：拦截后根据当前生命周期重置到合适起点（boot/refresh/final）
- 意图识别错误：当聊天消息意图识别失败时，系统会降级处理，但仍会按照默认流程执行
- 路径规范化错误：当跨平台路径处理失败时，系统会抛出路径格式错误

**更新** 移除了调试相关的错误处理说明。

**章节来源**
- [packages/smartx-workflow/src/remote.ts:27-49](file://packages/smartx-workflow/src/remote.ts#L27-L49)
- [packages/smartx-workflow/src/gate.ts:5-106](file://packages/smartx-workflow/src/gate.ts#L5-L106)

### 集成模式与最佳实践
- 初始化基线：在首次进入workspace时，严格按"analysis→flowchart→保存→继续"的顺序执行
- 审查与修复：每次审查后必须保存，未通过则修复并复审，最多3轮
- 自然收尾：在工作区dirty且无挂起任务时，先刷新analysis与flowchart再收尾
- 项目记忆管理：在执行任何写入操作前，必须先调用resume_project_state或init_project_state
- 意图识别：用户可以通过多种表达方式请求审查或最终收口，系统会自动识别
- 跨平台兼容：确保工作区路径使用统一格式，避免大小写和分隔符问题

**更新** 移除了调试相关的集成模式和最佳实践。

**章节来源**
- [packages/smartx-workflow/src/note.ts:59-119](file://packages/smartx-workflow/src/note.ts#L59-L119)
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)

### 意图识别详细说明
- 审查请求识别：支持多种表达方式，如"代码审查"、"review"、"code review"等
- 最终收口请求识别：支持多种表达方式，如"最终总结"、"收尾"、"finish"、"final summary"等
- 识别规则：系统会过滤掉否定性的表达，只识别积极的请求
- 缓存机制：识别结果会在会话级别缓存，避免重复计算

**章节来源**
- [packages/smartx-workflow/src/parse.ts:52-68](file://packages/smartx-workflow/src/parse.ts#L52-L68)
- [packages/smartx-workflow/src/hooks.ts:112-129](file://packages/smartx-workflow/src/hooks.ts#L112-L129)

### 成员身份验证机制
- 子会话识别：通过session.created事件识别子会话，避免误用主工作区约束
- 权限隔离：子会话不会受到主工作区的硬门禁限制
- 状态隔离：子会话拥有独立的状态管理，不影响主工作区的生命周期
- 安全验证：确保工作流约束只应用于主会话，保护子agent的正常运行

**章节来源**
- [packages/smartx-workflow/src/hooks.ts:84-91](file://packages/smartx-workflow/src/hooks.ts#L84-L91)
- [packages/smartx-workflow/src/workspace.ts:434-469](file://packages/smartx-workflow/src/workspace.ts#L434-L469)

### 工作流状态管理详解
- idle状态：工作区首次进入，等待基线初始化
- booting状态：正在建立初始基线，analysis和flowchart生成中
- ready状态：基线建立完成，可以正常进行开发工作
- dirty状态：工作区已被修改，需要刷新基线
- refreshing状态：代码变更后正在刷新基线
- finalizing状态：正在生成最终快照，准备收尾

**章节来源**
- [packages/smartx-workflow/src/life.ts:32-44](file://packages/smartx-workflow/src/life.ts#L32-L44)
- [packages/smartx-workflow/src/types.ts:34](file://packages/smartx-workflow/src/types.ts#L34)
- [packages/smartx-workflow/src/workspace.ts:523-534](file://packages/smartx-workflow/src/workspace.ts#L523-L534)