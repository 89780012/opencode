# SmartX Python Runtime

## 1. 范围与触发条件

- 触发：工作台 AI 需要运行内联 Python，或运行已写入工作区的 Python 脚本。
- 目标：只能使用 `SMART_HOME` 解析出的 CPython，不得退回系统 Python、虚拟环境或包管理器启动器。

## 2. 签名

```ts
smartx_python({
  description: string,
  code?: string,
  file?: string,
  args?: string[],
  timeout?: number,
})
```

- `POST /api/model-chain/session/:sessionId/prompt` 必须在 JSON 解码后将 Agent 固定为 `smartx-helper`。

## 3. 契约

- `code` 与 `file` 必须且只能传一个。
- `file` 可以是相对当前工作目录的路径，也可以是绝对路径；不校验其是否位于当前 worktree。目标必须先经 `realpath`，并且是存在的 `.py` 常规文件。
- 内联代码使用 `python -u -`，文件使用 `python -u <resolved-file>`。两种形式都使用 argv 数组启动，不得拼接 Shell 命令。
- 只有 `smartx_python` 能解析 `SMART_HOME`。工具输出、日志和界面不得暴露解释器或 `SMART_HOME` 的真实路径。
- `tool.execute.before` 必须拦截 Bash 中的 Python 解释器、包管理器、虚拟环境启动器和 `.py` 直执行。

## 4. 校验与错误矩阵

| 条件 | 行为 |
| --- | --- |
| 未传或同时传 `code`、`file` | 在权限申请和进程启动前报错 |
| `file` 不存在、不是常规文件或不是 `.py` | 在进程启动前报错 |
| Bash 调用 `python`、`py`、`pip`、`uv`、`conda` 或 `.py` | 拒绝并要求改用 `smartx_python` |
| `SMART_HOME` 缺失或解释器不存在 | 返回脱敏运行时错误，不回退 PATH |
| 请求体给出其他 Agent | 服务端使用 `smartx-helper` |

## 5. Good / Base / Bad

- Good：写入 `scripts/query.py` 后调用 `smartx_python({ file: "scripts/query.py" })`。
- Base：调用 `smartx_python({ code: "print(1)" })`，保留原有超时、取消和输出上限。
- Bad：调用 `bash({ command: "python scripts/query.py" })`，或传入不存在、非文件、非 `.py` 的路径。不得启动进程。

## 6. 必需测试

- `packages/smartx-workflow/test/python.test.ts`：内联源代码、文件 argv、worktree 外相对/绝对路径、符号链接、双源输入和环境外命令识别。
- `packages/smartx-workflow/test/analysis.test.ts`：Bash 在 workspace gate 前被拒绝，系统提示包含 `smartx_python`。
- `packages/strategy-front/test/session-tool.test.ts`：文件调用按 Python 渲染，元数据不重复显示文件字段。
- `packages/strategy-service/internal/web/modelchain_api_test.go`：模型链请求归一化为 `smartx-helper`。

## 7. 错误与正确示例

错误：

```ts
await bash({ command: "python scripts/query.py" })
```

正确：

```ts
await smartx_python({
  description: "运行保存的行情查询脚本",
  file: "scripts/query.py",
})
```
