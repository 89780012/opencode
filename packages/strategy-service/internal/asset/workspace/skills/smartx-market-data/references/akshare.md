# AkShare 常用 API

## 目录

- [使用边界](#使用边界)
- [A 股与实时行情](#a-股与实时行情)
- [板块、事件与财务](#板块事件与财务)
- [指数与基金](#指数与基金)
- [港美股、可转债与期货](#港美股可转债与期货)
- [直接查询配方](#直接查询配方)
- [错误与字段漂移](#错误与字段漂移)

## 使用边界

- 资料基线：AkShare 官方文档，2026-07-15 核对；运行时实际版本通过 `version("akshare")` 读取。
- 适合无 token 的公开市场探索、实时快照、历史行情、板块、指数、基金、可转债和期货查询。
- AkShare 聚合多个上游站点。同一包内不同入口的代码格式、字段、单位、历史长度和可用性也可能不同，禁止从一个入口推广到全部入口。
- 上游页面变化、反爬、连接失败或字段漂移属于 `network` 或 `contract_mismatch`，不是空行情。
- 先调用最小标的/时间窗口；全市场实时接口只在用户确实需要横截面时调用，并立即筛选。

## A 股与实时行情

### 主数据与快照

| API | 调用形式 | 主要返回/限制 |
| --- | --- | --- |
| A 股代码名称 | `ak.stock_info_a_code_name()` | 全部沪深京 A 股；列 `code`、`name` |
| 全市场实时 | `ak.stock_zh_a_spot_em()` | 全部沪深京 A 股；`代码`、`名称`、`最新价`、`涨跌幅`、`成交量`、`成交额` 等；成交量单位为手 |
| 个股资料 | `ak.stock_individual_info_em(symbol="000001", timeout=None)` | `item/value` 两列，股票代码为 6 位数字 |
| 五档报价 | `ak.stock_bid_ask_em(symbol="000001")` | `item/value`；包含买卖盘、最新价等 |
| ST 股票 | `ak.stock_zh_a_st_em()` | 当前风险警示板全量快照 |
| 两网及退市 | `ak.stock_zh_a_stop_em()` | 当前两网及退市证券快照 |

实时全市场数据量较大。需要单只股票时，优先调用个股资料/盘口，或在取得快照后先按 `代码` 筛选再输出。

### 历史 K 线

```python
ak.stock_zh_a_hist(
    symbol="000001",
    period="daily",
    start_date="20240101",
    end_date="20240131",
    adjust="",
    timeout=None,
)
```

- `symbol`：6 位 A 股代码。
- `period`：`daily`、`weekly`、`monthly`。
- `adjust`：`""` 不复权、`qfq` 前复权、`hfq` 后复权。
- 典型列：`日期`、`股票代码`、`开盘`、`收盘`、`最高`、`最低`、`成交量`、`成交额`、`振幅`、`涨跌幅`、`涨跌额`、`换手率`。
- 当日收盘数据在收盘后获取；前复权历史值会随新的除权除息事件变化。

### 分钟与盘前

```python
ak.stock_zh_a_hist_min_em(
    symbol="000001",
    start_date="2024-01-02 09:30:00",
    end_date="2024-01-02 15:00:00",
    period="5",
    adjust="",
)
```

- `period`：`1`、`5`、`15`、`30`、`60`。
- 1 分钟仅近 5 个交易日且不复权；其他周期也只保证近期数据。
- 1 分钟典型列：`时间`、`开盘`、`收盘`、`最高`、`最低`、`成交量`、`成交额`、`均价`。
- 5/15/30/60 分钟可能额外返回 `振幅`、`涨跌幅`、`换手率`。

盘前到收盘分钟：

```python
ak.stock_zh_a_hist_pre_min_em(
    symbol="000001",
    start_time="09:00:00",
    end_time="15:40:00",
)
```

该入口只返回最近一个交易日，不能替代历史分钟接口。

## 板块、事件与财务

### 行业和概念板块

| 任务 | 行业板块 | 概念板块 |
| --- | --- | --- |
| 列表/实时 | `ak.stock_board_industry_name_em()` | `ak.stock_board_concept_name_em()` |
| 成分 | `ak.stock_board_industry_cons_em(symbol="BK1027")` | `ak.stock_board_concept_cons_em(symbol="BK0655")` |
| 历史 | `ak.stock_board_industry_hist_em(symbol="小金属", start_date="20240101", end_date="20240131", period="日k", adjust="")` | `ak.stock_board_concept_hist_em(symbol="绿色电力", period="daily", start_date="20240101", end_date="20240131", adjust="")` |

注意行业历史 `period` 使用 `日k/周k/月k`，概念历史使用 `daily/weekly/monthly`。先从列表接口取得板块代码或名称，不手写猜测。

### 市场事件与资金

| API | 调用形式 | 说明 |
| --- | --- | --- |
| 个股资金流 | `ak.stock_individual_fund_flow(stock="000001", market="sz")` | 近约 100 个交易日；`market` 为 `sh/sz/bj`；金额与占比字段并存 |
| 停复牌 | `ak.stock_tfp_em(date="20240426")` | 指定日期；含停牌时间、原因、预计复牌时间 |
| 涨停股池 | `ak.stock_zt_pool_em(date="20241008")` | 只能取近期日期；含涨跌幅、成交额、市值、封板信息 |
| 龙虎榜 | `ak.stock_lhb_detail_em(start_date="20240101", end_date="20240131")` | 指定日期区间；先限制窗口 |
| 分红配送 | `ak.stock_fhps_em(date="20231231")` | 日期只用半年报/年报期末 `XXXX0630` 或 `XXXX1231` |

### 财务数据

```python
ak.stock_financial_abstract(symbol="600004")
ak.stock_financial_analysis_indicator_em(symbol="301389.SZ", indicator="按报告期")
```

- `stock_financial_abstract` 返回关键指标的历史宽表，报告期作为列，使用 6 位代码。
- `stock_financial_analysis_indicator_em` 使用带后缀代码，`indicator` 为 `按报告期` 或 `按单季度`，返回 `REPORT_DATE`、`EPSJB` 等大量字段。
- 财务接口字段多且可能调整。必须先选必要列，不输出整个宽表；报告期、公告日和单季度/累计口径不可混用。

## 指数与基金

### 指数

```python
ak.stock_zh_index_spot_em(symbol="沪深重要指数")
ak.index_zh_a_hist(symbol="000300", period="daily", start_date="20240101", end_date="20240131")
ak.index_zh_a_hist_min_em(
    symbol="399006",
    period="5",
    start_date="2024-01-02 09:30:00",
    end_date="2024-01-02 15:00:00",
)
ak.index_stock_cons_csindex(symbol="000300")
```

- 实时指数 `symbol` 可选 `沪深重要指数`、`上证系列指数`、`深证系列指数`、`指数成份`、`中证系列指数`。
- 历史和分钟指数代码不带市场标识；历史周期为 `daily/weekly/monthly`。
- 指数 1 分钟通常只能返回当前数据，其他分钟周期也只提供近期数据。
- 中证成分入口返回成分券代码、名称、交易所和日期；成分会随日期变化，使用前报告数据日期。

### ETF 与公募基金

```python
ak.fund_name_em()
ak.fund_etf_spot_em()
ak.fund_etf_hist_em(
    symbol="159707",
    period="daily",
    start_date="20240101",
    end_date="20240131",
    adjust="",
)
ak.fund_etf_hist_min_em(
    symbol="159707",
    start_date="2024-01-02 09:30:00",
    end_date="2024-01-02 15:00:00",
    period="5",
    adjust="",
)
```

- `fund_name_em()` 返回全部基金代码、简称和类型。
- ETF 实时返回 `代码`、`名称`、`最新价`、`IOPV实时估值`、`基金折价率`、成交量额等。
- ETF 历史的 `period` 和 `adjust` 与 A 股历史相同；1 分钟同样只近 5 个交易日且不复权。

开放式基金与持仓：

```python
ak.fund_open_fund_info_em(symbol="710001", indicator="单位净值走势", period="成立来")
ak.fund_portfolio_hold_em(symbol="000001", date="2024")
```

- `indicator` 常用 `单位净值走势`、`累计净值走势`、`累计收益率走势`、`分红送配详情`；`period` 只对累计收益率走势有效。
- 持仓返回占净值比例 `%`、持股数 `万股`、持仓市值 `万元`，必须转换后再与股票行情比较。

## 港美股、可转债与期货

### 港股与美股

```python
ak.stock_hk_spot_em()
ak.stock_hk_hist(symbol="00593", period="daily", start_date="20240101", end_date="20240131", adjust="")
ak.stock_hk_hist_min_em(symbol="01611", period="5", adjust="", start_date="2024-01-02 09:30:00", end_date="2024-01-02 16:00:00")

ak.stock_us_spot_em()
ak.stock_us_hist(symbol="105.MSFT", period="daily", start_date="20240101", end_date="20240131", adjust="")
ak.stock_us_hist_min_em(symbol="105.MSFT", start_date="2024-01-02 09:30:00", end_date="2024-01-02 16:00:00")
```

- 港股实时与分钟数据可能延时约 15 分钟，价格单位港元。
- 美股代码必须从 `stock_us_spot_em()` 的 `代码` 列取得，不要仅传交易所 ticker；价格单位美元。
- 港美股交易时区、夏令时、币种和复权不能套用 A 股约定。

### 可转债

```python
ak.bond_zh_hs_cov_spot()
ak.bond_zh_hs_cov_daily(symbol="sh113542")
ak.bond_zh_cov_info(symbol="123121", indicator="基本信息")
```

- 实时入口返回全市场，先按代码过滤。
- 历史代码带 `sh/sz` 前缀；详情代码为纯数字。
- `bond_zh_cov_info` 的 `indicator` 可用 `基本信息`、`中签号`、`筹资用途`、`重要日期`，基本信息字段很多，只选必要字段。

### 国内期货

```python
ak.futures_zh_realtime(symbol="白糖")
ak.futures_zh_daily_sina(symbol="RB0")
ak.futures_zh_minute_sina(symbol="IF2008", period="5")
ak.futures_main_sina(symbol="IF0", start_date="20240101", end_date="20240131")
ak.get_futures_daily(start_date="20240101", end_date="20240105", market="CFFEX")
```

- `futures_zh_realtime` 用品种中文名；`futures_zh_daily_sina` 和主力连续用合约符号；分钟合约符号需大写。
- `get_futures_daily` 的 `market` 为 `CFFEX/INE/CZCE/DCE/SHFE/GFEX`，单次返回某交易所区间内所有品种，必须限制日期。
- 期货返回结算价、持仓量等股票没有的字段；连续合约不是可交易具体合约。

## 直接查询配方

先放入 `conventions.md` 的 `emit`，再加入以下查询块。工具 `args` 依次传 `symbol/start/end/adjust`。

```python
import sys
import akshare as ak

symbol, start, end, adjust = sys.argv[1:5]
entry = "stock_zh_a_hist"
if not hasattr(ak, entry):
    raise RuntimeError(f"AkShare contract mismatch: missing {entry}")

query = {
    "api": entry,
    "symbol": symbol,
    "period": "daily",
    "startDate": start,
    "endDate": end,
    "adjust": adjust,
}
df = ak.stock_zh_a_hist(
    symbol=symbol,
    period="daily",
    start_date=start,
    end_date=end,
    adjust=adjust,
)
required = {"日期", "开盘", "最高", "最低", "收盘"}
missing = sorted(required.difference(df.columns))
if missing:
    raise RuntimeError(f"AkShare contract mismatch: missing columns {missing}; actual={list(df.columns)[:30]}")
emit("akshare", "akshare", query, df)
```

建议工具参数：`description="查询 A 股日线"`，`args=["000001", "20240101", "20240131", "qfq"]`。不要把这些值拼进 shell。

## 错误与字段漂移

- `ImportError`：报告内置环境缺少 `akshare`，不安装。
- `AttributeError` 或 `hasattr` 为假：报告当前版本入口不匹配，不根据相似名字自动替换。
- 连接、TLS、解析、反爬或上游返回格式错误：归类为网络/上游错误；最多缩小范围诊断一次。
- 空 DataFrame：报告查询成功但无数据，并回显代码、日期和入口。
- 中文列变化：输出最多 30 个实际列名，停止依赖缺失字段的计算。
- 同一 API 的返回顺序不保证稳定；所有时间序列在计算前显式解析日期并排序。
