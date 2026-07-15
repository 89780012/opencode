# 跨数据源口径

## A 股代码

| Provider | 平安银行示例 | 说明 |
| --- | --- | --- |
| AkShare | `000001` | 多数 A 股行情入口只要 6 位代码；少数财务或资金流入口要求 `000001.SZ` 或额外 `market="sz"`，以具体 API 为准 |
| BaoStock | `sz.000001` | 小写市场前缀加点号；上海 `sh.`、深圳 `sz.`，具体北京市场支持以运行时返回为准 |
| Tushare | `000001.SZ` | 6 位代码加大写交易所后缀；上交所 `.SH`、深交所 `.SZ`、北交所 `.BJ` |

不要只凭首位数字批量推断市场。优先从 `stock_info_a_code_name`、`query_all_stock`、`stock_basic` 等 provider 主数据取得代码，再建立显式映射。

指数、基金、可转债和期货的代码体系差异更大，必须先用各自的基础信息/实时列表接口取得 provider 原生代码，不复用股票代码转换规则。

## 日期与时间

| Provider | 日频日期 | 分钟日期时间 |
| --- | --- | --- |
| AkShare | `YYYYMMDD`，如 `20240131` | `YYYY-MM-DD HH:MM:SS` |
| BaoStock | `YYYY-MM-DD` | 日期仍为 `YYYY-MM-DD`，分钟返回的 `time` 常为 `YYYYMMDDHHMMSSsss` |
| Tushare | `YYYYMMDD` | `YYYY-MM-DD HH:MM:SS`；实时分钟接口返回自身时间字段 |

- 日频区间通常包含首尾，但仍以具体入口为准。
- 只含交易日的日期不要强加时区；分钟与实时数据必须说明交易所时区，A 股通常按 `Asia/Shanghai` 解释。
- 比较前转成统一 ISO 表示，按交易日或完整时间戳连接，不按 DataFrame 行号连接。

## 频率

| 频率 | AkShare | BaoStock | Tushare `pro_bar` | Tushare `stk_mins`/`rt_min` |
| --- | --- | --- | --- | --- |
| 日 | `daily` | `d` | `D` | - |
| 周 | `weekly` | `w` | `W` | - |
| 月 | `monthly` | `m` | `M` | - |
| 1 分钟 | `1` | 不提供 1 分钟 | `1min` | `1min` / `1MIN` |
| 5/15/30/60 分钟 | 字符串数字 | 字符串数字 | `5min` 等 | `5min` 等 / 实时接口大写 |

分钟数据的历史长度和权限不等价：AkShare 1 分钟通常只返回近 5 个交易日，BaoStock 从 5 分钟开始，Tushare 历史分钟需要单独权限。

## 复权

| 语义 | AkShare | BaoStock `adjustflag` | Tushare |
| --- | --- | --- | --- |
| 不复权 | `""` | `"3"` | `pro.daily` 天然未复权；`ts.pro_bar(adj=None)` |
| 前复权 | `"qfq"` | `"2"` | `ts.pro_bar(adj="qfq")` |
| 后复权 | `"hfq"` | `"1"` | `ts.pro_bar(adj="hfq")` |

- 不同 provider 的复权算法、基准日和分红再投资假设可能不同；不能把同名 `qfq` 当作数值完全一致。
- AkShare 和 Tushare 前复权历史值可能随新的公司行为变化；比较时记录查询日期和 `end_date`。
- BaoStock 使用涨跌幅复权法，官方明确说明可能与其他行情系统不同。
- 1 分钟接口常不支持复权；不要为了得到复权分钟线静默换成日线。

## 量价与比例单位

| 数据集 | 成交量 | 成交额 | 比例 |
| --- | --- | --- | --- |
| AkShare `stock_zh_a_spot_em` | 手 | 按实际列说明，常为人民币元 | 涨跌幅、换手率为 `%` 数值 |
| AkShare 其他入口 | 不统一 | 不统一 | 不统一；必须读入口字段说明 |
| BaoStock K 线 | 股 | 人民币元 | `pctChg`、`turn` 为百分比数值 |
| Tushare `daily` | 手 | 千元 | `pct_chg` 为百分比数值 |
| Tushare `rt_k` | 股 | 元 | 按返回字段 |
| Tushare `moneyflow` | 手 | 万元 | 各档位金额单位为万元 |

统一到分析单位时显式新增字段，例如 `volume_shares`、`amount_cny`、`return_ratio`；保留原字段，不覆盖后让来源不可追踪。百分比转小数应除以 100，并在列名或元数据中标明。

## 常见字段映射

| 语义 | AkShare A 股历史 | BaoStock | Tushare |
| --- | --- | --- | --- |
| 日期 | `日期` | `date` | `trade_date` |
| 代码 | `股票代码` | `code` | `ts_code` |
| 开高低收 | `开盘/最高/最低/收盘` | `open/high/low/close` | `open/high/low/close` |
| 昨收 | 入口相关 | `preclose` | `pre_close` |
| 成交量 | `成交量` | `volume` | `vol` |
| 成交额 | `成交额` | `amount` | `amount` |
| 涨跌幅 | `涨跌幅` | `pctChg` | `pct_chg` |

字段同名不代表单位相同；先转换单位，再统一列名。

## 跨源比较步骤

1. 固定同一证券及交易所，记录三个 provider 的原生代码。
2. 固定同一交易日集合、频率、币种、时区、复权语义和查询截止日。
3. 把量价与比例转为显式统一单位；保留 provider、版本和原字段。
4. 检查重复键、停牌、缺失交易日、排序和数值字符串。
5. 按业务键连接，只比较双方都存在的记录；分别报告仅单方存在的日期。
6. 使用绝对差、相对差和容差，不用直接 `==` 比较浮点数。
7. 发现差异时优先解释复权算法、更新时间、单位、停牌和上游来源，不武断认定某一方错误。
