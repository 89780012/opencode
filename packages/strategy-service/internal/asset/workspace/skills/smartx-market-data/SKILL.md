---
name: smartx-market-data
description: 通过 smartx_python 使用 SMART_HOME 内置 CPython 中已安装的 AkShare、BaoStock 或 Tushare 查询、清洗、比较和解释行情数据。涉及 Python 行情代码、数据源选择、字段核对或三套库的请求时使用；纯概念讨论只提供说明，不执行代码。
---

# SmartX 行情数据

只把本技能用于行情数据工作。Python 执行入口固定为 `smartx_python`；本技能不提供解释器、不安装依赖，也不把 Python 包封装成新的 HTTP 或 MCP 接口。

## 执行流程

1. 先判断用户是否明确要求查询、计算、验证或运行代码。纯讨论、方案比较和代码阅读不得触发执行。
2. 始终先读 `references/conventions.md`，再按数据源读取对应参考：
   - AkShare：`references/akshare.md`
   - BaoStock：`references/baostock.md`
   - Tushare：`references/tushare.md`
   - 跨源比较：读取所有相关 provider 参考，但只执行完成任务所需的最少查询。
3. 根据数据范围、凭据、频率和字段稳定性选择 provider。没有必要时不要同时调用多个 provider。
4. 在提交的 Python 代码中验证当前已安装包的版本、目标入口和实际返回列。以当前运行环境为准，不凭模型记忆假定 API 签名。
5. 仅调用 `smartx_python`。把简短目的写入 `description`，把完整源码写入 `code`；动态输入优先通过 `args` 传递，不拼接 shell 命令。
6. 对结果执行行数、列数和文本长度限制，再解释数据来源、查询条件、单位、复权口径、缺失值和截断情况。

## 强制约束

- 禁止用 Bash、CMD、PowerShell、AppleScript 或终端启动 `python`、`python3`、`cpython`。
- 禁止在运行时执行 `pip`、安装、升级或卸载包。包缺失时直接报告环境缺口。
- 禁止回退到系统 Python，禁止创建临时启动脚本或常驻 REPL。
- 禁止输出 `SMART_HOME` 真实路径、完整环境变量、访问令牌、账号或其他凭据。
- 不把空结果描述为接口失败，也不把网络、权限、限流或登录失败描述为空行情。
- DataFrame 和类似表格必须遵守 `references/conventions.md` 的输出上限，禁止直接打印无界完整表。
- provider 返回结构与预期不一致时，先输出经过限制的实际列信息，再停止依赖不确定字段的后续计算。

## 完成条件

- 说明使用的 provider 和已验证版本。
- 说明标的、时间范围、频率、复权/单位及数据是否截断。
- 只基于实际返回的数据下结论；缺失字段、权限或网络阻塞必须明确指出。
- 执行失败时保留可操作错误摘要，不尝试切换解释器或安装依赖。
