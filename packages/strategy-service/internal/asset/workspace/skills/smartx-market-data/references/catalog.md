# 常用任务目录

本目录用于从用户任务直接定位 provider 和 API。先按任务选一个首选入口，再读取对应 provider reference；“备选”只表示能力接近，不表示失败后可以静默切换。

## 目录

- [Provider 选择](#provider-选择)
- [AkShare 常用 API](#akshare-常用-api)
- [BaoStock 常用 API](#baostock-常用-api)
- [Tushare 常用 API](#tushare-常用-api)
- [本地未覆盖时](#本地未覆盖时)

## Provider 选择

| 需求 | 首选 | 原因与边界 |
| --- | --- | --- |
| 无 token 的中国公开市场探索 | AkShare | 覆盖广，入口多；上游网页变化、字段漂移和反爬风险较高 |
| A 股历史 K 线、交易日、指数成分、基础财务 | BaoStock | 会话和字段边界清楚；实时覆盖有限，返回值常为字符串 |
| 结构化中国市场、稳定字段、财务与专业数据 | Tushare | 字段和数据集规范；依赖 token、积分、频次与单独权限 |
| 跨源核验 | 用户指定的多个源 | 必须读取 `comparison.md`，统一标的、交易日、复权和单位后再比较 |

## AkShare 常用 API

详细参数、字段和限制见 `akshare.md`。

### A 股与实时行情

| 任务 | API |
| --- | --- |
| 沪深京 A 股代码与名称 | `stock_info_a_code_name()` |
| 全市场实时快照 | `stock_zh_a_spot_em()` |
| 个股基本信息 | `stock_individual_info_em(symbol)` |
| 五档盘口/行情报价 | `stock_bid_ask_em(symbol)` |
| 日/周/月历史 K 线 | `stock_zh_a_hist(...)` |
| 1/5/15/30/60 分钟 K 线 | `stock_zh_a_hist_min_em(...)` |
| 盘前分钟数据 | `stock_zh_a_hist_pre_min_em(...)` |
| ST 风险警示股票 | `stock_zh_a_st_em()` |
| 两网及退市股票 | `stock_zh_a_stop_em()` |
| 港股实时/历史/分钟 | `stock_hk_spot_em()`、`stock_hk_hist(...)`、`stock_hk_hist_min_em(...)` |
| 美股实时/历史/分钟 | `stock_us_spot_em()`、`stock_us_hist(...)`、`stock_us_hist_min_em(...)` |

### 板块、事件与资金

| 任务 | API |
| --- | --- |
| 行业板块列表/成分/历史 | `stock_board_industry_name_em()`、`stock_board_industry_cons_em(...)`、`stock_board_industry_hist_em(...)` |
| 概念板块列表/成分/历史 | `stock_board_concept_name_em()`、`stock_board_concept_cons_em(...)`、`stock_board_concept_hist_em(...)` |
| 个股资金流向 | `stock_individual_fund_flow(stock, market)` |
| 停复牌 | `stock_tfp_em(date)` |
| 涨停股池 | `stock_zt_pool_em(date)` |
| 龙虎榜详情 | `stock_lhb_detail_em(start_date, end_date)` |
| 分红配送 | `stock_fhps_em(date)` |
| 财务摘要/主要指标 | `stock_financial_abstract(symbol)`、`stock_financial_analysis_indicator_em(symbol, indicator)` |

### 指数、基金、债券与期货

| 任务 | API |
| --- | --- |
| 指数实时/历史/分钟 | `stock_zh_index_spot_em(symbol)`、`index_zh_a_hist(...)`、`index_zh_a_hist_min_em(...)` |
| 中证指数成分 | `index_stock_cons_csindex(symbol)` |
| 基金代码与名称 | `fund_name_em()` |
| ETF 实时/历史/分钟 | `fund_etf_spot_em()`、`fund_etf_hist_em(...)`、`fund_etf_hist_min_em(...)` |
| 开放式基金净值走势 | `fund_open_fund_info_em(...)` |
| 基金持仓 | `fund_portfolio_hold_em(symbol, date)` |
| 可转债实时/历史/详情 | `bond_zh_hs_cov_spot()`、`bond_zh_hs_cov_daily(symbol)`、`bond_zh_cov_info(...)` |
| 国内期货实时/日线/分钟 | `futures_zh_realtime(symbol)`、`futures_zh_daily_sina(symbol)`、`futures_zh_minute_sina(...)` |
| 主力连续/交易所日线 | `futures_main_sina(...)`、`get_futures_daily(...)` |

## BaoStock 常用 API

详细参数、游标读取和会话生命周期见 `baostock.md`。

| 任务 | API |
| --- | --- |
| 登录/退出 | `login()`、`logout()` |
| 日/周/月/分钟 K 线及估值 | `query_history_k_data_plus(...)` |
| 某日全市场 A 股/ETF 日线 | `query_daily_history_k_AStock(date)`、`query_daily_history_k_ETF(date)` |
| 交易日历 | `query_trade_dates(start_date, end_date)` |
| 某日全部证券 | `query_all_stock(day)` |
| 证券基本资料 | `query_stock_basic(code=...)` 或 `query_stock_basic(code_name=...)` |
| 行业分类 | `query_stock_industry(...)` |
| 上证 50/沪深 300/中证 500 成分 | `query_sz50_stocks()`、`query_hs300_stocks()`、`query_zz500_stocks()` |
| 历史/单日复权因子 | `query_adjust_factor(...)`、`query_daily_adjust_factor(date)` |
| 分红除权 | `query_dividend_data(...)` |
| 盈利/营运/成长/偿债/现金流/杜邦 | `query_profit_data(...)`、`query_operation_data(...)`、`query_growth_data(...)`、`query_balance_data(...)`、`query_cash_flow_data(...)`、`query_dupont_data(...)` |
| 业绩快报/预告 | `query_performance_express_report(...)`、`query_forecast_report(...)` |

## Tushare 常用 API

详细参数、单位、积分与权限见 `tushare.md`。

| 任务 | API |
| --- | --- |
| Pro 客户端 | `ts.pro_api()` |
| 股票基础信息/交易日历 | `pro.stock_basic(...)`、`pro.trade_cal(...)` |
| A 股未复权日线 | `pro.daily(...)` |
| 股票/指数/基金/期货通用 K 线 | `ts.pro_bar(...)` |
| 复权因子/每日估值 | `pro.adj_factor(...)`、`pro.daily_basic(...)` |
| 历史分钟/实时日线/实时分钟 | `pro.stk_mins(...)`、`pro.rt_k(...)`、`pro.rt_min(...)` |
| 涨跌停/停复牌 | `pro.stk_limit(...)`、`pro.suspend_d(...)` |
| 资金流/融资融券 | `pro.moneyflow(...)`、`pro.margin(...)` |
| 利润表/资产负债表/现金流量表 | `pro.income(...)`、`pro.balancesheet(...)`、`pro.cashflow(...)` |
| 财务指标/分红送股 | `pro.fina_indicator(...)`、`pro.dividend(...)` |
| 指数基础/日线/成分权重 | `pro.index_basic(...)`、`pro.index_daily(...)`、`pro.index_weight(...)` |
| 基金基础/净值/ETF 日线 | `pro.fund_basic(...)`、`pro.fund_nav(...)`、`pro.fund_daily(...)` |

## 本地未覆盖时

1. 先检查用户要的是新市场、新接口，还是已覆盖 API 的字段变体。
2. 已覆盖 API 缺少单个返回字段时，先做最小查询并输出有限的实际列，不直接联网。
3. 确认本地确实没有契约后，说明缺口并只查 `compatibility.md` 中对应 provider 的官方来源。
4. 新查到的语法只用于当前任务，必须标注官方来源、检索日期和运行时验证结果；不得把未验证入口描述为稳定支持。
