# `@opencode-ai/smartx-workflow`

一个只做一件事的 OpenCode 插件包: 当当前会话 agent 是 `smartx-helper` 时，把普通聊天会话升级成一个强工作流会话。

它不是新的 agent，也不是新的命令层，而是一个运行时工作流约束器。用户仍然发自然语言，插件负责在后台跟踪阶段、补系统规则、在空闲时自动续推下一步。

## 这个包主要写了什么

这个包现在只包含 3 类核心内容:

1. 插件入口

- 文件: `src/index.ts`
- 作用: 导出 OpenCode 可加载的插件对象。

2. Hook 编排

- 文件: `src/hooks.ts`
- 作用: 把 OpenCode 的会话事件接到 SmartX 工作流状态机上。
- 已接入的 hook:
  - `chat.message`
  - `experimental.chat.system.transform`
  - `tool.execute.before`
  - `tool.execute.after`
  - `event`，当前主要处理 `session.idle`

3. 状态机和规则

- 文件: `src/state.ts`
- 作用: 定义工作流状态、阶段切换、验证判定、自动续推文案。

## 这个插件在做什么

它会把 `smartx-helper` 会话强制拉进下面这条链路:

`discover -> plan -> implement -> verify -> handoff`

具体约束是:

- 如果还没读 `.project-state`、`README.md`、参考资料、`start.py`，就停留在 `discover`
- 如果已经完成上下文读取，但还没改代码，就推进到 `implement`
- 一旦发生写文件/编辑行为，就要求进入 `verify`
- 验证默认要求走 `smartx_start` + `smartx_logs`
- 如果日志失败，会回到“继续修再验”的循环
- 如果有明确外部阻塞，会进入 `handoff`
- 只有在交接信息也回写后，流程才会真正结束

## 激活条件

这个插件默认只对 `smartx-helper` 生效。

实现上有两种进入方式:

- 当前消息的 `input.agent === "smartx-helper"`
- 这个 session 已经存在一份 `workflow.json`，并且里面记录的 agent 是 `smartx-helper`

所以它很适合你现在这个场景:

- `/app/embed/session` 页面已经写死 agent 为 `smartx-helper`
- 不需要增加显式命令入口
- 不会影响其他普通 agent 会话

## 它如何记住流程状态

插件把状态持久化到工作区里的:

```text
.project-state/workflow.json
```

里面记录的核心信息包括:

- 当前 session id
- 当前阶段 `stage`
- 当前待办 `pending`
- 当前任务摘要 `intent`
- 是否 blocked
- 自动续推次数 `auto`
- 是否读过关键上下文
- 最近一次验证结果
- 最后更新时间

注意:

- 这个插件会懒创建 `.project-state/workflow.json`
- 它不会主动初始化整套 `.project-state` 模板文件
- 但它会要求 agent 去读取或回写 `progress.md`、`feature-list.json`、`session-log.md`

也就是说，`workflow.json` 是插件自己管的，其它状态文件仍然是 SmartX 工作区约定的一部分。

## 自动续推是怎么做的

当会话进入空闲态，且还有未完成的 `pending` 步骤时，插件会在后台用:

```text
ctx.client.session.promptAsync(...)
```

给当前 session 自动补一条内部 follow-up。

这条 follow-up 会带一个内部前缀:

```text
[smartx-workflow:auto]
```

这个前缀只给插件自己识别，目的是:

- 避免把插件自动续推误当成新的用户任务
- 避免流程结束后重复重建状态
- 让工作流能在“分析完就停”“改完代码就停”这种地方继续往下走

自动续推目前有一个安全上限:

- 同一个 session 最多自动续推 6 次
- 超过后会把状态标记为 blocked，避免无限循环

## 关键文件说明

```text
packages/smartx-workflow/
├─ src/
│  ├─ index.ts      # 插件入口
│  ├─ hooks.ts      # hook 注册与事件驱动
│  └─ state.ts      # 工作流状态机、规则、文案
├─ test/
│  ├─ hooks.test.ts # 空闲续推、hook 行为测试
│  └─ state.test.ts # 阶段迁移测试
├─ script/
│  └─ export.ts     # 打包成单文件插件
└─ dist/
   └─ smartx-workflow.js
```

## 怎么构建

在包目录下执行:

```bash
bun install
bun typecheck
bun test
bun run build
```

构建产物会输出到:

```text
packages/smartx-workflow/dist/smartx-workflow.js
```

## 怎么使用

这个包现在已经被收敛成“核心包 + 单文件产物”的形式了。

你的使用方式很简单:

1. 在 `packages/smartx-workflow` 下运行 `bun run build`
2. 取生成的 `dist/smartx-workflow.js`
3. 手工 copy 到你的全局 OpenCode 插件目录

这个包本身不再负责:

- 自动写入 `strategy-service`
- 自动注入某个 workspace 模板
- 自动复制到目标目录

也就是说，它现在只负责“产出插件”，部署动作由你自己控制。

## 测试覆盖了什么

目前测试重点在两块:

1. 状态迁移

- 初始进入 `discover`
- 读完关键上下文后进入 `implement`
- 代码修改后进入 `verify`
- 验证成功后进入 `handoff`
- 验证失败后回到修复循环

2. 空闲续推

- session idle 时会自动补下一步 prompt
- 自动 prompt 仍然带 SmartX 工作流约束

## 当前边界

这个包现在是“强工作流核心”，不是完整 SmartX 脚手架。

它默认假设工作区里存在或将存在这些约定资源:

- `.project-state/`
- `README.md`
- SmartX references
- `start.py`
- `smartx_start`
- `smartx_logs`

如果这些资源不存在，插件仍会强制流程前进要求，但最终能不能顺利完成，取决于你的工作区和工具环境是否已经具备。

## 一句话总结

这个包本质上就是:

“给 `smartx-helper` 会话加一层运行时工作流控制，让它不能只分析、不验证、不交接。”
