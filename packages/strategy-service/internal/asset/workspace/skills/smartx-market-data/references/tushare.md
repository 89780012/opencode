# Tushare 常用 API

## 目录

- [使用边界](#使用边界)
- [客户端与权限](#客户端与权限)
- [股票行情与市场数据](#股票行情与市场数据)
- [财务与公司行为](#财务与公司行为)
- [指数与基金](#指数与基金)
- [直接查询配方](#直接查询配方)
- [错误处理](#错误处理)

## 使用边界

- 资料基线：Tushare 官方文档，2026-07-15 核对；运行时版本通过 `version("tushare")` 读取。
- 适合字段结构稳定的中国市场行情、估值财务、指数基金和专业数据；可用性受 token、积分、频次与单独接口权限影响。
- 日期通常为 `YYYYMMDD`，证券代码通常为 `000001.SZ`；分钟接口使用完整日期时间。
- 显式选择 `fields` 和最小日期范围。单次上限不是建议抓满，禁止用无限循环绕过流控。

## 客户端与权限

```python
import tushare as ts

pro = ts.pro_api()
```

- 只使用宿主或工作区已配置的授权。不要在源码、`args`、日志或输出中出现 token。
- 不调用 `ts.set_token(...)` 写入凭据，除非用户明确进入独立的安全配置流程。
- 每个接口权限不同；把 token 无效、积分不足、未购买接口、限流和网络错误分别报告。
- `pro.query("api_name", ...)` 是通用 Pro 调用形式，但本地 reference 已覆盖时优先使用明确方法，例如 `pro.trade_cal(...)`，便于参数审查。

## 股票行情与市场数据

### 股票基础与交易日

```python
pro.stock_basic(
    ts_code="000001.SZ",
    list_status="L",
    exchange="SZSE",
    fields="ts_code,symbol,name,area,industry,market,exchange,list_status,list_date",
)
pro.trade_cal(
    exchange="SSE",
    start_date="20240101",
    end_date="20240131",
    is_open="1",
    fields="exchange,cal_date,is_open,pretrade_date",
)
```

- `stock_basic` 还支持 `name`、`market`、`is_hs`；单次最多约 6000 行，官方建议基础信息低频获取。
- `list_status`：`L` 上市、`D` 退市、`P` 暂停上市、`G` 未交易。
- `exchange`：股票常用 `SSE/SZSE/BSE`；交易日还支持 `CFFEX/SHFE/CZCE/DCE/INE`。
- 不要把 `trade_cal` 默认上交所日历当作所有资产交易日历。

### A 股日线与通用 K 线

未复权日线：

```python
pro.daily(
    ts_code="000001.SZ",
    start_date="20240101",
    end_date="20240131",
    fields="ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount",
)
```

- `daily` 只返回未复权行情，停牌期间通常不提供记录。
- `ts_code`、`trade_date`、日期区间至少提供一种有效过滤；支持逗号分隔多代码，但不要用它抓取无界组合。
- `vol` 单位手，`amount` 单位千元，`pct_chg` 为百分比数值。
- 单次最多约 6000 条；全市场历史按交易日分段，不按每只股票无限循环。

通用行情：

```python
ts.pro_bar(
    ts_code="000001.SZ",
    start_date="20240101",
    end_date="20240131",
    asset="E",
    adj="qfq",
    freq="D",
    ma=[5, 20],
    factors=["tor", "vr"],
    adjfactor=True,
)
```

| 参数 | 取值/说明 |
| --- | --- |
| `asset` | `E` 股票、`I` 沪深指数、`FT` 期货、`FD` 基金、`O` 期权、`CB` 可转债 |
| `adj` | `None` 不复权、`qfq` 前复权、`hfq` 后复权；只对股票日线复权 |
| `freq` | `D/W/M` 或 `1min/5min/15min/30min/60min` |
| `ma` | 均线周期列表；开始日期必须早于最大周期所需窗口 |
| `factors` | 股票支持 `tor` 换手率、`vr` 量比 |
| `adjfactor` | `True` 时附复权因子；要求 Tushare `1.2.33+` |

`pro_bar` 是 `ts.pro_bar(...)`，不是 `pro.pro_bar(...)`；它在 SDK 层集成多个接口，不能照搬为普通 HTTP API。

### 复权因子与每日指标

```python
pro.adj_factor(ts_code="000001.SZ", start_date="20240101", end_date="20240131")
pro.daily_basic(
    ts_code="000001.SZ",
    start_date="20240101",
    end_date="20240131",
    fields="ts_code,trade_date,close,turnover_rate,volume_ratio,pe,pe_ttm,pb,ps_ttm,total_mv,circ_mv",
)
```

- `adj_factor` 返回 `ts_code,trade_date,adj_factor`；复权算法以 Tushare 为准。
- `daily_basic` 要求 `ts_code` 或 `trade_date`，常用估值与市值字段可能为空；PE 亏损时为空不是错误。
- 市值和流通市值的官方单位通常为万元，使用具体字段说明核对后转换。

### 分钟与实时

```python
pro.stk_mins(
    ts_code="600000.SH",
    freq="5min",
    start_date="2024-01-02 09:00:00",
    end_date="2024-01-02 16:00:00",
)
pro.rt_k(ts_code="600000.SH")
pro.rt_min(freq="5MIN", ts_code="600000.SH,000001.SZ")
```

- `stk_mins`：`1min/5min/15min/30min/60min`，单次最多约 8000 行，需要单独分钟权限。
- `rt_k` 支持 `6*.SH` 等通配符并可一次取全市场，单次最多约 6000 行；只有明确需要横截面时使用。`vol` 单位股、`amount` 单位元。
- `rt_min` 频率必须大写 `1MIN/5MIN/15MIN/30MIN/60MIN`，单次最多约 1000 行，可逗号分隔多个代码。
- 历史分钟与实时分钟不是同一数据集；不要因权限失败静默替换。

### 涨跌停、停复牌、资金流与两融

```python
pro.stk_limit(ts_code="000001.SZ", start_date="20240101", end_date="20240131")
pro.suspend_d(suspend_type="S", trade_date="20240102")
pro.moneyflow(ts_code="000001.SZ", start_date="20240101", end_date="20240131")
pro.margin(exchange_id="SSE", start_date="20240101", end_date="20240131")
```

- `stk_limit` 返回 `pre_close,up_limit,down_limit`，可按单日取全市场或按股票取区间。
- `suspend_type`：`S` 停牌、`R` 复牌；按交易日或区间查询。
- `moneyflow` 各档位成交量单位手、金额单位万元，不能与 `daily.amount` 直接比较。
- `margin` 为交易所汇总；融资余额/金额为元，融券量的单位随证券类型可能为股、份或手。

## 财务与公司行为

### 三大报表

```python
pro.income(ts_code="000001.SZ", start_date="20240101", end_date="20241231", period="20241231")
pro.balancesheet(ts_code="000001.SZ", start_date="20240101", end_date="20241231", period="20241231")
pro.cashflow(ts_code="000001.SZ", start_date="20240101", end_date="20241231", period="20241231")
```

- `ts_code` 必填；可按 `ann_date/f_ann_date/start_date/end_date/period` 过滤，报表还支持 `report_type/comp_type`。
- `comp_type` 常用 `1` 工商业、`2` 银行、`3` 保险、`4` 证券；不同公司类型字段适用性不同。
- 普通接口按单只股票取历史；全市场季度 VIP 接口权限更高，不在无明确需求时使用。
- 回测按实际公告日 `f_ann_date/ann_date` 控制可用时间，不能按报告期末提前使用。

### 财务指标与分红

```python
pro.fina_indicator(
    ts_code="000001.SZ",
    start_date="20240101",
    end_date="20241231",
    period="20241231",
)
pro.dividend(ts_code="000001.SZ", ex_date="20240614")
```

- `fina_indicator` 单次最多约 100 条，常用 `eps,roe,roa,grossprofit_margin,debt_to_assets` 等字段；先显式选择所需字段。
- `dividend` 至少提供 `ts_code/ann_date/record_date/ex_date/imp_ann_date` 之一，返回预案、实施进度、送转和现金分红字段。
- 分红预案、股权登记日、除权除息日和实施公告日用途不同；收益计算使用明确的实施和除权口径。

## 指数与基金

### 指数

```python
pro.index_basic(market="SSE")
pro.index_daily(ts_code="000300.SH", start_date="20240101", end_date="20240131")
pro.index_weight(index_code="000300.SH", start_date="20240101", end_date="20240131")
```

- 指数代码先从 `index_basic` 取得；`market` 表示交易所或服务商，不能按股票后缀猜发布方。
- `index_daily` 返回点位及 `vol`（手）、`amount`（千元）；部分指数的成交量额口径与行情软件全市场统计不同。
- `index_weight` 为月度成分权重，开始/结束日期建议覆盖当月首尾；按 `index_code,con_code,trade_date` 作为业务键。

### 基金与 ETF

```python
pro.fund_basic(market="E", status="L")
pro.fund_nav(ts_code="000001.OF", start_date="20240101", end_date="20240131", market="O")
pro.fund_daily(ts_code="510300.SH", start_date="20240101", end_date="20240131")
```

- `fund_basic`：`market="E"` 场内、`O` 场外；`status` 为 `D/I/L`。
- `fund_nav` 按基金代码或净值日查询，返回单位净值、累计净值、分红和资产净值。
- `fund_daily` 是 ETF 收盘行情，单次最多约 5000 行，需要较高积分；价格单位元、涨跌幅 `%`，量额按接口字段说明转换。
- ETF 复权可通过 `ts.pro_bar(asset="FD", ...)` 能力核对，但股票专用 `adj` 规则不能未经验证直接套用基金。

## 直接查询配方

先放入 `conventions.md` 的 `emit`，再加入以下查询块。工具 `args` 依次传 `ts_code/start/end`。

```python
import sys
import tushare as ts

code, start, end = sys.argv[1:4]
pro = ts.pro_api()
entry = "daily"
if not hasattr(pro, entry):
    raise RuntimeError(f"Tushare contract mismatch: missing {entry}")

fields = "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount"
query = {
    "api": entry,
    "tsCode": code,
    "startDate": start,
    "endDate": end,
    "adjust": None,
    "fields": fields.split(","),
}
df = pro.daily(
    ts_code=code,
    start_date=start,
    end_date=end,
    fields=fields,
)
required = {"ts_code", "trade_date", "open", "high", "low", "close"}
missing = sorted(required.difference(df.columns))
if missing:
    raise RuntimeError(
        f"Tushare contract mismatch: missing columns {missing}; actual={list(df.columns)[:30]}"
    )
emit("tushare", "tushare", query, df)
```

建议工具参数：`description="查询 Tushare A 股未复权日线"`，`args=["000001.SZ", "20240101", "20240131"]`。需要复权时明确改用 `ts.pro_bar`，不要给 `pro.daily` 增加不存在的 `adj` 参数。

## 错误处理

- `ts.pro_api()` 失败：按凭据错误处理，不打印 token，不匿名降级。
- 返回权限/积分错误：报告接口名和权限类别，不循环重试，不换免费入口掩盖失败。
- 限流：立即停止；不要通过高频循环、拆分代码或多个 provider 规避。
- 空 DataFrame：请求成功时报告无数据，并核对代码后缀、日期、上市状态、停牌和接口更新时间。
- `pro_bar` 与具体 Pro 接口字段不完全相同；必须检查实际列，不能假定所有资产都有股票字段。
- 财务宽表只输出必要字段；未知 `report_type/comp_type` 不猜测，回到本地参数说明或报告契约缺口。
