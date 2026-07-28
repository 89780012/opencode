---
title: Smart 
---


# <a id="smart">`smart` 全局API入口对象</a>

> sdk中的顶级接口，控制整个组件的交互与运行

全局静态对象，含组件开发所需的API、事件、数据、工具等，smart为可以直接访问对象

**事件回调**

* [on_init](#on-init) - Python策略运行环境初始完成后回调，为了保证程序正常，组件所有代码均在此之后执行
* [on_close](#on-close) - Python组件页面被关闭时回调，彻底释放掉组件所有资源

**方法**
* [insert_order](#下单-insert-order) 全局方法下单 <Badge type="warning" text="标准版不支持两融" />
* [cancel_order](#撤单-cancel-order) 全局方法撤单
* [subscribe](#订阅行情-subscribe) 全局方法订阅行情
* [unsubscribe](#取消订阅行情-unsubscribe) 全局方法取消订阅
* [add_timer](#添加单次定时-add-timer) 添加单次定时
* [clear_timer](#清除单次定时-clear-timer) 清除单次定时
* [add_time_interval](#添加轮询定时-add-time-interval) 添加轮询定时
* [clear_time_interval](#清除轮询定时-clear-time-interval) 清除轮询定时
* [getInstrument](#查找一个证券-getinstrument) 查找一个证券
* [getSystemSet](#获取smart系统【设置】中参数-getsystemset) 获取smart系统【设置】中参数
* [notice](#消息提醒-notice) 组件消息推送到全局，如告警
* [subscribe_bar](#订阅bar行情-subscribe-bar) 全局方法订阅bar行情
* [unsubscribe_bar](#取消订阅bar行情-unsubscribe-bar) 全局方法取消订阅bar行情
* [query_bar_today_async](#异步-获取当天任意分钟的bar行情-query-bar-today-async) 全局方法异步-获取当天任意分钟的bar行情
* [query_bar_today](#同步-获取当天任意分钟的bar行情-query-bar-today) 全局方法同步-获取当天任意分钟的bar行情
* [query_bar_async](#异步-获取历史bar数据-query-bar-async) 全局方法异步-查询历史bar数据
* [query_bar](#同步-获取历史bar数据-query-bar) 全局方法同步-查询历史bar数据
* [query_tick](#同步-查询历史tick数据-query-tick) 全局同步方法-查询历史tick数据
* [query_tick_async](#异步-查询历史tick数据-query-tick-async) 全局异步方法-查询历史tick数据
* [query_market_data_async](#异步-获取市场数据-query-market-data-async) 全局方法异步查询市场数据(ticker行情)
* [query_market_data](#同步-获取市场数据-query-market-data) 全局方法同步查询市场数据(ticker行情)
* [query_data_async](#异步查询数据接口-query-data-async) 全局方法异步查询数据
* [query_data](#同步查询数据接口-query-data) 全局方法同步查询数据
* [query_data_page_async](#异步分页查询数据接口-query-data-page-async) 全局方法异步分页查询数据
* [query_data_page](#同步分页查询数据接口-query-data-page) 全局方法同步分页查询数据
* [add_self_select_stock](#添加自选股-add-self-select-stock) 全局方法添加自选股
* [del_self_select_stock](#删除自选股-del-self-select-stock) 全局方法删除自选股
* [close](#关闭当前组件-close) 关闭当前组件

**属性**

* [current_account](#当前登录的资金账号-current-account) 当前客户端登录的主资金账号
* [account_map](#已登录的资金账号集合-account-map) 当前客户端登录的所有账户集合对象，key为资金账号，value为账号[Account](#资金账户-account)对象
* [instrument_list](#证券列表-instrument-list) 所有证券列表
* [instrument_map](#证券索引集合-instrument-map) key为证券代码_市场，方便查找证券
* [instrument_map_by_type](#证券类型集合-instrument-map-by-type) 按证券类型进行区分的证券map列表

**静态对象**

* [Event](#事件-event) - 所有事件的定义
* [Type](#数据类型-type) - 所有数据类型的定义
* [utils](#工具集合-utils) 工具集合
* [cache](#缓存-cache) 数据存储
<!-- * [logger](#logger) 日志工具 -->
---

## API全景图
<pre>
<code>
<a href="#smart">smart</a> //smart框架对象，组件开发所需的api、事件、数据、工具等的全局入口对象
  |—— <a href="#on-init">on_init(callback)</a> //Python策略运行环境初始完成后回调，为了保证程序正常，组件所有代码均在此之后执行（如订阅行情）
  |—— <a href="#on-close">on_close(callback)</a> //Python组件页面被关闭时回调，彻底释放掉组件所有资源
  |—— <a href='#下单-insert-order'>insert_order</a> //全局方法下单 <Badge type="warning" text="标准版不支持两融" />
  |—— <a href='#撤单-cancel-order'>cancel_order</a> //全局方法撤单
  |—— <a href='#订阅行情-subscribe'>subscribe</a> //全局方法订阅
  |—— <a href='#取消订阅行情-unsubscribe'>unsubscribe</a> //全局方法取消订阅
  |—— <a href='#添加单次定时-add-timer'>add_timer</a> 添加单次定时
  |—— <a href='#清除单次定时-clear-timer'>clear_timer</a> 清除单次定时
  |—— <a href='#添加轮询定时-add-time-interval'>add_time_interval</a> 添加轮询定时
  |—— <a href='#清除轮询定时-clear-time-interval'>clear_time_interval</a> 清除轮询定时
  |—— <a href='#查找一个证券-getinstrument'>getInstrument</a> //查找一个证券
  |—— <a href='#获取可交易的etf列表-getetflist'>getETFList</a> //获取可交易的ETF列表
  |—— <a href='#获取etf成分股列表-getetfbasket'>getETFBasket</a> //获取ETF的成分股列表
  |—— <a href='#获取smart系统【设置】中参数-getsystemset'>getSystemSet</a> //获取smart系统【设置】中参数
  |—— <a href='#消息提醒-notice'>notice</a> //推送全局消息，通知消息提醒
  |—— <a href='#订阅bar行情-subscribe-bar'>subscribe_bar</a> //全局方法订阅bar行情
  |—— <a href='#取消订阅bar行情-unsubscribe-bar'>unsubscribe_bar</a> //全局方法取消订阅bar行情
  |—— <a href='#异步-获取当天任意分钟的bar行情-query-bar-today-async'>query_bar_today_async</a> //全局方法异步-获取当天任意分钟的bar行情
  |—— <a href='#同步-获取当天任意分钟的bar行情-query-bar-today'>query_bar_today</a> //全局方法同步-获取当天任意分钟的bar行情
  |—— <a href='#异步-获取历史bar数据-query-bar-async'>query_bar_async</a> //全局方法异步-获取历史bar数据
  |—— <a href='#同步-获取历史bar数据-query-bar'>query_bar</a> //全局方法同步-获取历史bar数据
  |—— <a href='#同步-查询历史tick数据-query-tick'>query_tick</a> //全局同步方法-查询历史tick数据
  |—— <a href='#异步-查询历史tick数据-query-tick-async'>query_tick_async</a> //全局异步方法-查询历史tick数据
  |—— <a href='#异步-获取市场数据-query-market-data-async'>query_market_data_async</a> //全局方法异步查询市场数据(ticker行情)
  |—— <a href='#同步-获取市场数据-query-market-data'>query_market_data</a> //全局方法同步查询市场数据(ticker行情)
  |—— <a href='#异步-获取当前交易日及下一交易日-get-trading-day-async'>get_trading_day_async</a> //全局方法异步获取当前交易日及下一交易日
  |—— <a href='#同步-获取当前交易日及下一交易日-get-trading-day'>get_trading_day</a> //全局方法同步获取当前交易日及下一交易日
  |—— <a href='#异步查询数据接口-query-data-async'>query_data_async</a> //全局方法异步查询数据
  |—— <a href='#同步查询数据接口-query-data'>query_data</a> //全局方法同步查询数据
  |—— <a href='#异步分页查询数据接口-query-data-page-async'>query_data_page_async</a> //全局方法异步分页查询数据
  |—— <a href='#同步分页查询数据接口-query-data-page'>query_data_page</a> //
  |—— <a href='#添加自选股-add-self-select-stock'>add_self_select_stock </a> //全局方法添加自选股 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#删除自选股-del-self-select-stock'>del_self_select_stock </a> //全局方法删除自选股 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#关闭组件-close'>close </a> //全局方法关闭组件 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#资金账户-account'>current_account</a> //当前客户端登录的主资金账号
  |—— <a href="#证券列表-instrument-list">instrument_list</a> //所有证券列表（全局静态数据）
  |      |—— <a href="#证券信息-instrument">Instrument</a> 证券对象
  |       		|—— 各种instrument属性
  |—— <a href="#证券索引集合-instrument-map">instrument_map</a> //key为证券代码_市场，方便查找证券
  |—— <a href="#证券类型集合-instrument-map-by-type">instrument_map_by_type</a> //按证券类型进行区分的证券map列表
  |—— <a href="#可交易etf集合-etf-map">etf_map</a> //可交易etf集合（全局静态数据）
  |      |—— ETF ETF对象
  |       		|—— 各种etf属性
  |      |—— <a href="#证券信息-instrument">Instrument</a> 证券对象
  |       		|—— 各种instrument属性
  |—— <a href='#已登录的资金账号集合-account-map'>account_map</a> 当前客户端登录的所有账户集合对象，key为资金账号，value为账号对象
  |      |—— '1090000000001':<a href="#资金账户-account">account</a> 账号对象
  |     		    |—— account_id //资金账号
  |     		    |—— nick_name //资金账号的昵称
  |     		    |—— account_type //账户类型 AccountType
  |     		    |—— source //账户的柜台类型
  |     		    |—— <a href='#账号资产信息-assets'>assets</a>  //实时账户资产Assets对象
  |     		    |		|—— 各种assets属性
  |     		    |—— <a href='#account-position-list'>position_list</a> //实时账号持仓
  |     		    |			|—— <a href='#持仓-position'>position</a> //持仓Position对象
  |     		    |					|—— 各种positin属性
  |     		    |—— <a href='#account-order-list'>order_list</a> //实时账户委托列表
  |     		    |			|—— <a href='#委托回报-order'>order</a> //委托确认Order对象
  |     		    |					|—— 各种order属性
  |     		    |—— <a href='#account-trade-list'>trade_list</a> //实时账户成交列表
  |     		    |			|—— <a href='#成交回报-trade'>trade</a> //成交回报Trade对象
  |     		    |					|—— 各种trade属性
  |     		    |—— <a href='#account-insert-order'>insert_order</a> //账户级别下单 <Badge type="warning" text="标准版不支持两融" />
  |     		    |—— <a href='#account-cancel-order'>cancel_order</a> //撤单
  |     		    |—— <a href='#account-subscribe'>subscribe</a>  //订阅行情
  |     		    |—— <a href='#account-unsubscribe'>unsubscribe</a> //取消订阅
  |     		    |—— <a href='#account-on-quote'>on_quote</a>(<a href='#行情信息-quote'>quote</a>=>{})  //行情变化推送
  |     		    			   |—— 各种Quote对象属性
  |     		    |—— <a href='#account-on-order'>on_order</a>(<a href='#委托回报-order'>order</a>=>{})  //委托变化推送
  |     		    |—— <a href='#account-on-cancel-fail'>on_cancel_fail</a>(fail=>{}) //撤单失败的消息推送 
  |     		    |—— <a href='#account-on-trade'>on_trade</a>(<a href='#成交回报-trade'>trade</a>=>{})  //成交推送 
  |     		    |—— <a href='#account-on-position'>on_position</a>(<a href='#持仓-position'>position</a>=>{})  //账户持仓变化的增量推送
  |     		    |—— <a href='#account-on-assets'>on_asstes</a>(<a href='#账号资产信息-assets'>assets</a>=>{})  //账户资金的推送
  |—— <a href='#事件-event'>Event</a> 所有事件的枚举
  |      |—— ON_INIT //组件初始化
  |      |—— ON_CLOSE //组件被关闭
  |      |—— ON_QUOTE //订阅行情后，行情变化推送
  |      |—— ON_ORDER //委托变化推送
  |      |—— ON_TRADE //成交变化推送
  |      |—— ON_CANCEL_FAIL //撤单失败的消息推送
  |      |—— ON_POSITION //账户持仓变化的增量推送
  |      |—— ON_ASSETS  //账户资金的全量推送
  |      |—— ON_BAR //订阅bar行情后，bar行情变化推送
  |—— <a href='#数据类型-type'>Type</a> 所有数据类型的定义
  |      |—— <a href="#柜台类型-source">Source</a> 柜台类型源
  |      |—— <a href="#交易所-exchange">Exchange</a> 交易所
  |      |—— <a href="#证券类型-instrumenttype">InstrumentType</a> 证券类型
  |      |—— <a href="#价格条件-pricetype">PriceType</a> 价格条件
  |      |—— <a href="#买卖方向-side">Side</a> 买卖方向
  |      |—— <a href="#委托业务类型-businesstype">BusinessType</a> 委托业务类型
  |      |—— <a href="#开平标志-offset">Offset</a> 开平标志
  |      |—— <a href="#持仓方向-direction">Direction</a> 持仓方向
  |      |—— <a href="#委托状态-orderstatus">OrderStatus</a> 委托状态
  |      |—— <a href="#成交量条件-volumecondition">VolumeCondition</a> 成交量条件
  |      |—— <a href="#成交时间条件-timecondition">TimeCondition</a> 成交时间条件
  |      |—— <a href="#账号类型-accounttype">AccountType</a> 账号类型, 现货|信用|期货|衍生品
  |      |—— <a href="#etf配方表-etf">ETF</a> 某ETF配方表明细对象定义
  |      |—— <a href="#持仓-position">Position</a> 持仓对象定义
  |      |—— <a href="#委托回报-order">Order</a> 委托确认对象定义
  |      |—— <a href="#成交回报-trade">Trade</a> 成交回报对象定义
  |      |—— <a href="#行情信息-quote">Quote</a>  行情信息对象定义
  |      |—— <a href="#证券信息-instrument">Instrument</a> 证券对象定义
  |      |—— <a href="#行情bar信息-bar">Bar</a> 行情bar信息对象定义
  |      |—— <a href="#分页信息-datapageinfo">DataPageInfo</a> 分页信息对象定义
  |      |—— <a href="#查询结构类型-outformat">OutFormat</a> 查询结构类型定义
  |—— <a href='#工具集合-utils'>utils</a>
  |     |—— <a href='#是否科创板股票-isstistock'>isSTIStock</a> //是否科创板股票
  |     |—— <a href='#是否etf基金-isetf'>isETF</a>  //是否ETF基金
  |     |—— <a href='#是否配股代码-isspo'>isSPO</a>  //是否配股代码
  |     |—— <a href='#是否是国债逆回购-isreverserepo'>isReverseRepo</a> //判断一个证券是否是国债逆回购
  |     |—— <a href='#全角转半角-tocdb'>toCDB</a> //将全角字符转换为半角字符
  |     |—— <a href='#对象转字符串-tostring'>toString</a> //将对象转换为json字符串
  |     |—— <a href='#客户端当前日期-getnowformatdate'>getNowFormatDate</a> //得到当前日期的格式化形式
  |     |—— <a href='#盘口最优价格-getbestprice'>getBestPrice</a> //获取买盘或者卖盘的盘口最优价格，往最新价格靠近，取有效价格
  |     |—— <a href='#获取有效申报价格范围-get-limit-price'>get_limit_price</a> //获取买盘的最高有效申报价或者卖盘的最低有效申报价
  |—— <a href='#缓存-cache'>cache</a> 数据存储，可用于记录在客户端的配置信息、程序运行状态的实时记录及崩溃恢复
  |     |—— <a href='#赋值-set'>set</a> //赋值
  |     |—— <a href='#删除-delete'>delete</a> //删除
  |     |—— <a href='#数组添加-push'>push</a> //数组添加
  

</code>
</pre>

---

## smart对象的事件回调

### `on_init`

> Python策略运行环境初始完成后回调，为了保证程序正常，组件所有代码均在此之后执行（如订阅行情）

```python
def init():
    logger.debug("init")
smart.on_init(init)
# 或者 emitter 写法
smart.on(smart.Event.ON_INIT, init)
```

### `on_close`

> Python组件页面被关闭时回调，彻底释放掉组件所有资源，如订阅

```python
def close():
    logger.debug("close")
smart.on_close(close)
# 或者 emitter 写法
smart.on(smart.Event.ON_CLOSE, close)
```


## smart对象下的全局方法

### `下单-insert_order` <Badge type="warning" text="标准版不支持两融" />

> 通过SDK接口向柜台委托订单。
> 注意：通过该接口委托的订单，不被归属于任何策略。

* `account_id` String(选填) - 交易账号（资金账号），默认为当前账号id
* `strategy_platform_type` String(选填) - 策略平台类型，参考[StrategyPlatformType](#策略平台类型-strategyplatformtype)枚举值，默认为FrontPy
* `strategy_id` String(选填) - 策略id，默认为None
<!-- 如果传该参数，则下单会影响该策略的资金和持仓，即使策略不启动，只要策略存在，也能下单，是逻辑上的影响策略 -->
* `instrument_id` String(必填) - 合约ID，证券代码，如 "600000"(该参数与code参数必填其一)
* `exchange_id` Number(必填) - 交易所ID 参考[Exchange](#交易所-exchange)枚举值 如： Exchange.SSE(该参数与code参数必填其一)
* `limit_price` Number(必填) - 价格 如： 10.32(市价下单时：深市选填，默认为0；沪市必填，为保护限价)
* `volume` Number(必填) - 数量 如： 100
* `price_type` Number(选填) - 报单类型，参考 [PriceType](#价格条件-pricetype)枚举值，默认为Limit
* `side` Number(选填) - 买卖方向，参考 [Side](#买卖方向-side) 枚举值，默认为Buy
* `offset` Number(选填) - 开平方向，参考 [Offset](#开平标志-offset)枚举值，默认为Init
* `order_client_id` Number(选填) - 客户自定义id，请使用uint数字，默认为0 在测试环境可以指定撮合模式撮合，order_client_id 数值的优先级高于官网设置:1-未成交、2-全成(单笔成交回报) 、3-部成、4-废单、5-全成(多笔成交回报)、 6-按当前快照盘口行情撮合。
* `parent_order_id` String(选填) - 母单编号，默认为"" startStrategy会得到一个母单编号，不传默认使用这个母单编号，如果客户需要自定义的母单编号可以传入，请使用数字形式
* `business_type` Number (选填) - 业务类型，参考 [BusinessType](#委托业务类型-businesstype) 枚举值，默认为CASH
* `callback` Function (选填) - 下单成功后的回调，返回一个订单委托对象(order,[err](#接口响应错误对象-rsperror))
* `autoSplit` Boolean (选填) - 自动拆单，默认为False
* `code` String (必填) - 证券代码.交易所标识，如"600000.SH","000001.SZ"(若该参数与instrument_id、exchange_id同时存在,以该参数为准)

```python
# 方式一：
def insert_callback(order,err):
    logger.debug("get insert_order: %s",smart.utils.toString(order))
    if(not order):logger.debug("insert_order FAIL: %s",err)
smart.insert_order(
    instrument_id="300001",
    exchange_id=smart.Type.Exchange.SZE,
    limit_price=18.05,
    volume=200,
    side=smart.Type.Side.Buy,
    callback=insert_callback
)
```
```python
# 方式二：
def insert_callback(order,err):
    logger.debug("get insert_order: %s",smart.utils.toString(order))
    if(not order):logger.debug("insert_order FAIL: %s",err)
smart.insert_order(account_id, strategy_platform_type, strategy_id, instrument_id, exchange_id, limit_price, volume, price_type, side, offset, order_client_id,
parent_order_id, business_type, insert_callback, autoSplit)
```
```python
# 方式三：
def insert_callback(order,err):
    logger.debug("get insert_order: %s",smart.utils.toString(order))
    if(not order):logger.debug("insert_order FAIL: %s",err)
smart.insert_order(
    code="300001.SZ",
    limit_price=18.05,
    volume=200,
    side=smart.Type.Side.Buy,
    callback=insert_callback
)
```

#### 下单示例
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def insert_callback(order,err):
        if(err):
            logger.debug("get error from insert_order:%s",err)
            # 输出：RspError({'code': '9003', 'message': KeyError('')})
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(order))
            # 输出：{"rcv_time": null, "order_id": "37906458003637227", "source_order_id": "37906458003637227", "insert_time": null, "update_time": null, "trading_day": null, "instrument_id": "300001", "exchange_id": "SZE", "account_id": "253191000961", "client_id": "d21562c1-3b0b-11ee-b730-3319f43f98a4", "instrument_type": 1, "limit_price": 19.18, "frozen_price": 19.18, "volume": 200, "volume_traded": 0, "volume_left": 200, "tax": null, "commission": null, "status": 1, "error_id": null, "error_msg": null, "side": 1, "offset": 100, "price_type": 1, "volume_condition": 0, "time_condition": 2, "parent_order_id": null, "code": "300001.SZ", "traffic": "frontpy", "traffic_sub_id": "PythonDemo-_dev_", "cancel_time": null, "order_cancel_client_id": null, "order_cancel_xtp_id": null, "instrument_name": "特锐德", "trade_amount": 0, "xtp_business_type": "XTP_BUSINESS_TYPE_CASH", "xtp_market_type": "XTP_MKT_SZ_A", "xtp_price_type": "XTP_PRICE_LIMIT", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_BUY", "xtp_order_status": "XTP_ORDER_STATUS_INIT", "exchange_id_name": "深交所", "instrument_type_name": "股票", "status_name": "初始化", "side_name": "买", "offset_name": "初始值", "price_type_name": "限价", "xtp_business_type_name": "普通股票", "xtp_market_name": "深A", "xtp_price_type_name": "限价", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "买", "xtp_order_status_name": "初始化", "volume_condition_name": "任何数量", "time_condition_name": "本节有效", "traffic_name": "Python策略", "business_type": "frontpy"}
    smart.insert_order(
        instrument_id='300001', 
        exchange_id=smart.Type.Exchange.SZE, 
        price_type=smart.Type.PriceType.Limit, 
        limit_price=19.18, 
        volume=200,
        side=smart.Type.Side.Buy,
        offset=smart.Type.Offset.Init,
        business_type=smart.Type.BusinessType.CASH,
        callback=insert_callback)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")
smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `撤单-cancel_order`

> 通过SDK接口向柜台撤销已委托的订单。
* `account_id` String(选填) - 交易账号（资金账号），默认为当前账号id
* `order_id` String(必填) - 订单ID
* `callback` Function (选填) - 撤单成功后的回调(data,[err](#接口响应错误对象-rsperror))
```python
def cancel_callback(data,err):
    if(err):
        logger.debug("get error from cancel_insert:%s",err)
    else:
        logger.debug("get cancel_insert:%s",smart.utils.toString(data))
smart.cancel_order(account_id, order_id, callback)
```
#### 撤单示例
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def insert_callback(order,err):
        if(err):
            logger.debug("get error from insert_order:%s",err)
            # 输出：RspError({'code': '9003', 'message': KeyError('')})
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(order))
            
            def cancel_callback(data,err):
                if(err):
                    logger.debug("get error from cancel_insert:%s",err)
                    # 输出：RspError({'code': '9003', 'message': KeyError('')})
                else:
                    logger.debug("get cancel_insert:%s",data)
                    # 输出：{'orderXtpId': '37906458003637226', 'userName': '253191000961', 'reqID': '00000000007', 'requestID': 'cancelOrder_18'}
        
            smart.cancel_order(account_id=None, order_id=order.order_id, cb=cancel_callback)

    smart.insert_order(
        instrument_id='300001', 
        exchange_id=smart.Type.Exchange.SZE, 
        price_type=smart.Type.PriceType.Limit, 
        limit_price=19.18, 
        volume=200,
        side=smart.Type.Side.Buy,
        offset=smart.Type.Offset.Init,
        business_type=smart.Type.BusinessType.CASH,
        callback=insert_callback)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")
smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `订阅行情-subscribe`

> 订阅行情。行情变化时`smart`会派发`ON_QUOTE`事件，通过smart.on(smart.Event.ON_QUOTE, on_quote_callback)监听行情变化。订阅数量限制规则如下：
> * 总资产<=300万   可订阅证券数量<=300
> * 300万<总资产<=1000万    可订阅证券数量<=1500
> * 1000万<总资产<=1亿    可订阅证券数量<=3000
> * 1亿<总资产<=10亿资产    可订阅证券数量<=6000
> * 10亿<总资产    可订阅证券数量不限制

* `account_id` 选填 账号id，默认为当前账号id  这里区别alphax后台的subscribe函数是后台第一个参数是source
* `instruments` 必填 订阅的股票列表 数组 如['600000']\(该参数与codes参数必填其一\)
* `exchange_id` 必填 交易所id 如Exchange.SSE(该参数与codes参数必填其一)
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `emitter` 选填 注册行情派发事件对象,默认为全局smart对象
* `callback` 选填 订阅后的数据或错误返回信息参数(quoteList,[err](#接口响应错误对象-rsperror)),quoteList只是订阅成功的结果，后续行情变化将随行情事件推送，详见示例
* `codes` 必填 订阅股票的证券代码.交易所标识列表 数组 如['600000.SH','300001.SZ']\(若该参数与instruments、exchange_id同时存在,以该参数为准\)

```python
# 方式一：
smart.subscribe(codes=['600000.SH','300001.SZ'])
def on_quote_callback(quote):
    logger.debug(f"{smart.utils.toString(quote)}")
smart.on(smart.Event.ON_QUOTE, on_quote_callback)
```
```python
# 方式二(不推荐)：
smart.subscribe(account_id, instruments, exchange_id, is_level2, emitter, callback)
def on_quote_callback(quote):
    logger.debug(f"{smart.utils.toString(quote)}")
smart.on(smart.Event.ON_QUOTE, on_quote_callback)
```

#### 行情订阅示例
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #订阅
    def subscribe_callback(quoteList, err):
        if err:
            logger.debug("get error from subscribe:%s",err)
        else:
            for i in range(len(quoteList)):
                logger.debug("subscribe quote:%s", smart.utils.toString(quoteList[i]))
                # 输出：{"source_id": "xtp", "trading_day": "20230815", "rcv_time": "20230815101951000", "data_time": "20230815101951000", "instrument_id": "300252", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 8.6, "pre_settlement_price": null, "last_price": 8.52, "volume": 3263000, "turnover": 27966700, "pre_open_interest": null, "open_interest": null, "open_price": 8.57, "high_price": 8.63, "low_price": 8.5, "upper_limit_price": 10.32, "lower_limit_price": 6.88, "close_price": 8.52, "settlement_price": null, "bid_price": [8.51, 8.5, 8.49, 8.48, 8.47, 0, 0, 0, 0, 0], "ask_price": [8.52, 8.53, 8.54, 8.55, 8.56, 0, 0, 0, 0, 0], "bid_volume": [51200, 98600, 60100, 52800, 20400, 0, 0, 0, 0, 0], "ask_volume": [10400, 3300, 1700, 3900, 5600, 0, 0, 0, 0, 0], "code": "300252.SZ", "avg_price": 8.570855041372969, "iopv": 0, "instrument_status": "T1 Ä=\b"}
    smart.current_account.subscribe(instruments=['300252','300254'], exchange_id=smart.Type.Exchange.SZE, callback=subscribe_callback)

    #接收行情
    def on_quote_callback(quote):
        logger.debug("get on_quote: %s",smart.utils.toString(quote))
        # 输出：{"source_id": "xtp", "trading_day": "20230815", "rcv_time": "20230815101951000", "data_time": "20230815101951000", "instrument_id": "300252", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 8.6, "pre_settlement_price": null, "last_price": 8.52, "volume": 3263000, "turnover": 27966700, "pre_open_interest": null, "open_interest": null, "open_price": 8.57, "high_price": 8.63, "low_price": 8.5, "upper_limit_price": 10.32, "lower_limit_price": 6.88, "close_price": 8.52, "settlement_price": null, "bid_price": [8.51, 8.5, 8.49, 8.48, 8.47, 0, 0, 0, 0, 0], "ask_price": [8.52, 8.53, 8.54, 8.55, 8.56, 0, 0, 0, 0, 0], "bid_volume": [51200, 98600, 60100, 52800, 20400, 0, 0, 0, 0, 0], "ask_volume": [10400, 3300, 1700, 3900, 5600, 0, 0, 0, 0, 0], "code": "300252.SZ", "avg_price": 8.570855041372969, "iopv": 0, "instrument_status": "T1 Ä=\b"}
        #取消订阅
        smart.current_account.unsubscribe([quote.instrument_id], quote.exchange_id)
    smart.current_account.on_quote(on_quote_callback)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```


### `取消订阅行情-unsubscribe`

> 取消订阅行情
* `account_id` 选填 账号id，默认为当前账号id  这里区别alphax后台的subscribe函数是后台第一个参数是source
* `instruments` 必填 订阅的股票列表 数组 如['600000']\(该参数与codes参数必填其一\)
* `exchange_id` 必填 交易所id 如Exchange.SSE(该参数与codes参数必填其一)
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `emitter` 选填 注册行情派发事件对象,默认为全局smart对象
* `codes` 必填 订阅股票的证券代码.交易所标识列表 数组 如['600000.SH','300001.SZ']\(若该参数与instruments、exchange_id同时存在,以该参数为准\)
```python
# 方式一：
smart.unsubscribe(codes=['600000.SH','300001.SZ'])
```
```python
# 方式二(不推荐)：
smart.unsubscribe(account_id, instruments, exchange_id, is_level2, emitter)
```

#### 取消订阅行情示例
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #订阅
    def subscribe_callback(quoteList, err):
        if err:
            logger.debug("get error from subscribe:%s",err)
        else:
            for i in range(len(quoteList)):
                logger.debug("subscribe quote:%s", smart.utils.toString(quoteList[i]))
                # 输出：{"source_id": "xtp", "trading_day": "20230815", "rcv_time": "20230815101951000", "data_time": "20230815101951000", "instrument_id": "300252", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 8.6, "pre_settlement_price": null, "last_price": 8.52, "volume": 3263000, "turnover": 27966700, "pre_open_interest": null, "open_interest": null, "open_price": 8.57, "high_price": 8.63, "low_price": 8.5, "upper_limit_price": 10.32, "lower_limit_price": 6.88, "close_price": 8.52, "settlement_price": null, "bid_price": [8.51, 8.5, 8.49, 8.48, 8.47, 0, 0, 0, 0, 0], "ask_price": [8.52, 8.53, 8.54, 8.55, 8.56, 0, 0, 0, 0, 0], "bid_volume": [51200, 98600, 60100, 52800, 20400, 0, 0, 0, 0, 0], "ask_volume": [10400, 3300, 1700, 3900, 5600, 0, 0, 0, 0, 0], "code": "300252.SZ", "avg_price": 8.570855041372969, "iopv": 0, "instrument_status": "T1 Ä=\b"}
    smart.current_account.subscribe(instruments=['300252','300254'], exchange_id=smart.Type.Exchange.SZE, callback=subscribe_callback)

    #接收行情
    def on_quote_callback(quote):
        logger.debug("get on_quote: %s",smart.utils.toString(quote))
        # 输出：{"source_id": "xtp", "trading_day": "20230815", "rcv_time": "20230815101951000", "data_time": "20230815101951000", "instrument_id": "300252", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 8.6, "pre_settlement_price": null, "last_price": 8.52, "volume": 3263000, "turnover": 27966700, "pre_open_interest": null, "open_interest": null, "open_price": 8.57, "high_price": 8.63, "low_price": 8.5, "upper_limit_price": 10.32, "lower_limit_price": 6.88, "close_price": 8.52, "settlement_price": null, "bid_price": [8.51, 8.5, 8.49, 8.48, 8.47, 0, 0, 0, 0, 0], "ask_price": [8.52, 8.53, 8.54, 8.55, 8.56, 0, 0, 0, 0, 0], "bid_volume": [51200, 98600, 60100, 52800, 20400, 0, 0, 0, 0, 0], "ask_volume": [10400, 3300, 1700, 3900, 5600, 0, 0, 0, 0, 0], "code": "300252.SZ", "avg_price": 8.570855041372969, "iopv": 0, "instrument_status": "T1 Ä=\b"}
        #取消订阅
        smart.current_account.unsubscribe([quote.instrument_id], quote.exchange_id)
    smart.current_account.on_quote(on_quote_callback)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```


### `添加单次定时-add_timer`
>添加单次定时
* `msec` int(必填)  -  定时毫秒数
* `callback` Function(必填) - 定时触发的回调函数（无参数）

```python
def timeCallback():
    print("定时器到时间触发了")
#设定1000ms（1秒）的定时

smart.add_timer(1000,timeCallback)
```

### `清除单次定时-clear_timer`
>清除单次定时
* `sid` str(必填)  -  定时返回的ID

```python
def timeCallback():
    print("定时器到时间触发了")
#设定1000ms（1秒）的定时

sid = smart.add_timer(1000,timeCallback)

smart.clear_timer(sid) # 此处取消指定的定时
```

### `添加轮询定时-add_time_interval`
>添加轮询定时
* `msec` int(必填)  -  定时毫秒数
* `callback` Function(必填) - 定时触发的回调函数（无参数）

```python
def timeCallback():
    print("定时器到时间触发了")
#设定1000ms（1秒）的定时

smart.add_time_interval(1000,timeCallback)
```

### `清除轮询定时-clear_time_interval`
>清除轮询定时
* `sid` str(必填)  -  定时返回的ID

```python
def timeCallback():
    print("定时器到时间触发了")
    smart.clear_time_interval(sid) # 此处取消指定的定时，后续不再触发，只触发一次

#设定1000ms（1秒）的定时
sid = smart.add_time_interval(1000,timeCallback)
```


### `查询自选股列表-querySelfSelectStockList`

>查询自选股列表。添加自选股在客户端【行情】-【自选股】页面
* `groupName` String(必填) - 板块名称 
* `source` String(必填) - 柜台id，可填 None，等价于"xtp"，目前只支持 "xtp"
* `account_id` String(必填) - 账号id，等价于当前登录账号id，目前只支持当前登录账号
* `querySelfSelectStockListCB` Function(必填) - 查询自选股的信息，返回自选股信息(instrumentList,[err](#接口响应错误对象-rsperror))
```python
def querySelfSelectStockListCB(instrumentList,err):
    if(instrumentList):logger.debug("get querySelfSelectStockList:%s",instrumentList)
    if(not instrumentList):logger.debug("get querySelfSelectStockList FAIL:%s",err)
smart.querySelfSelectStockList(groupName, source, account_id, querySelfSelectStockListCB)
```

#### 查询自选股列表示例：
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def querySelfSelectStockListCB(instrumentList,err):
        if(instrumentList):logger.debug("get querySelfSelectStockList:%s",instrumentList)
        # 输出：['002708.SZ', '002209.SZ', '300922.SZ', '003022.SZ', '000301.SZ', '002881.SZ', '002599.SZ', '002532.SZ', '002665.SZ', '000547.SZ']
        if(not instrumentList):logger.debug("get querySelfSelectStockList FAIL:%s",err)
    smart.querySelfSelectStockList(groupName="selfSelect", source="xtp", account_id=smart.current_account.account_id, cb=querySelfSelectStockListCB)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `查找一个证券-getInstrument`

> 查找一个证券
* `instrumentId` String(必填) - 证券代码 如'600000'(该参数与code参数必填其一)
* `exchangeId` String(必填) - 交易所 如'SSE'(该参数与code参数必填其一)
* `code` String(必填) - 证券代码.交易所标识 如 '600000.SH'(若该参数与instrumentId、exchangeId同时存在,以该参数为准)
```python
# 方式一：
smart.getInstrument(instrumentId, exchangeId)
```
```python
# 方式二：
smart.getInstrument(code='600000.SH')
```

#### 查找证券信息示例
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    #根据证券代码和交易所查找一个instrument
    getInstrument = smart.getInstrument("600000",smart.Type.Exchange.SSE)
    logger.debug("get getInstrument:%s",smart.utils.toString(getInstrument))
    # 输出：{"instrument_id": "600000", "instrument_name": "浦发银行", "instrument_type": "Stock", "instrument_type_ext": "XTP_SECURITY_MAIN_BOARD", "exchange_id": "SSE", "exchange_id_name": "上交所", "xtp_market_type": "XTP_MKT_SH_A", "name_py": "pfyh", "price_tick": 0.01, "precision": 2, "buy_volume_unit": 100, "sell_volume_unit": 1, "bid_volume_unit": 100, "ask_volume_unit": 1, "bid_upper_limit_volume": 1000000, "bid_lower_limit_volume": 100, "ask_upper_limit_volume": 1000000, "ask_lower_limit_volume": 1, "market_bid_volume_unit": 100, "market_ask_volume_unit": 1, "market_bid_upper_limit_volume": 1000000, "market_bid_lower_limit_volume": 100, "market_ask_upper_limit_volume": 1000000, "market_ask_lower_limit_volume": 1, "pre_close_price": 7.1, "upper_limit_price": 7.8100000000000005, "lower_limit_price": 6.390000000000001, "is_registration": false, "kw": "浦发银行", "code": "600000.SH"}
def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")
smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```



### `消息提醒-notice`


> 组件消息推送到全局
* `level` 消息状态：open、info、success、warning、error
* `title` 头部标题
* `msg` 需要推送的消息内容
* `duration` 消息显示时间
* `timestamp` 时间戳
```python
params = {
'level': 'success',
'title': '标题',
'msg': 'noticeTest',
'duration': 4500,
'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
}
smart.notice(params)
```

#### 消息通知弹窗示例
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #全局消息弹窗
    params1 = {
    'level': 'success',#open、info、success、warning、error
    'title': '标题',
    'msg': 'noticeTest',
    'duration': 4500,
    'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    smart.notice(params1)

def show():
    print("show")
def hide():
    print("hide")
def close():
    print("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `订阅bar行情-subscribe_bar`

> 订阅bar行情。监听bar行情变化有三种方式:1、订阅时传on_bar_callback,例如smart.subscribe_bar(codes, period, on_bar_callback)；2、smart.on(smart.Event.ON_BAR,bar_callback)；3、smart.on_bar(bar_callback),且优先级1>2>3
> * 订阅分钟数>=1的整数，且<=60，单位是分钟
> * 只允许股票类型的订阅
* `codes`  必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
* `on_bar_callback` 选填 接收行情推送的回调函数
* `emitter` 选填 注册行情派发事件对象, 默认为全局smart对象
* 返回值 字符串数组，表示订阅失败的股票列表，例如['600000.SH']
```python
smart.subscribe_bar(codes, period, on_bar_callback, emitter)
```

#### 订阅bar行情及接收行情推送示例

```python
from smart import *
import logging
from smart.utils import *
logger = logging.getLogger()

def methodOne():
    codes = ['000001.SZ','600000.SH']
    period = "1m"
    #方式一：订阅
    failList = smart.subscribe_bar(codes, period)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")

    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600000.SH", "instrument_id": "600000", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1, "period": "1m", "high": 6.56, "low": 6.55, "open": 6.55, "close": 6.56, "volume": 51700, "start_volume": 39126164, "turnover": 339138, "start_turnover": 256328611}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period )
        
    #监听行情
    smart.on(smart.Event.ON_BAR, on_bar_callback)

def methodTwo():
    #方式二：订阅
    codes = ['000002.SZ','600004.SH']
    period = "1m"
    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600004.SH", "instrument_id": "600004", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1, "period": "1m", "high": 9.6, "low": 9.58, "open": 9.58, "close": 9.58, "volume": 14000, "start_volume": 10113100, "turnover": 134144, "start_turnover": 97570700}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period)
    failList = smart.subscribe_bar(codes, period, on_bar_callback)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")

def methodThree():
    #方式三：订阅
    codes = ['000004.SZ','600006.SH']
    period = "1m"
    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600006.SH", "instrument_id": "600006", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1,"period": "1m",  "high": 5.38, "low": 5.37, "open": 5.38, "close": 5.37, "volume": 5400, "start_volume": 5989572, "turnover": 29033, "start_turnover": 32280044}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period)
    smart.on_bar = on_bar_callback
    failList = smart.subscribe_bar(codes, period)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")
def init():
    methodOne()
    methodTwo()
    methodThree()
    
def show():
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `取消订阅bar行情-unsubscribe_bar`

> 取消订阅bar行情
* `codes` 必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
* `emitter` 选填 注册行情派发事件对象, 默认为全局smart对象
* 返回值 字符串数组，表示取消订阅失败的股票列表，例如['600000.SH']
```python
smart.unsubscribe_bar(codes, period, emitter)
```

#### 取消订阅bar行情示例

```python
from smart import *
import logging
from smart.utils import *
logger = logging.getLogger()

def methodOne():
    codes = ['000001.SZ','600000.SH']
    period = "1m"
    #方式一：订阅
    failList = smart.subscribe_bar(codes, period)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")

    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600000.SH", "instrument_id": "600000", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1, "period": "1m", "high": 6.56, "low": 6.55, "open": 6.55, "close": 6.56, "volume": 51700, "start_volume": 39126164, "turnover": 339138, "start_turnover": 256328611}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period )
        
    #监听行情
    smart.on(smart.Event.ON_BAR, on_bar_callback)

def methodTwo():
    #方式二：订阅
    codes = ['000002.SZ','600004.SH']
    period = "1m"
    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600004.SH", "instrument_id": "600004", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1, "period": "1m", "high": 9.6, "low": 9.58, "open": 9.58, "close": 9.58, "volume": 14000, "start_volume": 10113100, "turnover": 134144, "start_turnover": 97570700}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period)
    failList = smart.subscribe_bar(codes, period, on_bar_callback)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")

def methodThree():
    #方式三：订阅
    codes = ['000004.SZ','600006.SH']
    period = "1m"
    def on_bar_callback(quote):
        logger.debug("bar行情:%s", smart.utils.toString(quote))
        # {"type": "bar_1min", "code": "600006.SH", "instrument_id": "600006", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1,"period": "1m",  "high": 5.38, "low": 5.37, "open": 5.38, "close": 5.37, "volume": 5400, "start_volume": 5989572, "turnover": 29033, "start_turnover": 32280044}
        
        #取消订阅
        smart.unsubscribe_bar([quote.code], period)
    smart.on_bar = on_bar_callback
    failList = smart.subscribe_bar(codes, period)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")
def init():
    methodOne()
    methodTwo()
    methodThree()
    
def show():
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```



### `异步-获取当天任意分钟的bar行情-query_bar_today_async`

> 获取当天任意分钟的bar行情。

* `codes`  必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `query_bar_today_callback` 必填 查询结果的回调函数
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
```python
smart.query_bar_today_async(codes, query_bar_today_callback, period)
```

#### 获取当天任意分钟的bar行情示例

```python
from smart import *
import logging
from smart.utils import *
logger = logging.getLogger()

def init():
    def query_bar_today_callback(datalist,err:RspError):
        if err:
           logger.debug("查询失败:%s", smart.utils.toString(err))
        else:
            for k,v in datalist.items():
                logger.debug("query_bar_today_async【OK】:%s", k)
                # query_bar_today_async【OK】:000001.SZ
                for i in range(len(v)):
                    if i < 5:   
                        logger.debug("query_bar_today_async【OK】前5个:%s",smart.utils.toString(v[i]))
                        # query_bar_today_async【OK】前5个:{"type": "bar_5m", "code": "000001.SZ", "instrument_id": "000001", "exchange_id": "SZE", "trading_day": "2024-02-07", "source_id": "xtp", "start_time": "2024-02-07 09:30:00", "end_time": "2024-02-07 09:35:00", "time_interval": 5, "period": "5m", "high": 9.66, "low": 9.59, "open": 9.62, "close": 9.65, "volume": 16184108, "start_volume": 0, "turnover": 155773027.72, "start_turnover": 0}
    codes = ['000001.SZ','600000.SH']
    period = "5m"
    smart.query_bar_today_async(codes, query_bar_today_callback, period) # 正常传值
def show():
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `同步-获取当天任意分钟的bar行情-query_bar_today`

> 获取当天任意分钟的bar行情。

* `codes`  必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
* 返回值 类型为dict, key 为股票代码,并且与参数 codes 中的 股票代码格式一致, value 为对应的 Bar 结构体数组
```python
smart.query_bar_today(codes, period)
```

#### 获取当天任意分钟的bar行情示例

```python
from smart import *
import logging
from smart.utils import *
logger = logging.getLogger()

def init():
    codes = ['000001.SZ','600000.SH']
    period = "5m"
    datalist = smart.query_bar_today(codes, period) # 正常传值
    for k,v in datalist.items():
                logger.debug("query_bar_today【OK】:%s", k)
                # query_bar_today【OK】:000001.SZ
                for i in range(len(v)):
                    if i < 5:   
                        logger.debug("query_bar_today【OK】前5个:%s",smart.utils.toString(v[i]))
                        # query_bar_today【OK】前5个:{"type": "bar_5min", "code": "000001.SZ", "instrument_id": "000001", "exchange_id": "SZE", "trading_day": "2024-01-18", "source_id": "xtp", "start_time": "2024-01-18 09:30:00", "end_time": "2024-01-18 09:35:00", "time_interval": 5,"period": "5m",  "high": 9.24, "low": 9.12, "open": 9.21, "close": 9.13, "volume": 14017000, "start_volume": 0, "turnover": 128664195, "start_turnover": 0}
def show():
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `异步-获取历史bar数据-query_bar_async`

-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页

// 方式一：通过调用query_bar_async接口
* `inParams`  必填 查询参数，具体要素如下列举
* `query_bar_callback` 必填 查询结果的回调函数
```python
def query_bar_callback(datalist,err:RspError):
    if err:
        logger.debug("查询失败:%s", smart.utils.toString(err))
    else:
        # 返回结果为Bar实体的数组
        for i in range(len(datalist)):
            
            if i < 5:   
                logger.debug("query_bar_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_bar_async【OK】:%d",len(datalist))
inParams = {
    "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
    "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
    "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
    "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
}
smart.query_bar_async(inParams, query_bar_callback) # 正常传值
```

#### 获取历史bar数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    def query_bar_callback(datalist,err):
        if(err):
            logger.debug("get error from query_bar_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_bar_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #query_bar_async【OK】前5个:{"type": "bar_5min", "code": "000001.SZ", "instrument_id": "000001", "exchange_id": "SZE", "trading_day": "2024-01-12", "source_id": "xtp", "start_time": "2024-01-12 09:55:00", "end_time": "2024-01-12 10:00:00", "time_interval": "5m", "period": "5m","high": 9.2, "low": 9.17, "open": 9.19, "close": 9.19, "volume": 2380100, "start_volume": 13549009, "turnover": 21865172, "start_turnover": 123997543}
            logger.debug("query_bar_async【OK】:%d",len(datalist))
            #query_bar_async【OK】:43 
    param = {
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    }
    smart.query_bar_async(param, query_bar_callback) # 正常传值
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```



// 方式二:通过调用query_data_async接口，详情见[数据查询](#method为bar-异步查询历史bar数据)

### `同步-获取历史bar数据-query_bar`

-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页

// 方式一：通过调用query_bar接口
* `inParams`  必填 查询参数，具体要素如下列举
```python
inParams = {
    "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
    "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
    "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
    "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
}
datalist = smart.query_bar(inParams) # 正常传值
#返回结果为Bar实体的数组
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_bar【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_bar【OK】:%d",len(datalist))
```

#### 获取历史bar数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    def query_bar_callback(datalist,err):
        if(err):
            logger.debug("get error from query_bar_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_bar_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #query_bar_async【OK】前5个:{"type": "bar_5min", "code": "000001.SZ", "instrument_id": "000001", "exchange_id": "SZE", "trading_day": "2024-01-12", "source_id": "xtp", "start_time": "2024-01-12 09:55:00", "end_time": "2024-01-12 10:00:00", "time_interval": "5m", "period": "5m","high": 9.2, "low": 9.17, "open": 9.19, "close": 9.19, "volume": 2380100, "start_volume": 13549009, "turnover": 21865172, "start_turnover": 123997543}
            logger.debug("query_bar_async【OK】:%d",len(datalist))
            #query_bar_async【OK】:43 
    param = {
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    }
    smart.query_bar_async(param, query_bar_callback) # 正常传值
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

方式二:通过调用query_data_async接口，详情见[数据查询](#method为bar-同步查询历史bar数据)
<!-- // 方式二:通过调用query_data_async接口，详情见<a href="#query_data-bar">数据查询</a> -->

### `同步-查询历史tick数据-query_tick`

> 异步查询历史tick数据

* `codes`  必填 要查询的股票列表数组 如['600000.SH', '000001.SZ']
* `start_datetime` 必填 开始时间，如 "2025-01-16 09:59:35"
* `end_datetime` 必填 开始时间，如 "2025-01-16 10:01:42"
* 返回值 类型为dict, key 为股票代码, value 为对应的 Quote 结构体数组
```python
smart.query_tick(codes, start_datetime, end_datetime)
```

### `异步-查询历史tick数据-query-tick-async`

> 异步查询历史tick数据

* `codes`  必填 要查询的股票列表数组 如['600000.SH', '000001.SZ']
* `start_datetime` 必填 开始时间，如 "2025-01-16 09:59:35"
* `end_datetime` 必填 开始时间，如 "2025-01-16 10:01:42"
* `callback` 必填 接收数据的回调函数

```python
def callback(result, err) :
    # result类型为dict, key 为股票代码, value 为对应的 Quote 结构体数组

smart.query_tick_async(codes, start_datetime, end_datetime, callback)
```


### `异步-获取市场数据-query_market_data_async`

-   获取一个时间范围内的 市场行情数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页

// 方式一：通过调用query_market_data_async接口
* `inParams`  必填 查询参数，具体要素如下列举
```python
def query_market_data_callback(datalist,err:RspError):
    if err:
        logger.debug("查询失败:%s", smart.utils.toString(err))
    else:
        # 返回结果为Quote实体的数组
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_market_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_market_data_async【OK】:%d",len(datalist))
inParams = {
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海 String(必填)
        "start_date": "2024-01-12 10:00:00", # 开始日期 String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00" # 结束日期 String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        }
smart.query_market_data_async(inParams, query_market_data_callback) # 正常传值
```

#### 获取市场数据示例示例
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    def query_market_data_callback(datalist,err:RspError):
        if err:
            logger.debug("查询失败:%s", smart.utils.toString(err))
        else:
            # 返回结果为Quote实体的数组
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_market_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # query_market_data_async【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "rcv_time": "20240112", "data_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 9.17, "pre_settlement_price": null, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "pre_open_interest": null, "open_interest": null, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "close_price": 0, "settlement_price": null, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ", "avg_price": null, "iopv": null, "instrument_status": null}
            logger.debug("query_market_data_async【OK】:%d",len(datalist))
            # query_market_data_async【OK】:4149
    inParams = {
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海 String(必填)
            "start_date": "2024-01-12 10:00:00", # 开始日期 String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00" # 结束日期 String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            }
    smart.query_market_data_async(inParams, query_market_data_callback) # 正常传值
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```



// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为market-data-异步查询市场数据)

### `同步-获取市场数据-query-market-data`

-   获取一个时间范围内的 市场数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页

// 方式一：通过调用query_market_data接口
* `inParams`  必填 查询参数，具体要素如下列举
```python
inParams = {
    "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
    "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
    "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
}
datalist = smart.query_market_data(inParams) # 正常传值
#返回结果为Quote实体的数组
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_market_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_market_data【OK】:%d",len(datalist))
```

#### 同步获取市场数据示例
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()
def query():
    inParams = {
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    }
    datalist = smart.query_market_data(inParams) # 正常传值
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_market_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #query_market_data【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "rcv_time": "20240112", "data_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "instrument_type": 1, "pre_close_price": 9.17, "pre_settlement_price": null, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "pre_open_interest": null, "open_interest": null, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "close_price": 0, "settlement_price": null, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ", "avg_price": null, "iopv": null, "instrument_status": null}
    logger.debug("query_market_data【OK】:%d",len(datalist))
    # query_market_data【OK】:4149
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为market-data-同步查询市场数据)


// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为current-next-trading-day-同步获取当前交易日及下一交易日)

### `异步查询数据接口-query_data_async`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有<br/>
#### `method为bar-异步查询历史Bar数据`

>-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
>-   返回数据默认为前复权
>* `method`  必填 该值为"bar"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `query_data_callback` 必填 查询结果的回调函数
>* `outFormat` 选填 值域为OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` 不传outFormat或outFormat=OutFormat.List时
```python
def queryBar_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        #返回结果为dict类型的数组
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_async【OK】:%d",len(datalist))
  
smart.query_data_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    query_data_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>>第二种入参
>>* `outFormat` 本例传outFormat=OutFormat.DataFrame时：
```python
def queryBar_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        # 返回结果为DataFrame类型的数据
        logger.debug(datalist)
        logger.debug("query_data_async【OK】:%s",datalist.columns.tolist())
        logger.debug("query_data_async【OK】:%s",datalist.values)
        logger.debug("query_data_async【OK】:%s",datalist.index)
  
smart.query_data_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    query_data_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

>>第三种入参
>>* `outFormat` 本例传outFormat=OutFormat.Ndarray：
```python
def queryBar_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        #返回结果为Ndarray结构数据
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_async【OK】:%d",len(datalist))
        logger.debug("query_data_async【OK】:%s",datalist.ndim)
        logger.debug("query_data_async【OK】:%s",datalist.shape)
        logger.debug("query_data_async【OK】:%s",datalist.size)
        logger.debug("query_data_async【OK】:%s",datalist.dtype)
        logger.debug("query_data_async【OK】:%s",datalist.itemsize)
  
smart.query_data_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
},
    query_data_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

#### 异步查询数据-获取历史bar行情示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    def query_bar_callback(datalist,err):
        if(err):
            logger.debug("get error from query_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #query_data_async【OK】前5个:{"code": "000001.SZ", "end_time": "2024-01-12 10:00:00", "start_volume": 13549009, "trading_day": "2024-01-12", "type": "bar_5min", "instrument_id": "000001", "time_interval": "5m","period": "5m", "start_turnover": 123997543, "volume": 2380100, "start_time": "2024-01-12 09:55:00", "high": 9.2, "exchange_id": "SZE", "low": 9.17, "source_id": "xtp", "close": 9.19, "turnover": 21865172, "open": 9.19}
            logger.debug("query_data_async【OK】:%d",len(datalist))
            #query_data_async【OK】:43
    smart.query_data_async(
        method="bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
            "adjust_type": "pre" # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        query_data_callback=query_bar_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```
<!-- <a id="test2">测试2</a> -->
#### `method为market_data-异步查询市场数据`

>-   获取一个时间范围内的 市场数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
>* `method`  必填 该值为"bar"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `outFormat` 选填 值域为 OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` 不传outFormat或outFormat=OutFormat.List时：
```python
def queryMarketData_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        #返回结果为dict类型的数组
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_async【OK】:%d",len(datalist))
  
smart.query_data_async(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    query_data_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>>第二种入参
>>* `outFormat` 本例传outFormat=OutFormat.DataFrame时：
```python
def queryMarketData_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        # 返回结果为DataFrame类型的数据
        logger.debug(datalist)
        logger.debug("query_data_async【OK】:%s",datalist.columns.tolist())
        logger.debug("query_data_async【OK】:%s",datalist.values)
        logger.debug("query_data_async【OK】:%s",datalist.index)
  
smart.query_data_async(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    query_data_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

>>第三种入参
>>* `outFormat` 本例传outFormat=OutFormat.Ndarray：
```python
def queryMarketData_callback(datalist,err):
    if(err):
        logger.debug("get error from query_data_async:%s",err)
    else:
        #返回结果为Ndarray结构数据
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_async【OK】:%d",len(datalist))
        logger.debug("query_data_async【OK】:%s",datalist.ndim)
        logger.debug("query_data_async【OK】:%s",datalist.shape)
        logger.debug("query_data_async【OK】:%s",datalist.size)
        logger.debug("query_data_async【OK】:%s",datalist.dtype)
        logger.debug("query_data_async【OK】:%s",datalist.itemsize)
  
smart.query_data_async(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    query_data_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

#### 异步查询数据-获取市场数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()
def query():
    def queryMarketData_callback(datalist,err):
        if(err):
            logger.debug("get error from query_data_async:%s",err)
        else:
            logger.debug(datalist)
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # query_data_async【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "date_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "pre_close_price": 9.17, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ"}
            logger.debug("query_data_async【OK】:%d",len(datalist))
            # query_data_async【OK】:4149
    
    smart.query_data_async(
        method="market_data", # String(必填) method方法：固定值
        inParams={
            "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        },
        query_data_callback=queryMarketData_callback, # 回调函数
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

#### `method为current_next_trading_day-异步获取当前交易日及下一交易日`

>-   获取当前交易日及下一交易日，如果当前日期不是交易日，则当前交易日返回空""
>* `method`  必填 该值为"current_next_trading_day"
>* `inParams`  必填 查询参数，{}
```python
def query_callback(datalist,err:RspError):
    if err:
        logger.debug("查询失败:%s", smart.utils.toString(err))
    else:
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_trading_day_async query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_trading_day_async query_data_async【OK】:%d",len(datalist))
smart.query_data_async("current_next_trading_day", None, query_callback)
```

#### 异步查询数据-获取当前交易日及下一交易日示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()
def query():
    def query_callback(datalist,err:RspError):
        if err:
           logger.debug("查询失败:%s", smart.utils.toString(err))
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_trading_day_async query_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
            logger.debug("get_trading_day_async query_data_async【OK】:%d",len(datalist))
    smart.query_data_async("current_next_trading_day", None, query_callback)
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `同步查询数据接口-query_data`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有<br/>
#### `method为bar-同步查询历史Bar数据`

>-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
>-   返回数据默认为前复权
>* `method`  必填 该值为"bar"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `outFormat` 选填 值域为OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` 本例不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.query_data(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为Dict类型的数组
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data【OK】:%d",len(datalist))
```
>>第二种入参
>>* `outFormat` 本例传outFormat=OutFormat.DataFrame时：
```python
datalist = smart.query_data(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataFrame类型数据
logger.debug(datalist)
logger.debug("query_data【OK】:%s",datalist.values)
logger.debug("query_data【OK】:%s",datalist.index)
logger.debug("query_data【OK】:%s",datalist.columns.tolist())
```
>>第三种入参
>>* `outFormat` 本例传outFormat=OutFormat.Ndarra时：
```python
datalist = smart.query_data(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为Ndarray类型数据
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data【OK】:%d",len(datalist))
logger.debug("query_data【OK】:%s",datalist.ndim)
logger.debug("query_data【OK】:%s",datalist.shape)
logger.debug("query_data【OK】:%s",datalist.size)
logger.debug("query_data【OK】:%s",datalist.dtype)
logger.debug("query_data【OK】:%s",datalist.itemsize)
```

#### 同步查询数据-获取历史bar行情示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()
def query():
    datalist = smart.query_data(
        method="bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
            "adjust_type": "pre" # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #query_data【OK】前5个:{"code": "000001.SZ", "end_time": "2024-01-12 10:00:00", "start_volume": 13549009, "trading_day": "2024-01-12", "type": "bar_5min", "instrument_id": "000001", "time_interval": "5m","period": "5m", "start_turnover": 123997543, "volume": 2380100, "start_time": "2024-01-12 09:55:00", "high": 9.2, "exchange_id": "SZE", "low": 9.17, "source_id": "xtp", "close": 9.19, "turnover": 21865172, "open": 9.19}
    logger.debug("query_data【OK】:%d",len(datalist))
    #query_data【OK】:43    

def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

#### `method为market_data-同步查询市场数据`

>-   获取一个时间范围内的 市场数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
>* `method`  必填 该值为"market_data"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `outFormat` 选填 值域为OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` 本例不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.query_data(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为Dict类型的数组
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data【OK】:%d",len(datalist))
```
>>第二种入参
>>* `outFormat` 本例传outFormat=OutFormat.DataFrame时：
```python
datalist = smart.query_data(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataFrame类型数据
logger.debug(datalist)
logger.debug("query_data【OK】:%s",datalist.values)
logger.debug("query_data【OK】:%s",datalist.index)
logger.debug("query_data【OK】:%s",datalist.columns.tolist())
```
>>第三种入参
>>* `outFormat` 本例传outFormat=OutFormat.Ndarra时：
```python
datalist = smart.query_data(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为Ndarray类型数据
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data【OK】:%d",len(datalist))
logger.debug("query_data【OK】:%s",datalist.ndim)
logger.debug("query_data【OK】:%s",datalist.shape)
logger.debug("query_data【OK】:%s",datalist.size)
logger.debug("query_data【OK】:%s",datalist.dtype)
logger.debug("query_data【OK】:%s",datalist.itemsize)
```

#### 同步查询数据-获取市场数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    datalist = smart.query_data(
        method="market_data", # String(必填) method方法：固定值
        inParams={
            "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        },
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
    #返回结果为Dict类型的数组
    logger.debug(datalist)
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_data【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #query_data【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "date_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "pre_close_price": 9.17, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ"}
    logger.debug("query_data【OK】:%d",len(datalist))
    #query_data【OK】:4149
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

#### `method为current_next_trading_day-同步获取当前交易日及下一交易日`

>-   获取当前交易日及下一交易日，如果当前日期不是交易日，则当前交易日返回空""
>* `method`  必填 该值为"current_next_trading_day"
>* `inParams`  必填 查询参数，{}
```python
tradingDayList = smart.query_data("current_next_trading_day")
for i in range(len(tradingDayList)):
    if i < 5:   
        logger.debug("get_trading_day query_data【OK】前5个:%s",smart.utils.toString(tradingDayList[i]))
logger.debug("get_trading_day query_data【OK】:%d",len(tradingDayList))
```

#### 同步查询数据-获取当前交易日及下一交易日示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()
def query():
    tradingDayList = smart.query_data("current_next_trading_day")
    for i in range(len(tradingDayList)):
        if i < 5:   
            logger.debug("get_trading_day query_data【OK】前5个:%s",smart.utils.toString(tradingDayList[i]))
    logger.debug("get_trading_day query_data【OK】:%d",len(tradingDayList))
def init():
    query()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```


### `异步分页查询数据接口-query_data_page_async`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有
#### `method为bar-异步分页查询历史bar数据`

>-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
>-   返回数据默认为前复权
>* `method`  必填 该值为"bar"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `query_data_page_callback` 必填 查询结果的回调函数
>* `outFormat` 选填 值域为OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` 本例不传outFormat或outFormat=OutFormat.List时：
```python
def queryBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型的数组
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_page_async【OK】:%d",len(datalist))
  
smart.query_data_page_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>> 第二种入参
>>* `outFormat` 本例outFormat=OutFormat.DataFrame时：
```python
def queryBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是DataFrame类型数据
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("query_data_page_async【OK】:%s",datalist.columns.tolist())
        logger.debug("query_data_page_async【OK】:%s",datalist.values)
        logger.debug("query_data_page_async【OK】:%s",datalist.index)
  
smart.query_data_page_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>>第三种入参
>>* `outFormat` 本例outFormat=OutFormat.Ndarra时：
```python
def queryBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是Ndarray类型数据
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_page_async【OK】:%d",len(datalist))

        logger.debug("query_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("query_data_page_async【OK】:%s",datalist.shape)
        logger.debug("query_data_page_async【OK】:%s",datalist.size)
        logger.debug("query_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("query_data_page_async【OK】:%s",datalist.itemsize)
  
smart.query_data_page_async(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryBar_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

#### 异步分页获取历史bar数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def query_data_page_async():
    def queryBar_callback(result:DataPageInfo,err):
        if(err):
            logger.debug("get error from query_data_page_async:%s",err)
        else:
            #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型的数组
            logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            #query_data_page_async:当前页：1,每页记录数：10000,总记录数：240,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #query_data_page_async【OK】前5个:{"code": "000001.SZ", "end_time": "2013-01-04 15:00:00", "start_volume": 0, "trading_day": "2013-01-04", "type": "bar_1d", "instrument_id": "000001", "time_interval": "1d", "period": "5m","start_turnover": 0, "volume": 44385137, "start_time": "2013-01-04 09:30:00", "high": 5.1003, "exchange_id": "SZE", "low": 4.936, "source_id": "xtp", "close": 4.9577, "turnover": 717567546.58, "open": 5.06}
            logger.debug("query_data_page_async【OK】:%d",len(datalist))
            #query_data_page_async【OK】:240
  
    smart.query_data_page_async(
        method="bar", # String(必填) method方法：固定值
        inParams={
            "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
            "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
            "current_page": 1, #  当前页，不传 默认当前页 为1
            "page_size": 10000 # 分页数量，最大为10000
        },
        query_data_page_callback=queryBar_callback, # 回调函数
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )

def init():
    query_data_page_async()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

#### `method为market_data-异步分页查询市场数据`

>-   获取一个时间范围内的 市场数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
>* `method`  必填 该值为"market_data"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `query_data_page_callback` 必填 查询结果的回调函数
>* `outFormat` 选填 值域为OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>> 第一种入参
>>* `outFormat` 本例不传outFormat或outFormat=OutFormat.List时：

```python
def queryMarketData_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型的数组
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_page_async【OK】:%d",len(datalist))
  
smart.query_data_page_async(
    method="market_data", # String(必填) method方法：固定值
    inParams = {
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 1000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>>第二种入参
>>* `outFormat` 本例outFormat=OutFormat.DataFrame时：
```python
def queryMarketData_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是DataFrame类型数据
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("query_data_page_async【OK】:%s",datalist.columns.tolist())
        logger.debug("query_data_page_async【OK】:%s",datalist.values)
        logger.debug("query_data_page_async【OK】:%s",datalist.index)
  
smart.query_data_page_async(
    method="market_data", # String(必填) method方法：固定值
    inParams = {
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 1000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
>>第三种入参
>>* `outFormat` 本例outFormat=OutFormat.Ndarra时：
```python
def queryMarketData_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from query_data_page_async:%s",err)
    else:
        #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是Ndarray类型数据
        logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("query_data_page_async【OK】:%d",len(datalist))

        logger.debug("query_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("query_data_page_async【OK】:%s",datalist.shape)
        logger.debug("query_data_page_async【OK】:%s",datalist.size)
        logger.debug("query_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("query_data_page_async【OK】:%s",datalist.itemsize)
  
smart.query_data_page_async(
    method="market_data", # String(必填) method方法：固定值
    inParams = {
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 1000 # 分页数量，最大为10000
    },
    query_data_page_callback=queryMarketData_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```

#### 异步分页获取市场数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def query_data_page_async():
    def queryMarketData_callback(result:DataPageInfo,err):
        if(err):
            logger.debug("get error from query_data_page_async:%s",err)
        else:
            #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型的数组
            logger.debug("query_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            #query_data_page_async:当前页：1,每页记录数：1000,总记录数：4150,总页数：5
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("query_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #query_data_page_async【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "date_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "pre_close_price": 9.17, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ"}
            logger.debug("query_data_page_async【OK】:%d",len(datalist))
            #query_data_page_async【OK】:1000
    smart.query_data_page_async(
        method="market_data", # String(必填) method方法：固定值
        inParams = {
            "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", # String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", # String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "current_page": 1, #  当前页，不传 默认当前页 为1
            "page_size": 1000 # 分页数量，最大为10000
        },
        query_data_page_callback=queryMarketData_callback, # 回调函数
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )

def init():
    query_data_page_async()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `同步分页查询数据接口-query_data_page`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有
#### `method为bar-同步分页查询历史bar数据`

>-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
>-   返回数据默认为前复权
>* `method`  必填 该值为"bar"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `outFormat` 选填 OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` outFormat不传或是outFormat=OutFormat.List时
```python
result = smart.query_data_page(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data_page【OK】:%d",len(datalist))
```
>>第二种入参
>>* `outFormat` outFormat=OutFormat.DataFrame时：
```python
result = smart.query_data_page(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是DataFrame类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("query_data_page【OK】:%s",datalist.values)
logger.debug("query_data_page【OK】:%s",datalist.index)
logger.debug("query_data_page【OK】:%s",datalist.columns.tolist())
```
>>第三种入参
>>* `outFormat` 传outFormat=OutFormat.Ndarray时：
```python
result = smart.query_data_page(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)，注意：查询1d的则开始、截止时间需要将00:00:00包住，查询1w的则开始、截止时间需要将周五的00:00:00包住
        "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是Ndarray类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data_page【OK】:%d",len(datalist))

logger.debug("query_data_page【OK】:%s",datalist.ndim)
logger.debug("query_data_page【OK】:%s",datalist.shape)
logger.debug("query_data_page【OK】:%s",datalist.size)
logger.debug("query_data_page【OK】:%s",datalist.dtype)
logger.debug("query_data_page【OK】:%s",datalist.itemsize)
```

#### 同步分页获取历史bar数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()


def init():
    result = smart.query_data_page(
        method="bar", # String(必填) method方法：固定值
        inParams={
            "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
            "adjust_type": "pre", #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
            "current_page": 1, #  当前页，不传 默认当前页 为1
            "page_size": 10000 # 分页数量，最大为10000
        },
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
    #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型数组
    logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # query_data_page:当前页：1,每页记录数：10000,总记录数：43,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # query_data_page【OK】前5个:{"code": "000001.SZ", "end_time": "2024-01-12 10:00:00", "start_volume": 13549009, "trading_day": "2024-01-12", "type": "bar_5min", "instrument_id": "000001", "time_interval": "5m","period": "5m", "start_turnover": 123997543, "volume": 2380100, "start_time": "2024-01-12 09:55:00", "high": 9.2, "exchange_id": "SZE", "low": 9.17, "source_id": "xtp", "close": 9.19, "turnover": 21865172, "open": 9.19}
    logger.debug("query_data_page【OK】:%d",len(datalist))
    # query_data_page【OK】:43
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

#### `method为market_data-同步分页查询市场数据`

>-   获取一个时间范围内的 市场数据(ticker行情), 数据量较大, 请输入合适的开始结束日期
>* `method`  必填 该值为"market_data"
>* `inParams`  必填 查询参数，具体要素如下列举
>* `outFormat` 选填 OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
>>第一种入参
>>* `outFormat` outFormat不传或是outFormat=OutFormat.List时
```python
result = smart.query_data_page(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data_page【OK】:%d",len(datalist))
```
>>第二种入参
>>* `outFormat` outFormat=OutFormat.DataFrame时：
```python
result = smart.query_data_page(
    method="market_data", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是DataFrame类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("query_data_page【OK】:%s",datalist.values)
logger.debug("query_data_page【OK】:%s",datalist.index)
logger.debug("query_data_page【OK】:%s",datalist.columns.tolist())
```
>>第三种入参
>>* `outFormat` 传outFormat=OutFormat.Ndarray时：
```python
result = smart.query_data_page(
    method="bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
        "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
        "current_page": 1, #  当前页，不传 默认当前页 为1
        "page_size": 10000 # 分页数量，最大为10000
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
#返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是Ndarray类型数组
logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("query_data_page【OK】:%d",len(datalist))

logger.debug("query_data_page【OK】:%s",datalist.ndim)
logger.debug("query_data_page【OK】:%s",datalist.shape)
logger.debug("query_data_page【OK】:%s",datalist.size)
logger.debug("query_data_page【OK】:%s",datalist.dtype)
logger.debug("query_data_page【OK】:%s",datalist.itemsize)
```

#### 同步分页获取市场数据示例

```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def query_data_page():
    result = smart.query_data_page(
        method="market_data", # String(必填) method方法：固定值
        inParams={
            "code": "000001.SZ",  # 000001.SZ 600000.SH  String(必填) 证券代码  SZ:深证 SH:上海
            "start_date": "2024-01-12 10:00:00", #String(必填) 开始日期 格式yyyy-MM-dd hh:mm:ss
            "end_date": "2024-01-12 15:00:00", #String(必填) 结束日期 格式yyyy-MM-dd hh:mm:ss
            "current_page": 1, #  当前页，不传 默认当前页 为1
            "page_size": 10000 # 分页数量，最大为10000
        },
        outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
    #返回结果为DataPageInfo类型数据，其中DataPageInfo.data要素是dict类型数组
    logger.debug("query_data_page:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    #query_data_page:当前页：1,每页记录数：10000,总记录数：4149,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_data_page【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # query_data_page【OK】前5个:{"source_id": "xtp", "trading_day": "20240112", "date_time": "20240112100000000", "instrument_id": "000001", "exchange_id": "SZE", "pre_close_price": 9.17, "last_price": 9.19, "volume": 15929909, "turnover": 145870062, "open_price": 9.13, "high_price": 9.2, "low_price": 9.11, "upper_limit_price": 10.09, "lower_limit_price": 8.25, "bid_price": [9.18, 9.17, 9.16, 9.15, 9.14, 0, 0, 0, 0, 0], "ask_price": [9.19, 9.2, 9.21, 9.22, 9.23, 0, 0, 0, 0, 0], "bid_volume": [363900, 606900, 757200, 1069400, 441500, 0, 0, 0, 0, 0], "ask_volume": [368100, 904500, 463100, 719900, 483500, 0, 0, 0, 0, 0], "code": "000001.SZ"}
    logger.debug("query_data_page【OK】:%d",len(datalist))
    #query_data_page【OK】:4149

def init():
    query_data_page()
def show():
   logger.debug("show")
   logger.debug("show")
def hide():
    logger.debug("hide")
def close():
    logger.debug("close")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)
```

### `添加自选股-add_self_select_stock`
* `group_name`  String(必填) 板块名称
* `stock`  String(必填) 股票代码
* `source` String(必填) - 柜台id，可填 None，等价于"xtp"，目前只支持 "xtp"
* `account_id` String(必填) - 账号id，可填 None，等价于当前登录账号id，目前 account_id 只支持当前登录账号
* `add_self_select_stock_cb` (必填)，接收结果的回调函数
  
```python

def add_self_select_stock_cb(result, err) :
    logger.info("add_self_select_stock result: %s", result)    # {'code': '0000', 'message': '成功'}
    '''
    result 如下代表添加成功
    {
        "code":"0000",
        "message":"成功"
    }
    '''

try :
    smart.add_self_select_stock("我的银行", "000001.SZ", None, None, add_self_select_stock_cb)
except Exception as exp :
    logger.error(exp, exc_info=True, stack_info=True)
```

### `删除自选股-del_self_select_stock`
* `group_name`  String(必填) 板块名称
* `stock`  String(必填) 股票代码
* `source` String(必填) - 柜台id，可填 None，等价于"xtp"，目前只支持 "xtp"
* `account_id` String(必填) - 账号id，可填 None，等价于当前登录账号id，目前只支持当前登录账号
* `del_self_select_stock_cb` (必填)，接收结果的回调函数
  
```python

def del_self_select_stock_cb(result, err) :
    logger.info("del_self_select_stock result: %s", result)    # {'code': '0000', 'message': '成功'}
    '''
    result 如下代表删除成功
    {
        "code":"0000",
        "message":"成功"
    }
    '''

try :
    smart.del_self_select_stock("我的银行", "000001.SZ", None, None, del_self_select_stock_cb)
except Exception as exp:
    logger.error(exp, exc_info=True, stack_info=True)
```


## SmartX数据详情
组件SDK提供query_data_async（异步查询数据）、query_data（同步查询数据）、query_data_page_async（异步分页查询数据）、query_data_page_async（同步分页查询数据）接口。客户需要仅需要传递method及请求入参inParams，即可获取对应查询数据
* `method`  String(必填) 查询使用的方法名
* `inParams`  Object(必填) 查询参数（该参数因method而变）
### `获取历史1分钟Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数对象，其中period为"1m"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史5分钟Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"5m"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史15分钟Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"15m"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史30分钟Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"30m"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史60分钟Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"60m"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史1天Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"1d"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取历史1星期Bar行情`
* `method` 必填 该值为"bar"
*  `inParams`  必填 查询参数，其中period为"1w"，其他的要素详情见[异步数据查询](#method为bar-异步查询历史bar数据)或是[同步数据查询](#method为bar-同步查询历史bar数据)或是[异步分页数据查询](#method为bar-异步分页查询历史bar数据)或是[同步分页数据查询](#method为bar-同步分页查询历史bar数据)
-   返回数据默认为前复权
### `获取市场数据-ticker行情`
* `method` 必填 该值为"market_data"
*  `inParams`  必填 查询参数对象，具体要素详情见[异步数据查询](#method为market-data-异步查询市场数据)或是[同步数据查询](#method为market-data-同步查询市场数据)或是[异步分页数据查询](#method为market-data-异步分页查询市场数据)或是[同步分页数据查询](#method为market-data-同步分页查询市场数据)
-   返回数据默认为前复权

## smart对象下的全局实时静态数据

组件SDK会维护一些常用变量在smart对象下。
当变量所代表的内容变化时，SDK也会同步更改对应变量的值，保证使用者在任何时刻获取变量，都是最新的数据。
### `当前登录的资金账号-current_account`
当前客户端登录的主资金账号 指向account_map中当前客户端的主登录账号,值为[Account](#资金账户-account)对象
```python
smart.current_account
```

### `已登录的资金账号集合-account_map`
已经登录的资金账号map key为资金账号  value为[Account](#资金账户-account)
```python
smart.account_map
```


### `证券列表-instrument_list`
所有证券列表 Array 元素为[Instrument](#证券信息-instrument)对象
```python
smart.instrument_list
```
### `证券索引集合-instrument_map`
获取证券列表按照证券代码_市场
```python
smart.instrument_map
```

### `证券类型集合-instrument_map_by_type`
按证券类型进行区分的Map结构

```python
smart.instrument_map_by_type
```

### `组件策略账簿-book`
用于记录组件策略的资产和持仓信息，数据类型[Book](#账簿对象-book)

```python
smart.book
```

## `资金账户-Account`

> 提供资金账户基本数据和方法

### 实例事件

`Account` 是一个EventEmitter。可以监听的事件详见[Event](#事件-event)

#### `account.on_order`

账户委托推送  不保序
* `callback` Function (必填) - 获取委托变化的回调，返回为[Order](#委托回报-order)对象
```python
def callback(order):
    logger.debug("get on_order:%s",smart.utils.toString(order))
smart.current_account.on_order(callback)
```

#### `account.on_trade`
账户成交回报推送  不保序
* `callback` Function (必填) - 获取成交回报的回调，返回为[Trade](#成交回报-trade)对象
```python
def callback(trade):
    logger.debug("get on_trade:%s",smart.utils.toString(trade))
smart.current_account.on_trade(callback)
```

#### `account.on_assets`
账户资产变动推送
* `callback` Function (必填) - 获取账户资产变动的回调，返回为[Assets](#账号资产信息-assets)对象
```python
def callback(assets):
    logger.debug("get on_assets:%s",smart.utils.toString(assets))
smart.current_account.on_assets(callback)
```

#### `account.on_position`
账户持仓变动增量推送
* `callback` Function (必填) - 获取账户持仓变动增量，返回为[Position](#持仓-position)对象
```python
def callback(position):
    logger.debug("get on_position:%s",smart.utils.toString(position))
smart.current_account.on_position(callback)
```

#### `account.on_quote`
账户收到订阅的行情推送
* `callback` Function (必填) - 获取订阅的行情推送，返回为[Quote](#行情信息-quote)对象
```python
def on_quote_callback(quote):
    logger.debug("get on_quote:%s",smart.utils.toString(quote))
smart.current_account.on_quote(on_quote_callback)
```

#### `account.on_cancel_fail`
账户收到撤单失败的推送
* `callback` Function (必填) - 获取撤单失败的推送，返回撤单失败信息
```python
def callback(data):
    logger.debug("get on_cancel_fail:%s",smart.utils.toString(data))
smart.current_account.on_cancel_fail(callback)
```


### 静态方法
无
### 实例属性

#### `account_id`

资金账号       String

#### `nick_name`

资金账号的昵称  String
#### `isLevel2`

是否是level2  Boolean
#### `exchange_right`

沪深交易权限    String  all两市   sh上海  sz深圳  双中心用户登录一个节点只有一个市场的权限

#### `account_type`

账户类型       [AccountType](#账号类型-accounttype)枚举

#### `source`

柜台类型       [Source](#柜台类型-source)枚举

#### `assets`

该账号的实时资产信息         [Assets](#账号资产信息-assets)对象

#### `account.position_list`

该账号的实时持仓信息   Array  元素是[Position](#持仓-position)对象


#### `account.order_list`

该账户的实时委托确认列表  Array 元素是[Order](#委托回报-order)对象


#### `account.trade_list`

该账户的实时成交回报列表  Array 元素是[Trade](#成交回报-trade)对象


#### `book`

该账号的账簿信息，数据类型[Book](#账簿对象-book)



### 实例方法

**注意：** 某些方法仅在特定的策略平台上可用, 这些方法会被标记出来。


#### `account.subscribe`

订阅行情 注意无account_id参数 通过smart.current_account.on_quote(on_quote_callback)监听行情变化  这里区别alphax后台的subscribe函数是后台第一个参数是source，订阅数量限制规则如下：<br>
> 总资产<=300万   可订阅证券数量<=300<br>
> 300万<总资产<=1000万    可订阅证券数量<=1500<br>
> 1000万<总资产<=1亿    可订阅证券数量<=3000<br>
> 1亿<总资产<=10亿资产    可订阅证券数量<=6000<br>
> 10亿<总资产    可订阅证券数量不限制<br>

* `instruments` 必填 订阅的股票列表 数组 如['600000']\(该参数与codes参数必填其一\)
* `exchange_id` 必填 交易所id 如Exchange.SSE(该参数与codes参数必填其一)
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `callback` 选填 订阅后的数据或错误返回信息参数(quoteList,[err](#接口响应错误对象-rsperror))，quoteList只是订阅成功的结果，后续行情变化将随行情事件推送，详见示例
* `codes` 必填 订阅股票的证券代码.交易所标识列表 数组 如['600000.SH','300001.SZ']\(若该参数与instruments、exchange_id同时存在,以该参数为准\)
```python
# 方式一：
smart.current_account.subscribe(codes=['600000.SH','300001.SZ'])
def on_quote_callback(quote):
    logger.debug(f"{smart.utils.toString(quote)}")
smart.current_account.on_quote(on_quote_callback)
```
```python
# 方式二(不推荐)：
smart.current_account.subscribe(instruments, exchange_id, is_level2, callback)
def on_quote_callback(quote):
    logger.debug(f"{smart.utils.toString(quote)}")
smart.current_account.on_quote(on_quote_callback)
```

#### `account.unsubscribe`
取消订阅
* `instruments` 必填 订阅的股票列表 数组 如['600000']\(该参数与codes参数必填其一\)
* `exchange_id` 必填 交易所id 如Exchange.SSE(该参数与codes参数必填其一)
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `codes` 必填 订阅股票的证券代码.交易所标识列表 数组 如['600000.SH','300001.SZ']\(若该参数与instruments、exchange_id同时存在,以该参数为准\)
```python
# 方式一：
smart.current_account.unsubscribe(codes=['600000.SH','300001.SZ'])
```
```python
# 方式二(不推荐)：
smart.current_account.unsubscribe(instruments, exchange_id, is_level2)
```


#### `account.insert_order` <Badge type="warning" text="标准版不支持两融" />

> 资金账户下单
使用方法参见[insert_order](#下单-insert-order)，但是不需要传前三个参数（account_id、strategy_platform_type、strategy_id）,
* `instrument_id` String(必填) - 合约ID，证券代码，如 "600000"(该参数与code参数必填其一)
* `exchange_id` Number(必填) - 交易所ID 参考Exchange枚举值 如： Exchange.SSE(该参数与code参数必填其一)
* `limit_price` Number(必填) - 价格 如： 10.32
* `volume` Number(必填) - 数量 如： 100
* `price_type` Number(选填) - 报单类型，参考 PriceType枚举值，默认为Limit
* `side` Number(选填) - 买卖方向，参考[Side](#买卖方向-side)枚举值，默认为Buy，两融业务买卖方向参考[Side](#买卖方向-side)枚举值
* `offset` Number(选填) - 开平方向，参考 Offset枚举，默认为Init
* `client_id` Number(选填) - 客户自定义id，请使用uint数字，默认为0
* `parent_order_id` String(选填) - 母单编号，默认为"" startStrategy会得到一个母单编号，不传默认使用这个母单编号，如果客户需要自定义的母单编号可以传入，请使用数字形式
* `business_type` Number (选填) - 业务类型，参考[BusinessType](#委托业务类型-businesstype)枚举值，默认为CASH，两融业务使用MARGIN
* `callback` Function (选填) - 下单成功后的回调，返回一个订单委托对象(order,[err](#接口响应错误对象-rsperror))
* `autoSplit` Boolean (选填) - 自动拆单，默认为False
* `code` String(必填) - 证券代码.交易所标识，如600000.SH(若该参数与instrument_id、exchange_id同时存在,以该参数为准)

```python
# 方式一：
def insert_callback(order,err):
    logger.debug("get insert_order: %s",smart.utils.toString(order))
    if(not order):logger.debug("insert_order FAIL: %s",err.message)
smart.current_account.insert_order(instrument_id, exchange_id, limit_price, volume, price_type, side, offset, client_id, parent_order_id, business_type, insert_callback, autoSplit)
```
```python
# 方式二：
def insert_callback(order,err):
    logger.debug("get insert_order: %s",smart.utils.toString(order))
    if(not order):logger.debug("insert_order FAIL: %s",err.message)
smart.current_account.insert_order(code="600000.SH", limit_price=10.32, volume=100, side=smart.Type.Side.Buy, callback=insert_callback)
```

#### `account.cancel_order`

> 账号级别的撤单
使用方法参见[cancel_order](#撤单-cancel-order)，但是不需要传account_id参数

* `order_id` String(必填) - 订单ID
* `callback` Function (选填) - 撤单成功后的回调(data,[err](#接口响应错误对象-rsperror))

```python
def cancel_callback(data,err):
    logger.debug("get cancel_insert:%s",smart.utils.toString(data))
    if(not order):logger.debug("cancel_insert FAIL: %s",err.message)
smart.current_account.cancel_order(order_id, callback)
```


#### `account.refreshPositionList`
>刷新持仓信息
* `list` 需要更新的持仓列表
```python
smart.current_account.refreshPositionList(list)
```

#### `account.get_position`
>获取指定的证券持仓
* `instrument_id` String(必填) - 证券代码如 "600000"(该参数与code参数必填其一)
* `exchange_id` String(必填) - 交易所ID如：Exchange.SSE(该参数与code参数必填其一)
* `direction` Number(选填) - 持仓方向，默认为Direction.Net
* `code` String(必填) - 证券代码.交易所标识如"600000.SH"(若该参数与instrument_id、exchange_id同时存在,以该参数为准)
```python
# 方式一：
smart.current_account.get_position(instrument_id, exchange_id, direction)
```
```python
# 方式二：
smart.current_account.get_position(code="600000.SH")
```

## `事件-Event`

组件中会派发许多事件，
[`smart`对象](#smart)、
[账户（`Account`）对象](#资金账户-account)和
[策略（`Strategy`）对象](#策略-strategy)
都是一个[`Emitter`](https://github.com/component/emitter)，意味着都可以使用如下方法：

* `on`: 注册一个监听器
* `once`: 注册一个一次性的监听器
* `off`: 取消注册监听器
* `emit`: 派发事件
* `listeners`: 查看监听器

详情参考[`component-emitter`文档](https://github.com/component/emitter#readme)

同时为了方便调用，以上对象中还暴露了若干以`on_`开头的方法，与`on`方法等效。例如

```python
smart.on_init(callbackFunction)
smart.on(Event.ON_INIT, callbackFunction)
```

* `ON_INIT` 组件初始化 类似domReady事件，组件所有代码都必须在该事件之后
* `ON_CLOSE` 组件被关闭
* `ON_QUOTE` 订阅行情后，行情变化推送 策略之间、组件之间、策略和账户直接的订阅和取消订阅不相互影响
* `ON_ASSETS` **账户**资金的全量推送
* `ON_ORDER` 委托变化推送
* `ON_TRADE` 成交变化推送
* `ON_CANCEL_FAIL` 撤单失败的消息推送

不同对象派发出的事件不同(表格中标明了等效事件监听方法)

| 事件                      | smart               | Account                              | Strategy | 说明                                                                                  |
| ------------------------- | ------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------- |
| `ON_INIT`                 | ○<br>smart.on_init  | -                                    | -        | 组件初始化 类似domReady事件，组件所有代码都必须在该事件之后                           |
| `ON_CLOSE`                | ○<br>smart.on_close | -                                    | -        | 组件被关闭                                                                            |
| `ON_RESET`                | ○                   | -                                    | -        | 组件用户数据被清空重置                                                                |
| `ON_QUOTE`                | ○                   | ○<br>account.on_quote                | -        | 订阅行情后，行情变化推送 策略之间、组件之间、策略和账户直接的订阅和取消订阅不相互影响 |
| `ON_ASSETS`               | -                   | ○<br>account.on_assets               | -        | **账户**资金的全量推送                                                                |
| `ON_POSITION`             | -                   | ○<br>account.on_position             | -        | 持仓变化的增量推送                                                                    |
| `ON_ORDER`                | -                   | ○<br>account.on_order                | -        | 委托变化推送                                                                          |
| `ON_TRADE`                | -                   | ○<br>account.on_trade                | -        | 成交变化推送                                                                          |
| `ON_CANCEL_FAIL`          | -                   | ○<br>account.on_cancel_fail          | -        | 撤单失败的消息推送                                                                    |

---
## `数据类型-Type`

`Type`中包含枚举类型和结构体的构造方法。

**枚举类型**

### `柜台类型-Source`
柜台类型
```python
class Source():
    Unknown = "unknown"
    XTP = "xtp"  # xtp
    CTP = "ctp"  # ctp
    SIM = "sim"  # sim
```
### `交易所-Exchange`
交易所
```python
class Exchange():
    Unknown = 0  # 未知 xtp =3 XTP_MKT_UNKNOWN 或 0 XTP_MKT_INIT初始化值或者未知
    SZE = "SZE"  # 深交所 xtp =1 XTP_MKT_SZ_A深圳A股
    SSE = "SSE"  # 上交所 xtp =2 XTP_MKT_SH_A上海A股
    SHFE = "SHFE"  # 上期所
    DCE = "DCE"  # 大商所
    CZCE = "CZCE"  # 郑商所
    CFFEX = "CFFEX"  # 中金所
    INE = "INE"  # 能源中心

    # 以下交易所类型仅指数支持
    HSE = "HSE"  # 沪深
    XGE = "XGE"  # 香港
    YTE = "YTE"  # 亚太
    ZQE = "ZQE"  # 债券市场
    QTE = "QTE"  # 其它
    QQE = "QQE"  # 全球
```
### `证券类型-InstrumentType`
证券类型
```python
#证券类型 xtp:XTP_TICKER_TYPE
class InstrumentType():
    Unknown = 0  # 未知 xtp =5 XTP_TICKER_TYPE_UNKNOWN
    Stock = 1  # 股票 xtp =0 XTP_TICKER_TYPE_STOCK普通股票
    Future = 2  # 期货
    Bond = 3  # 债券 xtp =3 XTP_TICKER_TYPE_BOND债券
    StockOption = 4  # 股票期权 xtp =4 XTP_TICKER_TYPE_OPTION期权
    # 以下为alphax缺少
    Index = 5  # 指数 xtp =1 XTP_TICKER_TYPE_INDEX指数
    Fund = 6  # 基金 xtp =2 XTP_TICKER_TYPE_FUND基金
```
### `价格条件-PriceType`
价格条件
```python
class PriceType():
    # 无效  xtp =XTP_PRICE_TYPE_UNKNOWN
    Unknown = 0

    # 限价,通用  xtp:1 XTP_PRICE_LIMIT限价单-沪 / 深 / 沪期权（除普通股票业务外，其余业务均使用此种类型）
    Limit = 1

```
### `买卖方向-Side`
买卖方向
```python
class Side():
    Unknown = 0  # 无效
    Buy = 1  # 买
    Sell = 2  # 卖
```

### `委托业务类型-BusinessType`
委托业务类型
```python
class BusinessType():
    CASH = 0  # 普通股票
    Unknown= 13
```

### `开平标志-Offset`
开平标志
```python
class Offset():
    Open = 0  # 开  alphax:0  xtp:1 XTP_POSITION_EFFECT_OPEN
    Close = 1  # 平 alphax:1  xtp:2 XTP_POSITION_EFFECT_CLOSE
    CloseToday = 2  # 平今  alphax:2 xtp:4 XTP_POSITION_EFFECT_CLOSETODAY
    CloseYesterday = 3  # 平昨 alphax:3 xtp:5 XTP_POSITION_EFFECT_CLOSEYESTERDAY
    # 以下为alphax缺少的
    ForceClose = 13  # 强平  xtp:3 XTP_POSITION_EFFECT_FORCECLOSE
    ForceOff = 6  # 强减  xtp:6 XTP_POSITION_EFFECT_FORCEOFF
    LocalForceClose = 7  # 本地强平  xtp:7 XTP_POSITION_EFFECT_LOCALFORCECLOSE
    CreditForceCover = 8  # 信用业务追保强平 xtp:8 XTP_POSITION_EFFECT_CREDIT_FORCE_COVER
    CreditForceClear = 9  # 信用业务清偿强平 xtp:9 XTP_POSITION_EFFECT_CREDIT_FORCE_CLEAR
    CreditForceDebt = 10  # 信用业务合约到期强平 xtp:10 XTP_POSITION_EFFECT_CREDIT_FORCE_DEBT
    CreditForceUncond = 11  # 信用业务清偿强平 xtp:11 XTP_POSITION_EFFECT_CREDIT_FORCE_UNCOND
    Unknown = 12  # 未知 xtp:12 XTP_POSITION_EFFECT_UNKNOWN
    Init = 100  # 初始值或未知值开平标识，现货适用  对应xtp:0 XTP_POSITION_EFFECT_INIT
```
### `持仓方向-Direction`
持仓方向 多空  对应xtp的XTP_POSITION_DIRECTION_TYPE
```python
class Direction():
    Long = 0  # 多 xtp:1 XTP_POSITION_DIRECTION_LONG
    Short = 1  # 空 xtp:2 XTP_POSITION_DIRECTION_SHORT
    # 以下为alphax缺少的
    Net = 2  # 净 xtp:0 XTP_POSITION_DIRECTION_NET
    Covered = 3  # 备兑 xtp:3 XTP_POSITION_DIRECTION_COVERED
```
### `委托状态-OrderStatus`
委托状态
```python
class OrderStatus():
    Unknown = 0  # 未知(xtp:8 XTP_ORDER_STATUS_UNKNOWN）
    Submitted = 1  # 已提交(对应xtp:0 XTP_ORDER_STATUS_INIT初始化）
    Pending = 2  # 等待(对应xtp =5 XTP_ORDER_STATUS_NOTRADEQUEUEING未成交）
    Cancelled = 3  # 已撤单(xtp:6 XTP_ORDER_STATUS_CANCELED已撤单)
    Error = 4  # 错误（对应xtp:7 XTP_ORDER_STATUS_REJECTED拒单）
    Filled = 5  # 已成交（对应xtp:1 XTP_ORDER_STATUS_ALLTRADED全部成交）
    PartialFilledNotActive = 6  # 部成部撤（xtp:3 XTP_ORDER_STATUS_PARTTRADEDNOTQUEUEING部分撤单）
    PartialFilledActive = 7  # 部分成交（对应xtp:2 XTP_ORDER_STATUS_PARTTRADEDQUEUEING部分成交）
```

### `账号类型-AccountType`
账号类型 对应XTP_ACCOUNT_TYPE
```python
class AccountType():
    Stock = 0  # 普通账户  xtp:0 XTP_ACCOUNT_NORMAL普通账户
    Credit = 1  # 信用账户 xtp:1 XTP_ACCOUNT_CREDIT信用账户
    Future = 2  # 期货账户
    # 以下为alphax缺少：
    Derive = 3  # 期权衍生品账户 xtp:2 XTP_ACCOUNT_DERIVE衍生品账户
    Unknown = 4  # 未知  xtp:4 XTP_ACCOUNT_UNKNOWN
```

**结构体**


### `持仓-Position`
持仓对象定义
```python
class Position:
    def __init__(self):
        self.instrument_id = None  # 合约ID（证券代码)
        self.instrument_name = ""  # 证券名称
        # self.instrument_type = InstrumentType.Unknown  # 合约类型  alphax有但xtp目前缺少 需要去静态信息关联 可能影响性能  可以空着
        self.exchange_id = Exchange.Unknown  # 交易所id
        self.exchange_id_name = "未知"  # 交易所名称
        self.direction = None  # 持仓方向
        self.direction_name = ""  # 持仓方向名称
        self.name_py = ""  # 拼音首字母  如"安诺其"为"anq"  alphax缺少
        self.volume = 0  # 持仓量
        self.sellable_volume = 0  # 可卖持仓  alphax缺少
        self.position_cost_price = 0  # 持仓成本 profitPrice
        self.last_price = 0  # 最新价
        self.market_value = 0  # 市值
        self.unrealized_pnl = 0  # 浮动盈亏（保留字段,未计算） 未实现盈亏
        self.yesterday_volume = 0  # 昨日持仓
        self.purchase_redeemable_qty = 0  # 今日申购赎回数量 alphax缺少
        self.executable_option = 0  # 可行权合约 alphax缺少
        self.executable_underlying = 0  # 可行权标的 alphax缺少
        self.locked_position = 0  # 已锁定标的 alphax缺少
        self.usable_locked_position = 0  # 可用已锁定标的 alphax缺少
        self.xtp_market_type = "XTP_EXCHANGE_UNKNOWN"  # 交易市场
        self.xtp_market_name = "未知"  # 交易市场名称
        self._instrument_id_direction = ""  # 内部使用  代码+持仓方向的联合主键 如"300067_XTP_POSITION_DIRECTION_NET"
        self.code = None  # 证券代码.交易所标识 如"600000.SH"
        
```
### `委托回报-Order`
委托回报
```python
class Order:
    def __init__(self):
        self.rcv_time = None  # String	数据接收时间                                              "20200608140053830"
        self.order_id = None  # String	订单ID（对应xtpid）                    orderXtpId         "36934130021173201"
        self.source_order_id = None
        self.insert_time = None  # String	'XTP_MKT_UNKNOWN''XTP_MKT_UNKNOWN'委托写入时间                           insertTime         "20200608140053830"
        self.update_time = None  # String	委托更新时间                           updateTime         "20200608140053830"
        self.trading_day = None  # String	交易日                                insertTime中截取    "20200608"
        self.instrument_id = None  # String	合约ID（证券代码）                     ticker              "600000"
        self.exchange_id = Exchange.Unknown  # String	交易所ID                              xtpMarketType转换   "SSE"
        self.account_id = None  # String	账号ID（资金账号）                     userName            "10912133333344"
        self.client_id = None  # String	用户自定义编号                         rowId || orderClientId (rowid优先)  "6a1071e1-a94d-11ea-810c-4b25bab2cda3"
        self.instrument_type = None  # Number	合约类型                              xtpBusinessType转换  InstrumentType.Stock
        self.limit_price = None  # Number	价格                                  price               10.23
        self.frozen_price = None  # Number	冻结价格（市价单冻结价格为0.0）          price               10.23
        self.volume = None  # Number	数量                                  quantity            100
        self.volume_traded = None  # Number	成交数量                              qty_traded           0
        self.volume_left = None  # Number	剩余数量                              qty_left             100
        self.tax = None  # Number	税                                   todo:
        self.commission = None  # Number	手续费                                todo:
        self.status = None  # Number	订单状态                              order_status
        self.error_id = None  # Number	错误ID                               xtpErrorId
        self.error_msg = None  # String	错误信息                              xtpErrorMsg
        self.side = Side.Unknown  # Number	买卖方向                              xtpSideType
        self.offset = Offset.Unknown  # Number	开平方向                              xtpPositionEffectType
        self.price_type = None  # Number	价格类型                              xtpPriceType
        self.volume_condition = None  # Number	成交量类型
        self.time_condition = None  # Number	成交时间类型
        self.parent_order_id = None  # String	母单ID                               #篮子为runtimeId一个篮子一次交易一个值   etf套利为etf标签页期间是一个值  其他取alphax或smartserver传的      "6a1071e1-a94d-11ea-810c-4b25bab2cda3"
        self.code = None  # String  证券代码.交易所标识                            "600000.SH"

        self.traffic = None  # String  业务渠道标识                           business_type         "AlphaX"
        self.traffic_sub_id = None  # String  业务子标识，一般填策略名称               businessSubId         "网格交易"
        self.cancel_time = None  # String  撤单时间                              cancelTime            "20200608140053830"
        self.order_cancel_client_id = None  # String  撤单自定义编号                         orderCancelClientId   "0"
        self.order_cancel_xtp_id = None  # String  所撤原单的编号(原xtpid)                orderCancelXtpId      "0"
        self.instrument_name = None  # String  合约名称（证券名称）                    tickerName            "浦发银行"
        self.trade_amount = None  # Number  委托金额                              tradeAmount           0
        self.xtp_business_type = None  # String  xtp证券业务类型                        xtpBusinessType       "XTP_BUSINESS_TYPE_CASH"
        self.xtp_market_type = "XTP_MKT_UNKNOWN"  # String  xtp市场类型                            xtpMarketType         "XTP_MKT_SZ_A"

        # 以下为xtp的冗余字段，为了获取xtp的原值
        self.xtp_price_type = None  # String  xtp价格类型                            xtpPriceType          "XTP_PRICE_LIMIT"
        self.xtp_position_effect_type = None  # String xtp开平方向                  xtpPositionEffectType "XTP_POSITION_EFFECT_OPEN"
        self.xtp_side_type = None  # String  xtp交易方向                            xtpSideType           "XTP_SIDE_BUY"
        self.xtp_order_status = None  # String  xtp订单状态                            orderStatus           "XTP_ORDER_STATUS_INIT"

        # 以下为xtp和alphax枚举值翻译为中文的名称
        self.exchange_id_name = None  # String  交易所名称                                                  "上交所"
        self.instrument_type_name = None  # String  合约类型名称                                                "股票"
        self.status_name = None  # String  订单状态名称                                                "全部成交"
        self.side_name = None  # String  买卖方向名称                                                "买"
        self.offset_name = None  # String  开平方向名称                                                "开"
        self.price_type_name = None  # String  价格类型名称                                                "限价"
        self.xtp_business_type_name = None  # String  xtp证券业务类型名称                                          "现货"
        self.xtp_market_name = None  # String  xtp市场类型名称                                             "沪市"
        self.xtp_price_type_name = None  # String  xtp价格类型名称                                             "限价"
        self.xtp_position_effect_type_name = None  # String  xtp开平方向名称                                             "开"
        self.xtp_side_type_name = None  # String  xtp交易方向名称                                             "买"
        self.xtp_order_status_name = None  # String  xtp价格类型名称                                             "限价"
        self.volume_condition_name = None  # String  成交量类型名称                                              "任何数量" "最小数量" "全部数量"
        self.time_condition_name = None  # String  成交时间类型名称                                            "立即完成" "本节有效"  "当日有效" "指定日期前有效" "撤销前有效" "集合竞价有效"
        self.traffic_name = None  # String  业务渠道名称                                                "策略"    
```
### `成交回报-Trade`
成交回报
```python
class Trade():
    def __init__(self):
        self.rcv_time = None  # String	数据接收时间                                              "20200608140053830"
        self.order_id = None  # String	订单ID（对应xtpid）                    orderXtpId         "36934130021173201"
        self.parent_order_id = None  # String	母单ID                               # runtimeId          "6a1071e1-a94d-11ea-810c-4b25bab2cda3"
        self.trade_time = None  # String	成交时间                              tradeTime          "20200608140053830"
        self.instrument_id = None  # String	合约ID（证券代码）                     ticker              "600000"
        self.exchange_id = Exchange.Unknown  # String	交易所ID                              xtpMarketType转换   "SSE"
        self.account_id = None  # String	账号ID（资金账号）                     userName            "10912133333344"
        self.client_id = None  # String	用户自定义编号                         rowId || orderClientId (rowid优先)  "6a1071e1-a94d-11ea-810c-4b25bab2cda3"
        self.instrument_type = None  # Number	合约类型                              xtpBusinessType转换  InstrumentType.Stock
        self.side = None  # Number	买卖方向                              xtpSideType
        self.offset = None  # Number	开平方向                              xtpPositionEffectType
        self.price = None  # Number	价格                                  price               10.23
        self.volume = None  # Number	数量                                  quantity            100
        self.tax = None  # Number	税                                   todo:
        self.commission = None  # Number	手续费                                todo:
        self.code = None  # String  证券代码.交易所标识                     "600000.SH"

        self.instrument_name = None  # String  合约名称（证券名称）                    tickerName            "浦发银行"
        self.trade_amount = None  # Number  委托金额                              tradeAmount           0
        self.xtp_business_type = None  # String  xtp证券业务类型                        xtpBusinessType       "XTP_BUSINESS_TYPE_CASH"
        self.xtp_market_type = "XTP_MKT_UNKNOWN"  # String  xtp市场类型                            xtpMarketType         "XTP_MKT_SZ_A"

        self.xtp_exec_id = None  # String  成交编号()                            execId                "15790"
        self.xtp_report_index = None  # String  成交序号()                            reportIndex           "6806"
        self.xtp_order_exch_id = None  # String  报单编号 –交易所单号，上交所为空，深交所有此字段 orderExchId     ""
        self.xtp_trade_type = None  # String  成交类型                              tradeType             "1" 代表XTP_TRDT_CASH 现金替代"
        self.xtp_branch_pbu = None  # String  交易所交易员代码                       branchPbu             "13688"

        # 以下为xtp的冗余字段，为了获取xtp的原值
        self.xtp_position_effect_type = None  # String xtp开平方向                  xtpPositionEffectType "XTP_POSITION_EFFECT_OPEN"
        self.xtp_side_type = None  # String  xtp交易方向                            xtpSideType           "XTP_SIDE_BUY"

        # 以下为xtp和alphax枚举值翻译为中文的名称
        self.exchange_id_name = None  # String  交易所名称                                                  "上交所"
        self.instrument_type_name = None  # String  合约类型名称                                                "股票"
        self.side_name = None  # String  买卖方向名称                                                "买"
        self.offset_name = None  # String  开平方向名称                                                "开"
        self.xtp_business_type_name = None  # String  xtp证券业务类型名称                                          "现货"
        self.xtp_market_name = None  # String  xtp市场类型名称                                             "沪市"
        self.xtp_position_effect_type_name = None  # String  xtp开平方向名称                                             "开"
        self.xtp_side_type_name = None  # String  xtp交易方向名称                                             "买"
        self.traffic_name = None  # String  业务渠道名称                                                "策略"
        self.xtp_trade_type_name = None  # String  成交类型名称                                                "现金替代"
        self._rowid = None #String 仅用于内部标识
```
### `行情信息-Quote`
行情信息
```python 
class Quote():
    def __init__(self):
        self.source_id = None  # 柜台ID xtp缺少
        self.trading_day = None  # 交易日 xtp缺少
        self.rcv_time = None  # 数据接收时间 xtp缺少
        self.data_time = None  # 数据生成时间 dataTime
        self.instrument_id = None  # 合约ID ticker
        self.exchange_id = None  # 交易所 exchangeId XTP_EXCHANGE_SH
        self.instrument_type = None  # 合约类型 xtp缺少
        self.pre_close_price = None  # 昨收价 preClosePrice
        self.pre_settlement_price = None  # 昨结价 xtp缺少
        self.last_price = None  # 最新价 lastPrice
        self.volume = None  # 成交数量 qty
        self.turnover = None  # 成交金额 turnover
        self.pre_open_interest = None  # 昨持仓量 xtp缺少
        self.open_interest = None  # 持仓量 xtp缺少
        self.open_price = None  # 今开盘 openPrice
        self.high_price = None  # 最高价 highPrice
        self.low_price = None  # 最低价 lowPrice
        self.upper_limit_price = None  # 涨停板价 upperLimitPrice
        self.lower_limit_price = None  # 跌停板价 lowerLimitPrice
        self.close_price = None  # 收盘价 closePrice
        self.settlement_price = None  # 结算价 xtp缺少
        self.bid_price = None  # 申买价数组 如[11, 10.55, 10, 0, 0, 0, 0, 0, 0, 0] bid
        self.ask_price = None  # 申卖价数组 ask
        self.bid_volume = None  # 申买量数组 如[1000, 14700, 100, 0, 0, 0, 0, 0, 0, 0] bidQty
        self.ask_volume = None  # 申卖量数组 askQty
        self.code = None  # 证券代码.交易所标识 如"600000.SH"
        self.etf_buy_count = 0; # etf申购笔数
        self.etf_buy_qty = 0; # etf申购数量
        self.etf_sell_count = 0; # etf赎回笔数
        self.etf_sell_qty = 0; #etf赎回数量
        # 以下是alphax缺少的
        self.avg_price = None  # 当日均价 alphax缺少
        self.iopv = None  # iopv alphax缺少
        self.instrument_status = None  # 证券状态 如"E110    "详见https://xtp.zts.com.cn/doc/api/FAQ 问题编号64
```
证券instrument_status状态信息：

对于普通股票，具体值如下
第0位：
S=启动（开市前）
C=集合竞价(不分开盘收盘)
T=连续竞价 B=休市 E=闭市 P=停牌 A=盘后交易
V=波段性中断
第1位：
0=不可正常交易，
1=可正常交易，
无意义填空格
第2位：
0=未上市，
1=已上市；
（深交所忽略该字段） 




### `账号资产信息-Assets`
账号资产信息
```python   
class Assets:
    def __init__(self):
        self.banlance = 0   # 当前余额
        self.buying_power = 0   # 可用资金
        self.captial_asset = 0   # 资金资产
        self.deposit_withdraw = 0   # 当天出入金
        self.force_freeze_amount = 0   # 强锁资金
        self.frozen_exec_cash = 0   # 行权冻结资金
        self.frozen_exec_fee = 0   # 行权费用
        self.frozen_margin = 0   # 冻结的保证金
        self.fund_buy_amount = 0   # 累计买入成交证券占用资金
        self.fund_buy_fee = 0   # 累计买入成交交易费用
        self.fund_sell_amount = 0   # 累计卖出成交证券所得资金
        self.fund_sell_fee = 0   # 累计卖出成交交易费用
        self.orig_banlance = 0   # 昨日余额
        self.pay_later = 0   # 垫付资金
        self.preadva_pay = 0   # 预垫付资金
        self.preferred_amount = 0   # 可取资金
        self.security_asset = 0   # 证券资产（保留字段，目前为0）
        self.total_asset = 0   # 总资产(=可用资金 + 持仓市值 + 预扣的资金)
        self.market_value = 0   # 持仓市值
        self.trade_netting = 0   # 当日交易资金轧差
        self.withholding_amount = 0   # XTP系统预扣的资金（包括购买卖股票时预扣的交易资金+预扣手续费）
        self.update_time = ''   # 最后更新时间 smart内部产生
        '''/***************以下为信用资产数据**************/'''
        self.all_asset: 0 #总资产（仅限信用业务）
        self.all_debt: 0 #总负债（仅限信用业务）
        self.guaranty: 0 #两融保证金可用数（仅限信用业务）
        self.line_of_credit: 0 #两融授信额度（仅限信用业务）
        self.maintenance_ratio: 0 #维持担保品比例（仅限信用业务）
        self.remain_amount: 0 #信用账户待还资金（仅限信用业务）
        self.security_interest: 0 #融券合约利息（仅限信用业务）
        self.cash_remain_amt: 0 #融资合约金额（仅限信用业务）
        self.cash_interest: 0 #融资合约利息（仅限信用业务）
        self.extras_money: 0 #融券卖出所得购买货币基金占用金额（仅限信用业务）
```
### `证券信息-Instrument`
证券信息
```python   
class Instrument:
    def __init__(self):
        self.instrument_id = None  # 合约ID(证券代码) ticker
        self.instrument_name = ""  # 证券名称
        self.instrument_type = None  # 证券类型 InstrumentType枚举值  对应smart的securityType
        self.instrument_type_ext = None  # 用于标识具体的证券类型
        self.exchange_id = Exchange.Unknown  # 交易所ID "SZE"
        self.exchange_id_name = None  # 交易所名称
        self.xtp_market_type = None  # 市场ID "XTP_MKT_SZ_A"
        self.name_py = None  # 名称拼音首字母 namePy
        self.price_tick = None  # 最小价格变动单位 priceTick 0.01
        self.precision = None  # 最小价格变动单位精度（小数点后位数） precision
        self.buy_volume_unit = None  # 弃用 最小买入数量 bidQtyUnit 100
        self.sell_volume_unit = None  # 弃用 最小卖出数量 askQtyUnit
        self.bid_volume_unit = None  # 限价买单位 bidQtyUnit
        self.ask_volume_unit = None  # 限价卖单位 askQtyUnit
        self.bid_upper_limit_volume = None  # 限价买上限 bidQtyUpperLimit
        self.bid_lower_limit_volume = None  # 限价买下限 bidQtyLowerLimit
        self.ask_upper_limit_volume = None  # 限价卖上限 askQtyUpperLimit
        self.ask_lower_limit_volume = None  # 限价卖下限 askQtyLowerLimit
        self.market_bid_volume_unit = None  # 市价买单位 marketBidQtyUnit
        self.market_ask_volume_unit = None  # 市价卖单位 marketAskQtyUnit
        self.market_bid_upper_limit_volume = None  # 市价买上限 marketBidQtyUpperLimit
        self.market_bid_lower_limit_volume = None  # 市价买下限 marketBidQtyLowerLimit
        self.market_ask_upper_limit_volume = None  # 市价卖上限 marketAskQtyUpperLimit
        self.market_ask_lower_limit_volume = None  # 市价卖下限 marketAskQtyLowerLimit
        self.pre_close_price = None  # 昨收价 preClosePrice
        self.upper_limit_price = None  # 涨停价 upperLimitPrice
        self.lower_limit_price = None  # 跌停价 lowerLimitPrice
        self.is_registration = None  # 是否注册制 isRegistration
        self.kw = None  # keyword 证券名称删除其中的空格 转换为半角 搜索证券名称模糊匹配使用
        self.code = None  # 证券代码.交易所标识 "600000.SH"
```


### `行情bar信息-Bar`
行情bar信息
```python 
class Bar():
    def __init__(self):
        self.type = None  # 类型 行情类型：bar_1min
        self.code = None  # 证券代码 例如600000.SH
        self.instrument_id = None  # 证券编号
        self.exchange_id = None  # 市场 SZE: 深圳、SSE: 上海
        self.trading_day = None # 交易日
        self.source_id = None # 柜台ID 固定值xtp
        self.start_time = None  # 开始时间
        self.end_time = None  # 结束时间
        self.time_interval= None # 时间间隔 1、5、15等
        self.period= None # 周期 例如1m、5m、1d、1w等
        self.high = None  # 最高价
        self.low = None  # 最低价
        self.open = None  # 开盘价
        self.close = None  # 收盘价
        self.volume = None  # 区间交易量
        self.start_volume = None  # 初始总交易量
        self.turnover = None  # 区间成交金额
        self.start_turnover = None  #初始总成交金额
```
### `分页信息-DataPageInfo`
分页信息
```python 
class DataPageInfo():
    def __init__(self):        
        self.currentPage = None # 当前页码数
        self.data = None# 查询结果集
        self.pageSize = None # 每页记录数
        self.totalCount = None # 总记录数
        self.totalPage = None# 总页数
```
### `查询结构类型-OutFormat`
查询结构类型
```python 
class OutFormat():
    Unknown = "Unknown"  # 未知 
    List = "List"  # list类型
    DataFrame = "DataFrame"  # DataFrame类型
    Ndarray = "Ndarray" #  Ndarray类型
```

### `接口响应错误对象-RspError`
>接口响应错误对象
```python  
class RspError(Exception):
    NOT_SUPPORTED="9000"
    PARSE_ERROR="9999"
    SUCCESS="0000"
    ARGS_ERROR="9001"
    NOT_EXIST="9002"
    RUNTIME_ERROR="9003"

    def __init__(self, rsp):
        self.code = rsp.get("code")
        self.message = rsp.get("message")
```
### `账簿对象-Book`
>策略和账号下的账簿对象
```python  
class Book():
    def __init__(self):        
        self.trading_day = "" #交易日20240605
        self.initial_equity = 0.0 #初始资金
        self.avail = 0.0 #可用资金 
        self.frozen_cash = 0.0 #冻结资金 
        self.intraday_fee = 0.0 #日内费用
        self.accumulated_fee = 0.0 #累计费用
        self.realized_pnl = 0.0 #实现盈亏
        self.avail_td = 0.0 #xtp柜台的可用资金
        self.frozen_cash_td = 0.0 #xtp柜台冻结资金
        self.intraday_fee_td = 0.0 #xtp柜台的日内费用
        self.realized_pnl_td = 0.0 #xtp柜台的实现盈亏
        self.positions =[] #持仓列表Position对象

#账簿持仓对象
class Position():
    def __init__(self):     
        self.instrument_id = "" #证券ID
        self.exchange_id = "" #交易所,参见Exchange
        self.sellable = 0 #可卖数量
        self.volume = 0 #总数量
        self.frozen_total = 0 #冻结总数
        self.frozen_yesterday = 0 #冻结昨仓数量
        self.purchase_redeemable_qty = 0 #可申赎数量
        self.realized_pnl = 0.0 #实现收益
        self.yesterday_volume = 0 #昨仓数量
        self.instrument_type = 1 #证券类型，参见InstrumentType
        self.avg_open_price = 0.0 #平均开仓价
        self.profit_price = 0.0 #盈亏成本价
        self.avg_open_price_td = 0.0 #xtp柜台平均开仓价
        self.profit_price_td = 0.0   #xtp柜台盈亏成本价

```

---

## `工具集合-utils`

utils集合工具对象

### `是否科创板股票-isSTIStock`

> 是否科创板股票

* `instrument_id` String(必填) - 证券代码 如 '600000'

科创板股票返回`True`，否则返回`False`

```python
smart.utils.isSTIStock(instrument_id) # return False
```

### `是否ETF基金-isETF`

> 是否ETF基金

* `instrument_id` String(必填) - 证券代码 如 '600000'

ETF基金返回`True`，否则返回`False`

```python
smart.utils.isETF(instrument_id) # return False
```

### `是否配股代码-isSPO`

> 是否配股代码

* `instrument_id` String(必填) - 证券代码 如 '600036'

配股返回`True`，否则返回`False`

```python
smart.utils.isSPO(instrument_id) # return False
```

### `是否是国债逆回购-isReverseRepo`
> 判断一个证券是否是国债逆回购
* `instrument_id` String(必填) - 证券代码 如 '204001'
* `exchange_id` String(必填) - 交易所id。 "SSE" | "SZE"

是国债逆回购返回`True`，否则返回`False`

```python
smart.utils.isReverseRepo(instrument_id, exchange_id) # return True
```

### `全角转半角-toCDB`
> 将全角字符转换为半角字符
* `text` String(必填) - 要转换的文字

返回值将全角字符转换为半角字符

```python
smart.utils.toCDB("万 科Ａ") # retrun "万 科A"
```

### `对象转字符串-toString`
> 将对象转换为json字符串
* `obj` Object(必填) - 要转换的对象

返回值将对象转换为json字符串

```python
smart.utils.toString(obj) # return "obj对应的json字符串"
```

### `客户端当前日期-getNowFormatDate`

> 得到当前日期的格式化形式。"yyyy-MM-dd"

返回格式化的数据，类型是string

```python
smart.utils.getNowFormatDate() # retrun "2021-03-01"
```

### `盘口最优价格-getBestPrice`

> 获取买盘或者卖盘的盘口最优价格，往最新价格靠近，取有效价格

* `quote` Object(必填) - 行情对象，参考[Quote](#行情信息-quote)对象
* `flag` String(必填) - 盘口。涨停:H；跌停:L；现价:P；买一到买五分别为：B1、B2、B3、B4、B5；卖一到卖五分别为：S1、S2、S3、S4、S5。
返回价格，类型是数字

```python
smart.utils.getBestPrice(quote, flag)
```

### `获取有效申报价格范围-get_limit_price`

> 获取买盘的最高有效申报价或者卖盘的最低有效申报价

* `side` Number(必填) - 买卖方向，参考[Side](#买卖方向-side)枚举值
* `quote` Object(必填) - 行情对象，参考[Quote](#行情信息-quote)对象
* `rate` Number(选填) - 有效申报价格范围，默认值为2（即为2%），可选填不大于2的值如1.8（即为1.8%），若所填超过默认值则按默认值计算
* `units` Number(选填) - 最小价格变动单位的个数，默认值为10，可选填不大于10的值如8，若所填超过默认值则按默认值计算
```js
smart.utils.get_limit_price(side, quote, rate, units)
```

## `缓存-cache`

数据存储工具对象 前台本地存储 无容量限制 可用于记录在客户端的配置信息、程序运行状态的实时记录等

### `赋值-set`

> 赋值，如果之前没有存储过对应的key，则缓存对应的值；如果有相同key，则更新对应的值

* `key` String(必填) - 变量唯一标识符
* `value` any(必填) - 变量值，可以是数字，字符串，对象和数组

```python
smart.cache.set(key, value)
```
### `删除-delete`

> 删除数据存储

* `key` String(必填) - 变量唯一标识符

```python
smart.cache.delete(key)
```

### `数组添加-push`

> 添加数据存储
* `key` String(必填) - 变量唯一标识符
* `value` String(必填) - 变量值

```python
smart.cache.push(key, value)
```
---

## `日志工具-logging`

> logging是软件运行过程中输出的一些信息，客户编写程序需要指定getLogger("user")，输出日志到后缀为_user_py.log的文件。
```python
import logging
logger = logging.getLogger("user")
logger.debug("output information:%s",information) 
```
<style>
td,thead {
  font-size: 12px
}
pre{
    color:#fff;
}
</style>
