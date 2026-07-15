---
name: smartx-market-data
description: 通过 smartx_python 使用 SMART_HOME 内置 CPython 中已安装的 AkShare、BaoStock 或 Tushare 查询、清洗、比较和解释股票、指数、基金、可转债、期货及相关财务行情数据。涉及 Python 行情代码、证券列表、实时或历史 K 线、交易日历、复权、估值财务、字段口径或跨数据源比较时使用；纯概念讨论只说明，不执行代码。
---

# SmartX 行情数据

只把本技能用于行情与证券数据工作。固定通过 `smartx_python` 执行 Python；不安装依赖，不回退系统解释器，不把 Python 包再封装成 HTTP 或 MCP 接口。

## 读取顺序

1. 始终先读 `references/conventions.md` 和 `references/catalog.md`。
2. 准备执行时读 `references/compatibility.md`，确认版本与凭据边界。
3. 按 catalog 只读任务需要的 provider 文档：
   - AkShare：`references/akshare.md`
   - BaoStock：`references/baostock.md`
   - Tushare：`references/tushare.md`
4. 跨源比较或转换代码、日期、复权和量价单位时，再读 `references/comparison.md` 和全部目标 provider 文档。

## 执行流程

1. 判断用户是否明确要求查询、计算、验证或运行代码。纯讨论、方案比较和代码阅读不得调用 `smartx_python`。
2. 在 catalog 中按任务、数据范围、凭据、频率、字段稳定性和权限选择 provider。用户未要求比较时只用一个 provider。
3. 使用本地 provider 文档中的入口和参数，不凭模型记忆改写函数名。把标的、日期和其他动态值通过 `args` 传入源码。
4. 在同一次 Python 调用中读取分发包版本、验证目标入口、查询最小必要范围、检查实际列并输出有限 JSON。
5. 解释 provider、版本、查询条件、证券代码、时间范围、频率、复权、单位、缺失值和截断情况。

## 本地优先与降级

- catalog 和 provider 文档已覆盖的 API 禁止联网搜索语法；本地 reference 是正常执行路径。
- 运行时版本与文档基线不一致时，先做有限的 `hasattr`、签名或返回列检查。兼容时继续并报告差异；不兼容时停止依赖未知契约的计算。
- catalog 未覆盖时，先明确指出缺少的市场、数据集或入口。只有完成用户任务确实需要时，才降级到 `references/compatibility.md` 列出的官方来源，并只查询最小范围。
- 降级不得采用博客、问答转载或未经核对的代码；不得用语义不同的数据集静默替代失败入口。
- 网络、限流、登录、token、积分或权限失败不属于“本地文档未覆盖”，按真实错误返回，不自动切换 provider。

## `smartx_python` 约束

- `description` 写不超过 200 字的简短目的；内联源码写入 `code`，已保存的工作区 `.py` 脚本写入 `file`，两者只能传一个。`args` 传普通字符串，`timeout` 只在确有需要时设置为 1000 到 600000 毫秒。
- 禁止用 Bash、CMD、PowerShell、AppleScript 或终端启动 `python`、`python3`、`cpython`。
- 禁止执行 `pip`、安装、升级或卸载包，禁止为绕过工具创建临时启动脚本或常驻 REPL；需要执行已保存脚本时使用 `file`。
- 禁止输出 `SMART_HOME` 真实路径、完整环境变量、访问令牌、账号、会话或其他凭据。
- 查询从最小标的和最短时间窗口开始，禁止无分页抓取全市场、全历史或高频明细。
- DataFrame 和类似表格遵守 `references/conventions.md` 的行、列、文本上限，禁止直接打印无界完整表。
- provider 返回结构与预期不一致时，先输出有限的实际列证据，再停止依赖不确定字段的后续计算。

## 完成条件

- 说明 provider、已验证版本和使用的 API。
- 说明标的、时间范围、频率、复权、币种/单位和是否截断。
- 只基于实际返回数据下结论；空结果、字段缺失、版本漂移、权限和网络阻塞分别说明。
- 执行失败时保留不含凭据的可操作错误摘要，不切换解释器或安装依赖。
