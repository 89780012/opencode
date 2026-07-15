# 兼容性与资料基线

## 当前基线

- 官方资料核对日期：2026-07-15。
- 仓库不包含 SmartX 内置 CPython 的 AkShare、BaoStock、Tushare 版本清单；`SMART_HOME` 由宿主在运行时注入。
- 因此本技能记录“官方 API 契约基线”，执行时仍必须读取实际安装版本并验证入口存在，不能声称未知运行时已经固定到某个版本。

## 分发包与导入名

| Provider | 分发包名 | 导入名 | 版本读取 |
| --- | --- | --- | --- |
| AkShare | `akshare` | `akshare` | `version("akshare")` |
| BaoStock | `baostock` | `baostock` | `version("baostock")` |
| Tushare | `tushare` | `tushare` | `version("tushare")` |

使用：

```python
from importlib.metadata import version

installed = version("akshare")
```

包不存在时报告环境缺口，不执行安装。不要打印解释器路径、`SMART_HOME` 或完整环境变量。

## 运行时验证

1. 读取分发包版本。
2. 使用 `hasattr(module, "entry")` 或对象属性验证本地文档中的入口存在。
3. 本地 API 已覆盖且入口存在时直接按 reference 调用，不联网查询同一语法。
4. 返回 DataFrame 后核对实际列名、类型、排序、重复键和空值，再做计算。
5. 入口不存在或关键字段漂移时报告 `contract_mismatch`，附有限的版本与实际入口/列证据。
6. 仅当 catalog 未覆盖且用户任务无法完成时，才访问下列官方来源。

## 官方来源

| Provider | 官方来源 |
| --- | --- |
| AkShare | `https://akshare.akfamily.xyz/`；股票 `data/stock/stock.html`；指数 `data/index/index.html`；基金 `data/fund/fund_public.html`；债券 `data/bond/bond.html`；期货 `data/futures/futures.html` |
| BaoStock | `https://baostock.com/helpDocsHome`；新版知识库由 `/helpdocs/api/menu` 提供目录，`pythonAPI.md`、`stockKData.md` 等为官方正文 |
| Tushare | `https://tushare.pro/document/2`；客户端初始化见 `document/1?doc_id=40`，各接口使用对应 `doc_id` 页面 |

禁止使用博客、论坛、问答转载或搜索摘要替代官方契约。

## 已知版本门槛

- Tushare 官方 Pro 客户端说明要求版本高于 `1.2.10`。
- `ts.pro_bar(..., adjfactor=True)` 从 Tushare `1.2.33` 起生效。
- `ts.pro_bar(..., asset="CB")` 的可转债资产类别从 Tushare `1.2.39` 起提供。
- BaoStock 2026 年知识库新增 `query_daily_history_k_AStock`、`query_daily_history_k_ETF`、`query_daily_adjust_factor`；旧运行时使用前必须 `hasattr` 验证。
- AkShare API 与上游网页耦合，包版本相同也可能因上游变更导致字段或可用性变化；以实际入口和有限返回列为最终证据。

## Tushare 凭据

- 只使用宿主或工作区已经配置的授权，让 `ts.pro_api()` 按现有配置初始化。
- 不在源码中硬编码 token，不通过 `args`、输出或日志传递 token，不枚举环境变量寻找凭据。
- 不调用会写入凭据文件的初始化流程，除非用户明确要求配置凭据且另有安全流程。
- 初始化失败时区分 token 缺失/无效、积分不足、接口未授权、限流和网络失败。

## 更新规则

SmartX 升级任一内置包时，同时执行以下动作：更新本页版本证据、核对 catalog 中所有常用入口、刷新对应 provider reference、运行实际包的最小查询，并与匹配的 `smartx-helper` 和 `smartx-workflow` 一起发布完整 skill 目录。
