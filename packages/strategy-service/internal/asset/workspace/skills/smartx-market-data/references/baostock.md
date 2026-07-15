# BaoStock 常用 API

## 目录

- [使用边界](#使用边界)
- [会话与结果集](#会话与结果集)
- [行情与证券主数据](#行情与证券主数据)
- [指数、复权与公司行为](#指数复权与公司行为)
- [财务数据](#财务数据)
- [直接查询配方](#直接查询配方)
- [错误处理](#错误处理)

## 使用边界

- 资料基线：BaoStock 官方知识库，2026-07-15 核对；运行时版本通过 `version("baostock")` 读取。
- 适合 A 股历史行情、交易日、证券主数据、主要指数成分、复权因子和基础财务数据。
- 每次 `smartx_python` 调用独立登录并在同次调用退出，不跨工具调用复用会话。
- 查询成功不能只看 Python 是否抛异常；登录对象和每个结果集都有 `error_code/error_msg`，`"0"` 才是成功。
- 结果集字段通常是字符串。日期、价格、量额、比率和空字符串在计算前显式转换。

## 会话与结果集

### 生命周期

```python
import baostock as bs

login = bs.login()
if login.error_code != "0":
    raise RuntimeError(f"BaoStock login failed: {login.error_code}: {login.error_msg[:200]}")
try:
    result = bs.query_trade_dates(start_date="2024-01-01", end_date="2024-01-31")
    # 检查并读取 result
finally:
    bs.logout()
```

禁止在登录失败后继续查询。`logout()` 放在 `finally`，但不打印会话对象或任何环境信息。

### 游标转 DataFrame

```python
import pandas as pd


def frame(result):
    if result.error_code != "0":
        raise RuntimeError(
            f"BaoStock query failed: {result.error_code}: {result.error_msg[:200]}"
        )
    rows = []
    while result.next():
        rows.append(result.get_row_data())
    return pd.DataFrame(rows, columns=result.fields)
```

只对有界日期或明确横截面使用该函数。若任务可能返回过多记录，应在查询范围上限制，而不是先加载全历史再裁剪。

## 行情与证券主数据

### 历史 K 线

```python
bs.query_history_k_data_plus(
    "sh.600000",
    "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,isST",
    start_date="2024-01-01",
    end_date="2024-01-31",
    frequency="d",
    adjustflag="3",
)
```

| 参数 | 取值 |
| --- | --- |
| `code` | `sh.600000`、`sz.000001` 等 provider 原生代码 |
| `fields` | 半角逗号分隔；字段必须与频率兼容 |
| `start_date/end_date` | `YYYY-MM-DD`，日线区间包含首尾 |
| `frequency` | `d` 日、`w` 周、`m` 月、`5/15/30/60` 分钟；没有 1 分钟 |
| `adjustflag` | `3` 不复权、`2` 前复权、`1` 后复权 |

日线常用字段：

- `date,code,open,high,low,close,preclose,volume,amount`
- `adjustflag,turn,tradestatus,pctChg,isST`
- 估值：`peTTM,pbMRQ,psTTM,pcfNcfTTM`

周/月线只使用 `date,code,open,high,low,close,volume,amount,adjustflag,turn,pctChg` 等支持字段。分钟线只使用 `date,time,code,open,high,low,close,volume,amount,adjustflag`；指数没有分钟数据。

单位与停牌：

- `volume` 为股，`amount` 为人民币元，`turn/pctChg` 为百分比数值。
- 日线停牌记录的开高低收可能都等于前收，成交量额为 0，换手率为空；使用 `tradestatus` 判断，不把它当普通无波动交易日。
- 空字符串数值转为 `null`，不要默认填 0，除非业务含义明确允许。

### 按日全市场接口

BaoStock 2026 年官方知识库新增：

```python
bs.query_daily_history_k_AStock(date="2026-02-05")
bs.query_daily_history_k_ETF(date="2026-02-05")
bs.query_daily_adjust_factor(date="2026-02-05")
```

- 日期为 `YYYY-MM-DD`；单次返回指定日期的全部 A 股、ETF 或复权因子。
- 这些入口在旧运行时可能不存在，调用前必须 `hasattr(bs, entry)`。
- 全市场结果只选用户需要的列与标的，不无界输出。

### 交易日与证券

```python
bs.query_trade_dates(start_date="2024-01-01", end_date="2024-01-31")
bs.query_all_stock(day="2024-01-31")
bs.query_stock_basic(code="sh.600000")
bs.query_stock_basic(code_name="浦发银行")
```

- `query_trade_dates` 返回 `calendar_date,is_trading_day`。
- `query_all_stock` 返回某日 `code,tradeStatus,code_name`；闭市后日线未更新时，当天可能为空。
- `query_stock_basic` 可按代码精确查或按名称模糊查；参数都为空会返回全部证券，不应在单标的任务中这样调用。
- 基础资料包含 `ipoDate,outDate,type,status`；`type` 可区分股票、指数、可转债、ETF 等。

## 指数、复权与公司行为

### 行业和指数成分

```python
bs.query_stock_industry()
bs.query_sz50_stocks()
bs.query_hs300_stocks()
bs.query_zz500_stocks()
```

- 行业分类可按运行时签名使用代码/日期过滤；不确定参数时先调用无参官方形式并限制输出，不猜参数名。
- 指数成分返回 provider 数据日期对应的成分，不表示任意历史时点。需要历史成分时必须确认接口实际日期能力。
- 指数行情仍使用 `query_history_k_data_plus`，例如上证指数 `sh.000001`；指数没有分钟线。

### 复权与分红

```python
bs.query_adjust_factor(code="sh.600000", start_date="2015-01-01", end_date="2017-12-31")
bs.query_dividend_data(code="sh.600000", year="2024", yearType="report")
```

- 复权因子包含 `dividOperateDate,foreAdjustFactor,backAdjustFactor,adjustFactor`。
- BaoStock 使用涨跌幅复权法，结果可能与 AkShare、Tushare 或行情软件不同。
- `yearType` 按官方语义使用，例如 `report`；不要把预案、报告年度和实施日期混为一谈。

## 财务数据

### 季频能力指标

以下入口使用相同的 `code/year/quarter` 结构：

```python
bs.query_profit_data(code="sh.600000", year=2024, quarter=2)
bs.query_operation_data(code="sh.600000", year=2024, quarter=2)
bs.query_growth_data(code="sh.600000", year=2024, quarter=2)
bs.query_balance_data(code="sh.600000", year=2024, quarter=2)
bs.query_cash_flow_data(code="sh.600000", year=2024, quarter=2)
bs.query_dupont_data(code="sh.600000", year=2024, quarter=2)
```

依次对应盈利、营运、成长、偿债、现金流和杜邦指标。返回值多为字符串，季度报告可能缺失或后续更正；必须同时保留统计日期和发布日期字段。

### 业绩快报与预告

```python
bs.query_performance_express_report(
    "sh.600000",
    start_date="2024-01-01",
    end_date="2024-12-31",
)
bs.query_forecast_report(
    "sh.600000",
    start_date="2024-01-01",
    end_date="2024-12-31",
)
```

快报、预告与正式财报不是同一口径。用于回测时按公告日防止未来数据泄漏，不按报告期末直接提前可用。

## 直接查询配方

先放入 `conventions.md` 的 `emit`，再加入以下查询块。工具 `args` 依次传 `code/start/end/adjustflag`。

```python
import sys
import baostock as bs
import pandas as pd


def collect(result):
    if result.error_code != "0":
        raise RuntimeError(
            f"BaoStock query failed: {result.error_code}: {result.error_msg[:200]}"
        )
    rows = []
    while result.next():
        rows.append(result.get_row_data())
    return pd.DataFrame(rows, columns=result.fields)


code, start, end, adjust = sys.argv[1:5]
login = bs.login()
if login.error_code != "0":
    raise RuntimeError(
        f"BaoStock login failed: {login.error_code}: {login.error_msg[:200]}"
    )
try:
    query = {
        "api": "query_history_k_data_plus",
        "code": code,
        "startDate": start,
        "endDate": end,
        "frequency": "d",
        "adjustflag": adjust,
    }
    result = bs.query_history_k_data_plus(
        code,
        "date,code,open,high,low,close,preclose,volume,amount,adjustflag,turn,tradestatus,pctChg,isST",
        start_date=start,
        end_date=end,
        frequency="d",
        adjustflag=adjust,
    )
    df = collect(result)
    required = {"date", "code", "open", "high", "low", "close"}
    missing = sorted(required.difference(df.columns))
    if missing:
        raise RuntimeError(
            f"BaoStock contract mismatch: missing columns {missing}; actual={list(df.columns)[:30]}"
        )
    emit("baostock", "baostock", query, df)
finally:
    bs.logout()
```

建议工具参数：`description="查询 BaoStock A 股日线"`，`args=["sz.000001", "2024-01-01", "2024-01-31", "2"]`。

## 错误处理

- 登录失败：输出有限 `error_code/error_msg` 后停止，不继续任何查询。
- 查询 `error_code != "0"`：按 `provider_error` 处理；不能仅因未抛 Python 异常就视为成功。
- `next()` 结束且无行：登录和查询成功时才是 `empty`，回显查询条件。
- 数值字符串：使用 `pandas.to_numeric(errors="coerce")` 显式转换，并报告转换后新增的空值。
- 新接口缺失：报告当前版本没有该入口，不能退化为全历史循环模拟全市场日接口。
- `logout()` 必须在同次调用执行；不要跨调用缓存登录对象、结果游标或 DataFrame。
