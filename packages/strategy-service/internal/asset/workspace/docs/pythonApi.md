---
title: Smart 
---


# <a id="smart">`smart` 全局API入口对象</a>

> sdk中的顶级接口，控制整个组件的交互与运行

全局静态对象，含组件开发所需的API、事件、数据、工具等，smart为可以直接访问对象

**事件回调**

* [on_init](#on-init) - Python策略运行环境初始完成后回调，为了保证程序正常，组件所有代码均在此之后执行
* [on_show](#on-show) - Python组件页面被激活展示时的回调，可以重新申请一些on_hide释放掉的资源
* [on_hide](#on-hide) - Python组件页面被切走时的回调，可以释放一些不必要的资源
* [on_close](#on-close) - Python组件页面被关闭时回调，彻底释放掉组件所有资源

**方法**
* [insert_order](#下单-insert-order) 全局方法下单 <Badge type="warning" text="标准版不支持两融" />
* [cancel_order](#撤单-cancel-order) 全局方法撤单
* [subscribe](#订阅行情-subscribe) 全局方法订阅行情
* [unsubscribe](#取消订阅行情-unsubscribe) 全局方法取消订阅
* [subscribe_index](#订阅指数行情-subscribe-index) 全局方法订阅指数行情
* [unsubscribe_index](#取消订阅指数行情-unsubscribe-index) 全局方法取消订阅指数行情
* [insertAlgoOrder](#下算法单-insertalgoorder) 创建并运行策略 <Badge type="warning" text="标准版不支持" />
* [subscribeETFProfit](#订阅etf折溢价预期利润-subscribeetfprofit) 订阅ETF折溢价预期利润
* [unsubscribeETFProfit](#取消订阅etf折溢价预期利润-unsubscribeetfprofit) 取消订阅ETF折溢价预期利润
* [add_timer](#添加单次定时-add-timer) 添加单次定时
* [clear_timer](#清除单次定时-clear-timer) 清除单次定时
* [add_time_interval](#添加轮询定时-add-time-interval) 添加轮询定时
* [clear_time_interval](#清除轮询定时-clear-time-interval) 清除轮询定时
* [createStrategy](#创建策略实例-createstrategy) 创建一个新的策略 <Badge type="warning" text="标准版不支持" />
* [startStrategy](#运行策略实例-startstrategy) 开始运行策略实例 <Badge type="warning" text="标准版不支持" />
* [submit_source_apply](#券源申请提交-submit-source-apply) 券源申请提交 <Badge type="warning" text="仅支持两融账户" />
* [queryCreditAssets](#查询信用资产信息-querycreditassets) 查询信用资产信息 <Badge type="warning" text="仅支持两融账户" />
* [querySelfSelectStockList](#查询自选股列表-queryselfselectstocklist) 查询自选股列表
* [query_source_quote_list](#查询券源行情-query-source-quote-list) 查询券源行情列表 <Badge type="warning" text="仅支持两融账户" />
* [getInstrument](#查找一个证券-getinstrument) 查找一个证券
* [getETFList](#获取可交易的etf列表-getetflist) 获取可交易的ETF列表
* [getETFBasket](#获取etf成分股列表-getetfbasket) 获取ETF的成分股列表
* [getIPOList](#获取ipo列表-getipolist) 获取IPO列表
* [getBondReverseRepoList](#获取国债逆回购列表-getbondreverserepolist) 获取国债逆回购列表
* [getConvertableBond](#获取可转债信息-getconvertablebond) 获取可转债信息 <Badge type="warning" text="标准版不支持" />
* [getSystemSet](#获取smart系统【设置】中参数-getsystemset) 获取smart系统【设置】中参数
* [registCallableFunction](#注册给js调用的函数-registcallablefunction) 注册给JS调用的函数
* [callJSFunction](#调用js的函数接口-calljsfunction) 调用JS的函数接口
* [notice](#消息提醒-notice) 组件消息推送到全局，如告警
* [subscribe_bar](#订阅bar行情-subscribe-bar) 全局方法订阅bar行情
* [unsubscribe_bar](#取消订阅bar行情-unsubscribe-bar) 全局方法取消订阅bar行情
* [query_bar_today_async](#异步-获取当天任意分钟的bar行情-query-bar-today-async) 全局方法异步-获取当天任意分钟的bar行情
* [query_bar_today](#同步-获取当天任意分钟的bar行情-query-bar-today) 全局方法同步-获取当天任意分钟的bar行情
* [query_bar_async](#异步-获取历史bar数据-query-bar-async) 全局方法异步-查询历史bar数据
* [query_bar](#同步-获取历史bar数据-query-bar) 全局方法同步-查询历史bar数据
* [subscribe_indicator](#通用指标订阅-subscribe-indicator) 全局方法通用指标订阅
* [unsubscribe_indicator](#取消通用指标订阅-unsubscribe-indicator) 全局方法取消通用指标订阅
* [query_market_data_async](#异步-获取市场数据-query-market-data-async) 全局方法异步查询市场数据(ticker行情)
* [query_market_data](#同步-获取市场数据-query-market-data) 全局方法同步查询市场数据(ticker行情)
* [get_trading_day_async](#异步-获取当前交易日及下一交易日-get-trading-day-async) 全局方法异步获取当前交易日及下一交易日
* [get_trading_day](#同步-获取当前交易日及下一交易日-get-trading-day) 全局方法同步获取当前交易日及下一交易日
* [query_data_async](#异步查询数据接口-query-data-async) 全局方法异步查询数据
* [query_data](#同步查询数据接口-query-data) 全局方法同步查询数据
* [query_data_page_async](#异步分页查询数据接口-query-data-page-async) 全局方法异步分页查询数据
* [query_data_page](#同步分页查询数据接口-query-data-page) 全局方法同步分页查询数据
* [add_self_select_stock](#添加自选股-add-self-select-stock) 全局方法添加自选股
* [del_self_select_stock](#删除自选股-del-self-select-stock) 全局方法删除自选股
* [query_etf_purchase_redemption_top_limit](#删除自选股-query-etf-purchase-redemption-top-limit) 全局方法查询 etf 申赎上限
* [close](#关闭当前组件-close) 关闭当前组件
<!-- * [newStrategyInstance](#smart-newstrategyinstance) 创建策略实例 -->
<!-- * [addStrategy](#smart-addstrategy) 登记一个策略 -->
<!-- * modifyStrategy 修改策略 (v1.0.0 暂未实现) -->
<!-- * removeStrategy 删除一个策略 (v1.0.0 暂未实现) -->
<!--* [download](#smart-download) 从服务器下载资源 -->

**属性**

* [current_account](#当前登录的资金账号-current-account) 当前客户端登录的主资金账号
* [account_map](#已登录的资金账号集合-account-map) 当前客户端登录的所有账户集合对象，key为资金账号，value为账号[Account](#资金账户-account)对象
* [strategy_map](#策略集合-strategy-map) 策略集合
* [instrument_list](#证券列表-instrument-list) 所有证券列表
* [instrument_map](#证券索引集合-instrument-map) key为证券代码_市场，方便查找证券
* [instrument_map_by_type](#证券类型集合-instrument-map-by-type) 按证券类型进行区分的证券map列表
* [etf_map](#可交易etf集合-etf-map) 可交易etf集合 
* [reverse_repo_list](#国债逆回购列表-reverse-repo-list) 国债逆回购列表 

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
  |—— <a href="#on-show">on_show(callback)</a> //Python组件页面被激活展示时的回调，可以重新申请一些on_hide释放掉的资源
  |—— <a href="#on-hide">on_hide(callback)</a> //Python组件页面被切走时的回调，可以释放一些不必要的资源
  |—— <a href="#on-close">on_close(callback)</a> //Python组件页面被关闭时回调，彻底释放掉组件所有资源
  |—— <a href='#下单-insert-order'>insert_order</a> //全局方法下单 <Badge type="warning" text="标准版不支持两融" />
  |—— <a href='#撤单-cancel-order'>cancel_order</a> //全局方法撤单
  |—— <a href='#订阅行情-subscribe'>subscribe</a> //全局方法订阅
  |—— <a href='#取消订阅行情-unsubscribe'>unsubscribe</a> //全局方法取消订阅
  |—— <a href='#订阅指数行情-subscribe-index'>subscribe_index</a> //全局方法订阅指数
  |—— <a href='#取消订阅指数行情-unsubscribe-index'>unsubscribe_index</a> //全局方法取消订阅指数
  |—— <a href='#下算法单-insertalgoorder'>insertAlgoOrder </a> //创建并开始运行策略实例 <Badge type="warning" text="标准版不支持" /><!-- 
  |—— <a href='#smart-download'>download</a> //从服务器下载资源 -->
  |—— <a href='#订阅etf折溢价预期利润-subscribeetfprofit'>subscribeETFProfit</a> //订阅ETF折溢价预期利润
  |—— <a href='#取消订阅etf折溢价预期利润-unsubscribeetfprofit'>unsubscribeETFProfit</a> //取消订阅ETF折溢价预期利润<!-- 
  |—— <a href='#smart-newstrategyinstance'>newStrategyInstance</a> //创建策略实例 --><!-- 
  |—— <a href='#smart-addstrategy'>addStrategy</a> //登记一个策略 --><!-- 
  |—— //modifyStrategy //修改策略  1.0.0暂未实现 --><!-- 
  |—— //removeStrategy //删除一个策略 1.0.0暂未实现 -->
  |—— <a href='#添加单次定时-add-timer'>add_timer</a> 添加单次定时
  |—— <a href='#清除单次定时-clear-timer'>clear_timer</a> 清除单次定时
  |—— <a href='#添加轮询定时-add-time-interval'>add_time_interval</a> 添加轮询定时
  |—— <a href='#清除轮询定时-clear-time-interval'>clear_time_interval</a> 清除轮询定时
  |—— <a href='#创建策略实例-createstrategy'>createStrategy </a> //从头创建一个全新的策略 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#运行策略实例-startstrategy'>startStrategy </a> //开始运行策略实例 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#券源申请提交-submit-source-apply'>submit_source_apply</a> //券源申请提交 <Badge type="warning" text="仅支持两融账户" />
  |—— <a href='#查询信用资产信息-querycreditassets'>queryCreditAssets</a> //查询信用资产信息 <Badge type="warning" text="仅支持两融账户" />
  |—— <a href='#查询自选股列表-queryselfselectstocklist'>querySelfSelectStockList</a> //查询自选股列表
  |—— <a href='#查询券源行情-query-source-quote-list'>query_source_quote_list</a> //查询券源行情列表 <Badge type="warning" text="仅支持两融账户" />
  |—— <a href='#查找一个证券-getinstrument'>getInstrument</a> //查找一个证券
  |—— <a href='#获取可交易的etf列表-getetflist'>getETFList</a> //获取可交易的ETF列表
  |—— <a href='#获取etf成分股列表-getetfbasket'>getETFBasket</a> //获取ETF的成分股列表
  |—— <a href='#获取ipo列表-getipolist'>getIPOList</a> //获取IPO列表
  |—— <a href='#获取国债逆回购列表-getbondreverserepolist'>getBondReverseRepoList</a> //获取国债逆回购列表
  |—— <a href='#获取可转债信息-getconvertablebond'>getConvertableBond</a> //获取可转债信息 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#获取smart系统【设置】中参数-getsystemset'>getSystemSet</a> //获取smart系统【设置】中参数<!-- 
  |—— <a href='#opensystemset'>openSystemSet</a> //打开smart系统【设置】菜单-->
  |—— <a href='#消息提醒-notice'>notice</a> //推送全局消息，通知消息提醒
  |—— <a href='#订阅bar行情-subscribe-bar'>subscribe_bar</a> //全局方法订阅bar行情
  |—— <a href='#取消订阅bar行情-unsubscribe-bar'>unsubscribe_bar</a> //全局方法取消订阅bar行情
  |—— <a href='#异步-获取当天任意分钟的bar行情-query-bar-today-async'>query_bar_today_async</a> //全局方法异步-获取当天任意分钟的bar行情
  |—— <a href='#同步-获取当天任意分钟的bar行情-query-bar-today'>query_bar_today</a> //全局方法同步-获取当天任意分钟的bar行情
  |—— <a href='#异步-获取历史bar数据-query-bar-async'>query_bar_async</a> //全局方法异步-获取历史bar数据
  |—— <a href='#同步-获取历史bar数据-query-bar'>query_bar</a> //全局方法同步-获取历史bar数据
  |—— <a href='#通用指标订阅-subscribe-indicator'>subscribe_indicator</a> //全局方法全局方法通用指标订阅
  |—— <a href='#取消通用指标订阅-unsubscribe-indicator'>unsubscribe_indicator</a> //全局方法取消通用指标订阅
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
  |—— <a href='#查询 etf 申赎上限-query-etf-purchase-redemption-top-limit '>query_etf_purchase_redemption_top_limit  </a> //全局方法查询 etf 申赎上限 <Badge type="warning" text="标准版不支持" />
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
  |—— <a href="#国债逆回购列表-reverse-repo-list">reverse_repo_list</a> //国债逆回购列表（全局静态数据）
  |      |—— <a href="#证券信息-instrument">Instrument</a> 证券对象
  |       		|—— 各种instrument属性<!--
  |—— <a href="#alphax-td-list">alphax_td_list</a> alphax的实时td列表
  |—— <a href="#alphax-md-list">alphax_md_list</a> alphax的实时md列表  -->
  |—— <a href="#策略集合-strategy-map">strategy_map</a> 所有当前客户端登录的账号下的策略列表的集合 <Badge type="warning" text="标准版不支持" />
  |—— <a href='#已登录的资金账号集合-account-map'>account_map</a> 当前客户端登录的所有账户集合对象，key为资金账号，value为账号对象
  |      |—— '1090000000001':<a href="#资金账户-account">account</a> 账号对象
  |     		    |—— account_id //资金账号
  |     		    |—— nick_name //资金账号的昵称
  |     		    |—— isLevel2 //是否是level2
  |     		    |—— exchange_right //沪深交易权限
  |     		    |—— account_type //账户类型 AccountType
  |     		    |—— source //账户的柜台类型<!--
  |     		    |—— <a href='#alphax-td-status'>alphax_td_status</a> //alphax td的实时运行状态
  |     		    |—— <a href='#alphax-md-status'>alphax_md_status</a> //alphax md的实时运行状态 
  |     		    |—— ipo_list //该账号的打新列表 账号相关-->
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
  |     		    |—— <a href='#account-subscribe-index'>subscribe_index</a>  //订阅指数行情
  |     		    |—— <a href='#account-unsubscribe-index'>unsubscribe_index</a> //取消订阅指数行情<!-- 
  |     		    |—— <a href='#account-newstrategyinstance'>newStrategyInstance</a> //创建策略实例
  |     		    |—— <a href='#account-addstrategy'>addStrategy</a> //登记一个策略
  |     		    |—— <a href='#account-modifystrategy'>modifyStrategy</a> //修改策略
  |     		    |—— <a href='#account-removestrategy'>removeStrategy</a> //删除一个策略 -->
  |     		    |—— <a href='#account-on-quote'>on_quote</a>(<a href='#行情信息-quote'>quote</a>=>{})  //行情变化推送
  |     		    			   |—— 各种Quote对象属性
  |     		    |—— <a href='#account-on-order'>on_order</a>(<a href='#委托回报-order'>order</a>=>{})  //委托变化推送
  |     		    |—— <a href='#account-on-cancel-fail'>on_cancel_fail</a>(fail=>{}) //撤单失败的消息推送 
  |     		    |—— <a href='#account-on-trade'>on_trade</a>(<a href='#成交回报-trade'>trade</a>=>{})  //成交推送 
  |     		    |—— <a href='#account-on-position'>on_position</a>(<a href='#持仓-position'>position</a>=>{})  //账户持仓变化的增量推送
  |     		    |—— <a href='#account-on-assets'>on_asstes</a>(<a href='#账号资产信息-assets'>assets</a>=>{})  //账户资金的推送
  |     		    |—— <a href='#account-on-credit-ticker-assign'>on_credit_ticker_assign</a>(<a href='#信用可融券头寸信息-credittickerassigninfo'>creditTickerAssignInfo</a>=>{})  //信用可融券头寸信息的推送 <Badge type="warning" text="仅支持两融账户" />
  |     		    |—— <a href='#account-on-credit-debt-finance'>on_credit_debt_finance</a>(<a href='#信用融资负债信息-creditdebtfinance'>creditDebtFinance</a>=>{})  //信用融资负债信息的推送 <Badge type="warning" text="仅支持两融账户" />
  |     		    |—— <a href='#account-on-credit-debt-security'>on_credit_debt_security</a>(<a href='#信用融券负债信息-creditdebtsecurity'>creditDebtSecurity</a>=>{})  //信用融券负债信息的推送 <Badge type="warning" text="仅支持两融账户" />
  |     		    |—— <a href='#account-submit-source-apply'>submit_source_apply</a>()  //提交券源申请 <Badge type="warning" text="仅支持两融账户" />
  |     		    |—— <a href='#account-createstrategy'>createStrategy</a>()  // 创建一个新的策略 <Badge type="warning" text="标准版不支持" />
  |     		    |—— <a href='#account-querycreditassets'>queryCreditAsset</a>() //查询信用资产信息 <Badge type="warning" text="仅支持两融账户" />
  |     		    |—— <a href='#account-strategy-map'>strategy_map</a>  //代表该资金账号的策略集合 key为strategy_id+'_'+StrategyPlatformType value为strategy对象 <Badge type="warning" text="标准版不支持" />
  |     		    	    |—— '网格交易001'+'_Algo':<a href='#策略对象-strategy'>strategy</a>
  |     		    		    		|—— strategy_id //策略id
  |     		    		    		|—— strategy_platform_type //策略平台类型 <a href='#策略平台类型-strategyplatformtype'>StrategyPlatformType枚举</a> 
  |     		    		    		|—— //parent_order_id //母单编号  1.0.0暂未实现
  |     		    		    		|—— status //策略状态 
  |     		    		    		|—— status_name //策略状态中文
  |     		    		    		|—— isPrivate   //是否是私有策略 
  |     		    		    		|—— round_list 轮次列表 策略每start一次为一个round
  |     		    		    		|          |—— <a href='#策略的轮次信息-round'>Round</a> 轮次信息
  |     		    		    		|                 |—— 各种轮次信息的属性
  |     		    		    		|—— last_round 最新的一个轮次<a href='#策略的轮次信息-round'>Round</a>对象
  |     		    		    		|—— //book //实时策略账簿 目前仅对AlphaX有效
  |     		    		    		|—— <a href='#strategy-strategy-position-list'>strategy_position_list</a> //实时策略持仓列表，元素为<a href='#持仓-position'>Position</a>对象
  |     		    		    		|—— <a href='#strategy-strategy-order-list'>strategy_order_list</a> //实时策略委托确认列表，元素为<a href='#委托回报-order'>Order</a>对象
  |     		    		    		|—— <a href='#strategy-strategy-trade-list'>strategy_trade_list</a> //实时策略成交回报列表，元素为<a href='#成交回报-trade'>Trade</a>对象
  |     		    		    		|—— <a href='#strategy-relation-account-map'>relation_account_map</a> //一个策略操作多个账户时使用，value为<a href='#资金账户-account'>Account</a>对象
  |     		    		    		|                      //可通过addAccount添加，每次策略启动都要动态添加
  |     		    		    		|		|—— '1090000000001':<a href='#资金账户-account'>account</a> 当前登录账号对象引用
  |     		    		    		|					|—— 该账号在策略创建时就自动挂载relation_account_map下
  |     		    		    		|					|—— 策略与账户委托的订单互相不相关
  |     		    		    		|					|—— 订阅行情通过account.subscribe及account.addEventListener添加一个本策略的处理函数
  |     		    		    		|					|—— 该账号下的数据、事件、接口均可用
  |     		    		    		|		|—— '1090000000002':account 账号对象引用
  |     		    		    		|					|—— 需要通过addAccount添加，该账号下也有了本策略对象
  |     		    		    		|					|—— 下账号级别单，通过该account.insert_order本策略on_order不会收到
  |     		    		    		|					|—— 相同的柜台，如果一个账号已经订阅了行情，另一个账号无需再订阅，这里可用于不同柜台如期货
  |     		    		    		|					|—— 该账号下的数据、事件、接口均可用 <!-- 
  |     		    		    		|—— //<a href='#strategy-addaccount'>addAccount</a> //添加资金账号，添加后策略就能收到这个账号的订阅、order、trade，该账号也被同步加入smart.accountMap中，1.0.0暂未实现
  |     		    		    		|—— //<a href='#strategy-removeaccount'>removeAccount</a> //解除策略与资金账号绑定关系，策略无法收到该账户的订阅、order、trade，该账号从smart.accountMap删除，1.0.0暂未实现
  |     		    		    		|                 //并不是真的删除了物理资金账号，只是解除了与策略的关系，也解除了与当前账号的关系
  |     		    		    		|—— //uploadFile //上传策略文件，1.0.0暂未实现 -->
  |     		    		    		|—— <a href='#strategy-startstrategy'>startStrategy</a> //启动策略 
  |     		    		    		|—— <a href='#strategy-stopstrategy'>stopStrategy</a> //停止策略 
  |     		    		    		|—— <a href='#strategy-forcestopstrategy'>forceStopStrategy</a> /强制停止策略  <!-- 
  |     		    		    		|—— <a href='#strategy-poststrategyparamsbeforestart'>postStrategyParamsBeforeStart</a> //策略启动前传参
  |     		    		    		|—— <a href='#strategy-poststrategyparams'>postStrategyParams</a> //策略运行期间向策略透传通用参数
  |     		    		    		|—— <a href='#strategy-download'>download</a> //将后台的策略参数下载到前台
  |     		    		    		|—— <a href='#strategy-on-alphax-msg'>on_alphax_msg</a> //接收后端功夫策略的自定义消息推送
  |     		    		    		|—— //modifyStrategyBook //修改某策略的book账簿数据，1.0.0暂未实现
  |     		    		    		|—— //modifyStrategyPosition //修改某策略的持仓数据，1.0.0暂未实现
  |     		    		    		|—— //setCommission //设置费率，1.0.0暂未实现
  |     		    		    		|—— //subscribeStrategyLog //订阅策略日志并接受实时变动，1.0.0暂未实现
  |     		    		    		|—— //unsubscribeStrategyLog //取消订阅策略日志并取消实时变动，1.0.0暂未实现
  |     		    		    		|—— //getStrategyLogContent //取的日志N行内容，1.0.0暂未实现
  |     		    		    		|—— //throwStrategyException //抛出异常通知 on_strategy_exception会被触发，仅Front前台策略使用，1.0.0暂未实现 
  |     		    		    		|—— <a href='#strategy-starttd'>startTD</a> //启动TD进程，AlphaX专用
  |     		    		    		|—— <a href='#strategy-startmd'>startTD</a> //启动MD进程，AlphaX专用 -->
  |     		    		    		|—— <a href='#strategy-on-strategy-quote'>on_strategy_quote</a>(<a href='#行情信息-quote'>quote</a>=>{}) //1.0.0暂未实现，某策略订阅的行情推送，策略之间、组件之间、策略和账户直接的订阅和取消订阅不相互影响
  |     		    		    		|—— <a href='#strategy-on-order'>on_order</a>(<a href='#委托回报-order'>order</a>=>{}) //某策略的委托变化推送 
  |     		    		    		|—— <a href='#strategy-on-trade'>on_trade</a>(<a href='#成交回报-trade'>trade</a>=>{}) //某策略的成交回报推送<!--
  |     		    		    		|—— <a href='#strategy-on-position'>on_position</a>(<a href='#持仓-position'>position</a>=>{}) //某策略持仓增量变化推送-->
  |     		    		    		|—— //on_book //某策略账簿变化推送，目前仅对AlphaX有效 <!--
  |     		    		    		|—— <a href='#strategy-on-book'>on_book</a>(<a href='#book'>book</a>=>{})   //某策略账簿变化推送 1.0.0暂未实现
  |     		    		    		|—— <a href='#strategy-on-strategy-cancel-fail'>on_strategy_cancel_fail</a>(fail=>{}) //某策略撤单失败消息推送
  |     		    		    		|—— <a href='#strategy-on-alphax-msg'>on_alphax_msg</a>(fail=>{}) //alphax 策略往前端推送数据 -->
  |     		    		    		|—— <a href='#strategy-on-strategy-status-change'>on_strategy_status_change</a>(fail=>{}) //策略进程状态变化推送 <!--
  |     		    					|—— //on_strategy_upload_result //某策略上传结果消息推送，1.0.0暂未实现
  |     		    					|—— //on_strategy_start_result //某策略启动结果消息推送，1.0.0暂未实现
  |     		    					|—— //on_strategy_stop_result //某策略停止结果消息推送，1.0.0暂未实现
  |     		    					|—— //on_strategy_force_stop_result //某策略强制停止消息推送，1.0.0暂未实现
  |     		    					|—— //on_strategy_exception //某策略运行中的异常消息，如td、md断线，程序异常等，1.0.0暂未实现
  |     		    					|—— //on_strategy_log //某策略log日志发生变化时，1.0.0暂未实现
  |     		    					|—— //on_strategy_pre_start //后台策略pre_start后触发或前台策略start后触发，1.0.0暂未实现
  |     		    					|—— //on_strategy_post_start //后台策略post_start后或前台策略pre_start后触发，1.0.0暂未实现
  |     		    					|—— //on_strategy_pre_stop //后台策略pre_stop后或前台策略stop前触发，1.0.0暂未实现 -->
  |     		    		    		|—— //insert_order //策略级别的下单，入参要有account_id，strategy_platform_type、strategy_id选填，1.0.0暂未实现 
  |     		    		    		|—— //cancel_order //策略级别的撤单，入参要有account_id，1.0.0暂未实现
  |     		    		    		|—— //subscribe //策略级别订阅，入参要有account_id，1.0.0暂未实现
  |     		    		    		|—— //unsubscribe //策略级别取消订阅，入参要有account_id，1.0.0暂未实现
  |—— <a href='#事件-event'>Event</a> 所有事件的枚举
  |      |—— ON_INIT //组件初始化
  |      |—— ON_CLOSE //组件被关闭
  |      |—— ON_SHOW //组件被显示
  |      |—— ON_HIDE //组件被隐藏
  |      |—— ON_RESET //组件用户数据被清空重置 
  |      |—— ON_QUOTE //订阅行情后，行情变化推送
  |      |—— ON_ORDER //委托变化推送
  |      |—— ON_TRADE //成交变化推送
  |      |—— ON_CANCEL_FAIL //撤单失败的消息推送
  |      |—— ON_POSITION //账户持仓变化的增量推送
  |      |—— ON_ASSETS  //账户资金的全量推送<!--
  |      |—— ON_BOOK //某策略资金的全量推送
  |      |—— ON_STRATEGY_CANCEL_FAIL //某策略撤单失败消息推送
  |      |—— ON_STRATEGY_UPLOAD_RESULT  //某策略上传结果事件
  |      |—— ON_STRATEGY_FORCE_STOP_RESULT //某策略强制停止结果消息
  |      |—— ON_STRATEGY_EXCEPTION  //某策略运行中的异常消息，如td、md断线，程序异常等
  |      |—— ON_STRATEGY_LOG  //某策略log日志发生变化时的增量变化消息
  |      |—— ON_STRATEGY_PRE_START  //后台组件的策略pre_start完成后触发
  |      |—— ON_STRATEGY_POST_START  //后台组件的策略post_start完成后触发
  |      |—— ON_STRATEGY_PRE_STOP  //后台组件的策略pre_stop完成后触发 -->
  |      |—— ON_STRATEGY_STATUS_CHANGE  //策略状态变化时推送 <!--
  |      |—— ON_ALPHAX_TD_STATUS_CHANGE //alphax td状态变化时推送
  |      |—— ON_ALPHAX_MD_STATUS_CHANGE //alphax md状态变化时推送
  |      |—— ON_ALPHAX_MSG //alphax 策略往前端推送数据 -->
  |      |—— ON_ETF_PROFIT //ETF 折溢价利润推送数据ETFProfit
  |      |—— ON_ETF_RATE_UPDATE //ETF 更新ETF套利/交易费用设置通知
  |      |—— ON_SYSTEM_SET_UPDATE //更新系统全局常用设置项通知
  |      |—— ON_CREDIT_TICKER_ASSIGN //更新信用账户可融券头寸信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— ON_CREDIT_DEBT_FINANCE //更新融资负债合约信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— ON_CREDIT_DEBT_SECURITY //更新融券负债合约信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— ON_BAR //订阅bar行情后，bar行情变化推送
  |      |—— ON_INDICATOR //订阅通用指标后，数据变化推送
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
  |      |—— <a href="#策略平台类型-strategyplatformtype">StrategyPlatformType</a> 策略平台类型 <Badge type="warning" text="标准版不支持" />
  |      |		|—— Front //客户端直接运行的js前端策略
  |      |		|—— Algo  //算法平台 
  |      |		|—— AlphaX  //AlphaX即功夫
  |      |		|—— ProgramTrade  //程序化交易，客户自己的程序化
  |      |		|—— Spec  //特定平台，按ProgramTrade相同的逻辑处理，1.0.0未写入文档
  |      |		|—— FrontPy  //客户端Python策略类型
  |      |—— <a href="#etf配方表-etf">ETF</a> 某ETF配方表明细对象定义
  |      |—— <a href="#持仓-position">Position</a> 持仓对象定义
  |      |—— <a href="#委托回报-order">Order</a> 委托确认对象定义
  |      |—— <a href="#成交回报-trade">Trade</a> 成交回报对象定义
  |      |—— <a href="#行情信息-quote">Quote</a>  行情信息对象定义
  |      |—— <a href="#证券信息-instrument">Instrument</a> 证券对象定义 <!--
  |      |—— <a href="#策略的轮次信息-round">Round</a> 策略执行的轮次信息对象定义 --><!--
  |      |—— <a href="#策略执行状态-strategystatus">StrategyStatus</a> 策略执行状态-->
  |      |—— <a href="#新股信息-ipo">IPO</a> 新股信息
  |      |—— <a href="#可转债信息-convertablebond">ConvertableBond</a> 可转债信息
  |      |—— <a href="#信用可融券头寸信息-credittickerassigninfo">CreditTickerAssignInfo</a> 信用可融券头寸信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— <a href="#信用融资负债信息-creditdebtfinance">CreditDebtFinance</a> 信用融资负债信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— <a href="#信用融券负债信息-creditdebtsecurity">CreditDebtSecurity</a> 信用融券负债信息 <Badge type="warning" text="仅支持两融账户" />
  |      |—— <a href="#券源行情信息-sourcequoteinfo">SourceQuoteInfo</a> 券源行情信息 <Badge type="warning" text="仅支持两融账户" />
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
  
  <!-- 
  |—— <a href='#logger'>logger</a> 日志工具对象
        |—— debug
        |—— info
        |—— warning
        |—— warn
        |—— log
        |—— error
        |—— exception
        |—— critical-->
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

### `on_show`

> Python组件页面被激活展示时的回调，可以重新申请一些on_hide释放掉的资源

```python
def show():
    logger.debug("show")
smart.on_show(show)
# 或者 emitter 写法
smart.on(smart.Event.ON_SHOW, show)
```

### `on_hide`

> Python组件页面被切走时的回调，可以释放一些不必要的资源

```python
def hide():
    logger.debug("hide")
smart.on_hide(hide)
# 或者 emitter 写法
smart.on(smart.Event.ON_HIDE, hide)
```

## smart对象下的全局方法

### `下单-insert_order` <Badge type="warning" text="标准版不支持两融" />
[普通下单示例](../example/pythonApiExample.md#委托下单)  
[国债逆回购下单示例](../example/pythonApiExample.md#国债逆回购下单)  
[两融下单示例](../example/pythonApiExample.md#两融业务下单)  <Badge type="warning" text="标准版不支持两融" />

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

### `撤单-cancel_order`
[委托撤单示例](../example/pythonApiExample.md#委托撤单)

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

### `订阅行情-subscribe`
[订阅行情及接收行情推送示例](../example/pythonApiExample.md#订阅行情及接收行情推送)

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

### `取消订阅行情-unsubscribe`
[取消订阅行情示例](../example/pythonApiExample.md#订阅行情及接收行情推送)  

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

### `订阅指数行情-subscribe_index`
[订阅指数行情及接收指数行情推送示例](../example/pythonApiExample.md#订阅指数行情及接收指数行情推送)

> 订阅指数行情。指数行情变化时`smart`会派发`ON_QUOTE`事件，通过smart.on(smart.Event.ON_QUOTE, on_quote_callback)监听指数行情变化。
> 指数行情、股票行情都从`ON_QUOTE`事件返回，可以通过返回quote对象的instrument_type属性进行两种行情的区分。

* `account_id` 选填 账号id，默认为当前账号id
* `instruments` 必填 订阅的指数列表 数组 如["000001", "CESCPD", "931646"]
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `emitter` 选填 注册行情派发事件对象,默认为全局smart对象
* `callback` 选填 订阅后的数据或错误返回信息参数(quoteList,[err](#接口响应错误对象-rsperror)),quoteList只是订阅成功的结果，后续行情变化将随行情事件推送，详见示例
```python
smart.subscribe_index(instruments=["000001", "CESCPD", "931646"])
def on_quote_callback(quote):
    if quote.instrument_type == smart.Type.InstrumentType.Index:
        logger.debug(f"{smart.utils.toString(quote)}")
smart.on(smart.Event.ON_QUOTE, on_quote_callback)
```

### `取消订阅指数行情-unsubscribe_index`
[取消订阅指数行情示例](../example/pythonApiExample.md#订阅指数行情及接收指数行情推送)  

> 取消订阅指数行情
* `account_id` 选填 账号id，默认为当前账号id
* `instruments` 必填 订阅的股票列表 数组 如["000001", "CESCPD", "931646"]
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `emitter` 选填 注册行情派发事件对象,默认为全局smart对象
```python
smart.unsubscribe_index(instruments=["000001", "CESCPD", "931646"])
```

### `下算法单-insertAlgoOrder` <Badge type="warning" text="标准版不支持" />
[快速启动算法策略示例](../example/pythonApiExample.md#快速启动算法策略)

>创建并开始运行策略实例
* `account_id` String(选填) -  账号id，默认为当前账号id
* `strategy_id` String(必填) - 策略id 
* `config` String(必填) - 策略信息对象
* `insertAlgoOrderCallback` Function(必填) - 返回母单信息(strategy,[err](#接口响应错误对象-rsperror))

```python
def insertAlgoOrderCallback(strategy,err):
    if(err):
        logger.debug("get error from insertAlgoOrder:%s",err)
    else:
        logger.debug("insertAlgoOrder【OK】:%s",strategy)
smart.insertAlgoOrder(account_id, strategy_id, config, insertAlgoOrderCallback)
```

### `订阅ETF折溢价预期利润-subscribeETFProfit`
[订阅ETF折溢价预期利润示例](../example/pythonApiExample.md#订阅及取消订阅etf折溢价预期利润)  

> 订阅ETF折溢价预期利润，等待返回预期利润列表信息。此后ETF预期利润变动后，会通过事件 ON_ETF_PROFIT 派发订阅预期利润信息[ETFProfit](#etf预期利润-etfprofit)
* `etfProfitCB` Function 必填 - 订阅ETF折溢价预期利润的回调，返回预期利润列表信息(profitList,[err](#接口响应错误对象-rsperror))
```python
def etfProfitCB(arr,err):
    if(err):
        logger.debug("get error from subscribeETFProfit:%s",err)
    else:
        for i in range(len(arr)):
            if ((i+1)==len(arr)):
                logger.debug("subscribeETFProfitTest【OK】:%s",str(arr[i]))
smart.subscribeETFProfit(etfProfitCB)   #订阅并返回ETF预期利润等信息
```

### `取消订阅ETF折溢价预期利润-unsubscribeETFProfit`
[取消订阅ETF折溢价预期利润示例](../example/pythonApiExample.md#订阅及取消订阅etf折溢价预期利润) 

> 取消订阅ETF折溢价预期利润
```python
smart.unsubscribeETFProfit()
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

### `创建策略实例-createStrategy` <Badge type="warning" text="标准版不支持" />
[创建及启动算法策略示例](../example/pythonApiExample.md#创建及启动算法策略)

>创建一个全新的策略实例
* `account_id` String(选填) - 账号id，默认为当前账号id
* `strategy_platform_type` String(必填) - 策略平台类型 [StrategyPlatformType](#策略平台类型-strategyplatformtype) 的枚举值
* `strategy_id` String(必填) - 策略id 可以含中文，为了防止冲突，尽量特殊些，不要用"网格交易"这种很通用的命名，很容易冲突
* `config` String(必填) - 母单下单参数，[config参数参考文档](../../../res/algox_params.xlsx)
    - "strategyType": AlgoX算法编号，在表格 `算法类型-展示名称表`中选择，如选择 "3101"
    - "clientStrategyId": 生成的策略ID是随机数，如str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000)))
    - "strategyParam": JSON格式的策略参数，在表格 `算法总线参数类型`中选择，策略参数包含
        - "quantity":数量，如1600
        - "side":方向，如"BUY"
        - "ticker":代码，如"000001"
        - "market":市场，如"SZ"
        - "limit_action":涨跌停动作，如False
        - "start_time":开始时间，如"09:55:00"
        - "end_time":结束时间，如"15:00:00"
        - "expire_action":结束时间动作，如False
        - "price":价格，如0,
        - "buyDateTime":购买时间，如["14:55","14:55"]
        - "loadtime":1650783403107,
        - "business_type":下单类型，如"CASH",
        - "task_type":任务类型，根据算法要求填写，"KFTWAP"
* `createStrategyCallback` Function(必填) - 返回策略信息对象(strategy,[err](#接口响应错误对象-rsperror))
```python
def createStrategyCallback(strategy,err):
    if(err):
        logger.debug("get error from createStrategy:%s",err)
    else:
        logger.debug("createStrategyCallback:%s",strategy)
smart.createStrategy(account_id, strategy_platform_type, strategy_id, config, createStrategyCallback)
```

### `运行策略实例-startStrategy` <Badge type="warning" text="标准版不支持" />
[创建及启动算法策略示例](../example/pythonApiExample.md#创建及启动算法策略)

>开始运行策略实例
* `account_id` String(选填) -  账号id，默认为当前账号id
* `strategy_platform_type` String(必填) - 策略平台类型 [StrategyPlatformType](#策略平台类型-strategyplatformtype) 的枚举值
* `clent_id` String(必填) - 策略实例的ID或客户下单唯一ID
* `startStrategyCallback` Function(必填) - 返回母单信息(strategy,[err](#接口响应错误对象-rsperror))

```python
def startStrategyCallback(strategy,err):
    if(err):
        logger.debug("get error from startStrategy:%s",err)
    else:
        logger.debug("startStrategy【OK】:%s",strategy)
smart.startStrategy(account_id, strategy_platform_type, clent_id, startStrategyCallback)
```

### `券源申请提交-submit_source_apply` <Badge type="warning" text="仅支持两融账户" />
[提交券源申请示例](../example/pythonApiExample.md#提交券源申请)

>券源申请提交
* `account_id` String(选填) - 资金账号，默认为当前账号id
* `sourceQuoteApplyList` String(必填) - 券源行情申请列表
* `submitSourceApplyCB(suclist<SourceQuoteInfo>,err )` Function(必填) - 券源申请提交的回调，suclist为券源申请成功的列表信息，若[err](#接口响应错误对象-rsperror)有值，则券源申请失败的列表信息在err.value
```python  
def submitSourceApplyCB(suclist,err):
    if err: #券源申请推送:存在失败
        errList =  [] if type(err)!= dict or not 'value' in err.keys() else err["value"]
        if errList: #券源申请推送：失败数据
            for i in range(len(errList)):
                logger.debug("submitSourceApplyCB【error】:%s",smart.utils.toString(errList[i]))  
        if suclist:#券源申请推送：成功数据
            for i in range(len(suclist)):
                logger.debug("submitSourceApplyCB【success】:%s",smart.utils.toString(suclist[i]))                
    else: #券源申请推送全部成功
        if suclist:#券源申请推送：成功数据
            for i in range(len(suclist)):
                logger.debug("submitSourceApplyCB【success】:%s",smart.utils.toString(suclist[i]))
smart.submit_source_apply(account_id,sourceQuoteApplyList,submitSourceApplyCB)
```

### `查询信用资产信息-queryCreditAssets` <Badge type="warning" text="仅支持两融账户" />
[查询信用资产信息示例](../example/pythonApiExample.md#查询信用资产信息)

>查询信用资产信息
* `account_id` String(选填) - 账号id，默认为当前账号id
* `queryCreditAssetsCB` Function(必填) - 查询信用资产信息的回调，返回信用资产信息(data,[err](#接口响应错误对象-rsperror))
```python
def queryCreditAssetsCB(data,err):
    if(data):logger.debug("get queryCreditAssets:%s",smart.utils.toString(data))
    if(not data):logger.debug("get queryCreditAssets FAIL:%s",err.message)
smart.queryCreditAssets(account_id, queryCreditAssetsCB)
```

### `查询自选股列表-querySelfSelectStockList`
[查询自选股列表示例](../example/pythonApiExample.md#查询自选股列表)
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

### `查询券源行情-query_source_quote_list` <Badge type="warning" text="仅支持两融账户" />
[查询券源行情示例](../example/pythonApiExample.md#查询券源行情)

>查询券源行情
* `querySourceQuoteListCB(list<SourceQuoteInfo>,err)` Function(必填) - 查询券源行情列表的回调，获取券源行情列表信息，获取失败会返回[err](#接口响应错误对象-rsperror)
```python  
def querySourceQuoteListCB(sourceQuoteList,err):
    if(err):
        logger.debug("get error from sourceQuoteList:%s",err)
    else:
        logger.debug("sourceQuoteList【OK】:%d",len(sourceQuoteList))
smart.query_source_quote_list( querySourceQuoteListCB)
```

### `查找一个证券-getInstrument`
[查询证券信息示例](../example/pythonApiExample.md#查询证券信息根据证券代码和交易所)
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

### `获取可交易的ETF列表-getETFList`
[查询可交易的etf列表示例](../example/pythonApiExample.md#查询可交易的etf列表)
> 获取可交易的ETF列表
* `getETFListCB` Function(必填) - 获取ETF列表的回调，返回ETF列表信息(arr,[err](#接口响应错误对象-rsperror))
```python
def getETFListCB(arr,err):
    if(err):
        logger.debug("get error from getETFList:%s",err)
    else:
        logger.debug("get getETFList:%s",smart.utils.toString(arr))
smart.getETFList(getETFListCB) 
```

### `获取ETF成分股列表-getETFBasket`
[查询etf成分股列表示例](../example/pythonApiExample.md#查询etf成分股列表)
> 获取ETF成分股列表
* `instrument_id` String(必填) - ETF代码
* `getETFBasketCB(list<ETFCompoment>,err )` Function(必填) - 获取ETF成分股列表的回调，返回ETF成分股列表信息(instrumentList,[err](#rsperror))
      
```python
def getETFBasketCB(instrumentList,err):
    if(err):
        logger.debug("get error from getETFBasket:%s",err)
    else:
        logger.debug("get getETFBasket: %d",len(instrumentList))
smart.getETFBasket(instrument_id,getETFBasketCB)
```

### `获取IPO列表-getIPOList`
[查询可交易的ipo列表示例](../example/pythonApiExample.md#查询可交易的ipo列表)
> 获取IPO列表
* `getIPOListCB` Function(必填) - 获取IPO列表的回调，返回IPO列表信息(instrumentList,[err](#接口响应错误对象-rsperror))
```python
def getIPOListCB(instrumentList,err):
    if(err):
        logger.debug("get error from getIPOList:%s",err)
    else:   
        logger.debug("get getIPOListCB: %d",len(instrumentList))
smart.getIPOList(getIPOListCB)
```

### `获取国债逆回购列表-getBondReverseRepoList`
[查询国债逆回购列表示例](../example/pythonApiExample.md#查询国债逆回购列表)
> 获取国债逆回购列表
* `getBondReverseRepoListCB` Function(必填) - 获取国债逆回购列表回调，国债逆回购列表(instrumentList,[err](#接口响应错误对象-rsperror))
```python
def getBondReverseRepoListCB(instrumentList,err):
    if(err):
        logger.debug("get getBondReverseRepoList error:%d,%s",err.code,err.message)
    else:   
        logger.debug("get getBondReverseRepoList:%s",smart.utils.toString(instrumentList))
smart.getBondReverseRepoList(getBondReverseRepoListCB)
```

### `获取可转债信息-getConvertableBond` <Badge type="warning" text="标准版不支持" />
[查询可转债信息示例](../example/pythonApiExample.md#查询可转债信息)
> 查询可转债信息
* `code` String(必填) - 证券代码.交易所标识 如 '113658.SH'
* `getConvertableBondCB` Function(必填) - 获取可转债信息回调，可转债信息([convertableBond](#可转债信息-convertablebond),[err](#接口响应错误对象-rsperror))
```python
def getConvertableBondCB(convertableBond, error):
        if error:
            logger.error(f"getConvertableBond error:{error}")
        else:
            logger.debug(f"getConvertableBond:{smart.utils.toString(convertableBond)}")
smart.getConvertableBond(code, getConvertableBondCB)
```

### `获取smart系统【设置】中参数-getSystemSet`
[查询设置中的设置项示例](../example/pythonApiExample.md#查询设置中的设置项)
> 获取smart系统【设置】中参数

```python
'''
 * 获取smart系统【设置】中参数
 *system:{
    *常用设置
    *isModal: True //交易确认框
    *isClearData: True //交易清空项
    *isDbWithdrawal: False //双击撤单项
    *isHideMarketCompo: False //隐藏分时/k线
    *isSystemModalCLose: True //系统关闭提示框
    *(isGeneralMaxValue: True //启用普通交易委托最大市值提示，
            generalMaxValue: 10000)//--一起使用
    *自动拆单规则设置：
    *splitUnitType: 
        // 可选值列表
        *0:按交易所单笔最大委托数量固定拆单;
        *1:(按用户设置上限固定拆单;
                splitMaxSplitQty: 50000-拆单上限);
        *2:按交易所规定的单笔委托上下限范围随机拆单;
        *3:(按单笔委托市值范围随机拆单
                splitMinMarketValue: 10000:请输入最小市值,
                splitMaxMarketValue: 50000:请输入最大市值)
        *4:(按自定义股数范围随机拆单;
                splitMinRandomQty: 10000:请输入最小拆分数量,
                splitMaxRandomQty: 50000:请输入最大拆分数量)
    *ETF套利/交易费用设置
    *(etfPreStockPK: "S1"//溢价股票盘口：
                //可选值列表
                { label: "最新价", value: "P" },
                { label: "卖一价", value: "S1" },
                { label: "卖二价", value: "S2" },
                { label: "卖三价", value: "S3" },
                { label: "卖四价", value: "S4" },
                { label: "卖五价", value: "S5" },
                { label: "买一价", value: "B1" },
                { label: "涨停价", value: "H" },
                { label: "跌停价", value: "L" })
    *etfUpperBuy: False //溢价涨停挂单：开、关
    *etfPreAuto: False // 溢价自动申购：开、关
    *etfCancel: False //撤单即可补单：开、关
    *etfDisSingleAuto: False // 折价单市场自动赎回：开关
    *etfDisCrossAuto: False //折价跨市场自动赎回：开关
    *etfMonitor: False // 监控列表停靠-左、右
    *(etfRate:
        {
        //（sh-沪市，sz-深市）
        is_del_fee: True    //预期利润-减去交易费用
        is_use: False       //实现利润-减去交易费用
        is_iopv_fee:False   //ETF iopv计算是否减掉费用
        sell_yh: 0.001      //卖出印花税
        buy_yh: 0           //买入印花税
        sh_etf_gh: 100      //申赎过户费（sh-沪市，sz-深市）
        sh_etf_min_sx: 100  //ETF最低手续费
        sh_etf_sx: 100      //ETF买卖手续费
        sh_stock_gh: 100    //股票过户费
        sh_stock_min_sx: 100//股票最低手续费
        sh_stock_sx: 100    //股票手续费
        sz_etf_gh: 100      //申赎过户费
        sz_etf_min_sx: 100  //ETF最低手续费
        sz_etf_sx: 100      //ETF买卖手续费
        sz_stock_gh: 100    //股票过户费
        sz_stock_min_sx: 100//股票最低手续费
        sz_stock_sx: 100    //股票手续费
        }
    * 基金公司费用对象
* fundFee:
    159732: 0.001
    516020: 0.001
    516100: 0.001
    561350: 0.001
    561500: 0.001
    561800: 0.001
    561900: 0.001
}
'''
def getSysCB(data,err):
    if(err):
        logger.debug("get error from getSystemSet:%s",err)
    else:
        logger.debug("get getSystemSet:%s",smart.utils.toString(data))
smart.getSystemSet(getSysCB)
```

### `注册给JS调用的函数-registCallableFunction`
[python和js双向通信示例](../example/pythonApiExample.md#python和js双向通信)

>注册给JS调用的函数
* `functionName` String(必填) - 函数的名称
* `func` String(必填) - 函数返回信息

```python
smart.registCallableFunction(functionName,func)
```

### `调用JS的函数接口-callJSFunction`
[python和js双向通信示例](../example/pythonApiExample.md#python和js双向通信)

>调用JS的函数接口
* `functionName` String(必填) - js函数的名称
* `params` String(必填) - 参数
* `callback` Function(选填) - 连接js函数，返回信息 
```js
smart.callJSFunction(functionName,params,callback)
```

### `消息提醒-notice`
[消息通知弹窗示例](../example/pythonApiExample.md#消息通知弹窗)

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

### `订阅bar行情-subscribe_bar`
[订阅bar行情及接收行情推送示例](../example/pythonApiExample.md#订阅bar行情及接收行情推送)
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

### `取消订阅bar行情-unsubscribe_bar`
[取消订阅bar行情示例](../example/pythonApiExample.md#订阅bar行情及接收行情推送)
> 取消订阅bar行情
* `codes` 必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
* `emitter` 选填 注册行情派发事件对象, 默认为全局smart对象
* 返回值 字符串数组，表示取消订阅失败的股票列表，例如['600000.SH']
```python
smart.unsubscribe_bar(codes, period, emitter)
```

### `异步-获取当天任意分钟的bar行情-query_bar_today_async`
[获取当天任意分钟的bar行情示例](../example/pythonApiExample.md#异步-获取当天任意分钟的bar行情)
> 获取当天任意分钟的bar行情。

* `codes`  必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `query_bar_today_callback` 必填 查询结果的回调函数
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
```python
smart.query_bar_today_async(codes, query_bar_today_callback, period)
```

### `同步-获取当天任意分钟的bar行情-query_bar_today`
[获取当天任意分钟的bar行情示例](../example/pythonApiExample.md#同步-获取当天任意分钟的bar行情)
> 获取当天任意分钟的bar行情。

* `codes`  必填 订阅的股票列表 数组 如['600000.SH', '000001.SZ']
* `period` 选填 周期 默认1m，最大60m（m代表分钟）
* 返回值 类型为dict, key 为股票代码,并且与参数 codes 中的 股票代码格式一致, value 为对应的 Bar 结构体数组
```python
smart.query_bar_today(codes, period)
```

### `异步-获取历史bar数据-query_bar_async`
[获取历史bar数据示例](../example/pythonApiExample.md#异步-获取历史bar数据-query-bar-async)
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
// 方式二:通过调用query_data_async接口，详情见[数据查询](#method为bar-异步查询历史bar数据)

### `同步-获取历史bar数据-query_bar`
[获取历史bar数据示例](../example/pythonApiExample.md#同步-获取历史bar数据-query-bar)
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
方式二:通过调用query_data_async接口，详情见[数据查询](#method为bar-同步查询历史bar数据)
<!-- // 方式二:通过调用query_data_async接口，详情见<a href="#query_data-bar">数据查询</a> -->

### `通用指标订阅-subscribe_indicator`
[通用指标订阅及接收数据推送示例](../example/pythonApiExample.md#通用指标订阅及接收数据推送)
> 通用指标订阅。监听指标数据变化有三种方式:1、订阅时传on_indicator_callback,例如subscribe_indicator(type, codes, on_indicator_callback)；2、smart.on(smart.Event.ON_INDICATOR,indicator_callback)；3、smart.on_bar(indicator_callback),且优先级1>2>3
* `type` 必填 指标类型参数，例如'etf'等字符串 该参数识别大小写
* `codes`  选填 订阅的指标代码列表 数组 如['159732.SZ','561800.SH']
* `on_indicator_callback` 选填 接收行情推送的回调函数，支持三种定义，且优先级为：on_indicator > smart.on()> 默认
* `emitter` 选填 注册数据派发事件对象, 默认为全局smart对象
* 返回值 字符串数组，表示订阅失败的指标代码列表，例如['561800.SH']
```python
smart.subscribe_indicator(type, codes, on_indicator_callback, emitter)
```

### `取消通用指标订阅-unsubscribe_indicator`
[取消通用指标订阅示例](../example/pythonApiExample.md#通用指标订阅及接收数据推送)
> 取消通用指标订阅

* `type` 必填 指标类型参数，例如'etf'等字符串，该参数识别大小写
* `codes` 选填 订阅的指标代码列表 数组 如['159732.SZ','561800.SH']
* `emitter` 选填 注册数据派发事件对象, 默认为全局smart对象
* 返回值 字符串数组，表示取消订阅失败的指标代码列表，例如['561800.SH']
```python
smart.unsubscribe_indicator(type, codes, emitter)
```

### `异步-获取市场数据-query_market_data_async`
[获取市场数据示例示例](../example/pythonApiExample.md#异步-获取市场数据-query-market-data-async)
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
// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为market-data-异步查询市场数据)

### `同步-获取市场数据-query-market-data`
[获取市场数据示例](../example/pythonApiExample.md#同步-获取市场数据-query-market-data)
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
// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为market-data-同步查询市场数据)

### `异步-获取当前交易日及下一交易日-get_trading_day_async`
[获取当前交易日及下一交易日示例](../example/pythonApiExample.md#异步-获取当前交易日及下一交易日-get-trading-day-async)
-   获取当前交易日及下一交易日，如果当前日期不是交易日，则当前交易日返回空""

// 方式一：通过调用get_trading_day_async接口
```python
def query_callback(tradingDayMap,err:RspError):
    if err:
        logger.debug("查询失败:%s", smart.utils.toString(err))
    else:
        logger.debug("get_trading_day_async【OK】:%s",tradingDayMap)
        for k,v in tradingDayMap.items():
            logger.debug("get_trading_day_async【OK】:%s,%s", k, v)
smart.get_trading_day_async(query_callback)
```
// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为current-next-trading-day-异步获取当前交易日及下一交易日)

### `同步-获取当前交易日及下一交易日-get_trading_day`
[获取当前交易日及下一交易日示例](../example/pythonApiExample.md#同步-获取当前交易日及下一交易日-get-trading-day)
-   获取当前交易日及下一交易日，如果当前日期不是交易日，则当前交易日返回空""

// 方式一：通过调用get_trading_day接口
```python
tradingDayMap = smart.get_trading_day()
logger.debug("get_trading_day【OK】:%s", tradingDayMap)
for k,v in tradingDayMap.items():
    logger.debug("get_trading_day【OK】:%s, %s", k, v)
```
// 方式二:通过调用query_data_async接口，详情见 [数据查询](#method为current-next-trading-day-同步获取当前交易日及下一交易日)

### `异步查询数据接口-query_data_async`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有<br/>
#### `method为bar-异步查询历史Bar数据`
>* [异步查询数据-获取历史bar行情示例](../example/pythonApiExample.md#异步查询数据-获取历史bar行情)
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
<!-- <a id="test2">测试2</a> -->
#### `method为market_data-异步查询市场数据`
>* [异步查询数据-获取市场数据示例](../example/pythonApiExample.md#异步查询数据-获取市场数据)
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
#### `method为current_next_trading_day-异步获取当前交易日及下一交易日`
>* [异步查询数据-获取当前交易日及下一交易日示例](../example/pythonApiExample.md#异步查询数据-获取当前交易日及下一交易日)
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
### `同步查询数据接口-query_data`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有<br/>
#### `method为bar-同步查询历史Bar数据`
>* [同步查询数据-获取历史bar行情示例](../example/pythonApiExample.md#同步查询数据-获取历史bar行情)
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

#### `method为market_data-同步查询市场数据`
>* [同步查询数据-获取市场数据示例](../example/pythonApiExample.md#同步查询数据-获取市场数据)
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
#### `method为current_next_trading_day-同步获取当前交易日及下一交易日`
>* [同步查询数据-获取当前交易日及下一交易日示例](../example/pythonApiExample.md#同步查询数据-获取当前交易日及下一交易日)
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
### `异步分页查询数据接口-query_data_page_async`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有
#### `method为bar-异步分页查询历史bar数据`
>* [异步分页获取历史bar数据示例](../example/pythonApiExample.md#异步分页查询数据-获取历史bar数据)
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
#### `method为market_data-异步分页查询市场数据`
>* [异步分页获取市场数据示例](../example/pythonApiExample.md#异步分页查询数据-获取市场数据)
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
### `同步分页查询数据接口-query_data_page`
* `method`  必填 查询使用的方法名 该值为"bar"、"market_data"
* `inParams`  必填 查询参数（该参数因method而变）

method 目前支持的参数有
#### `method为bar-同步分页查询历史bar数据`
>* [同步分页获取历史bar数据示例](../example/pythonApiExample.md#同步分页查询数据-获取历史bar数据)
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

#### `method为market_data-同步分页查询市场数据`
>* [同步分页获取市场数据示例](../example/pythonApiExample.md#同步分页查询数据-获取市场数据)
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

### `查询 etf 申赎上限-query_etf_purchase_redemption_top_limit`
* `code`  String(必填) etf 代码, 格式如 159300.SZ
  
```python
try :
    etf_data = smart.query_etf_purchase_redemption_top_limit("159300.SZ")
    logger.info("query_etf_purchase_redemption_top_limitn result: %s", etf_data)
    '''
    result 类似如下 json
    {
        "code":"159300",
        "redemption_top":35000000,  # 赎回上限
        "purchase_top":35000000     # 申赎上限
    }
    '''
except Exception as exp:
    logger.error(exp, exc_info=True, stack_info=True)
```

### `关闭当前组件-close`
```python
smart.close()
```


<!-- ### `smart.newStrategyInstance`
创建策略实例
```js
/**
 * 创建策略实例 不论是哪种策略  都需要创建策略实例，拿到一个js的Strategy对象，才能操作该策略的方法，注意这里只是语言级别的，并非启动策略
 * @param account_id 必填 账号id
 * @param strategy_platform_type  策略平台类型  StrategyPlatformType的枚举值
 * @param strategy_id
 *
 * 返回一个Strategy对象  然后调用strategy.startStrategy()等方法
 */
smart.newStrategyInstance(account_id, strategy_platform_type, strategy_id);
``` -->

<!-- ### `smart.addStrategy`
登记一个策略
```js
/**
 * 向本账号登记一个策略
 * @param account_id String必填 账号id
 * @param strategy_platform_type String必填 策略平台类型  StrategyPlatformType的枚举值  不同的策略有不同的行为：
 *              AlphaX类型的登记后smart server形成一条记录  客户端策略列表中会出现，需要进一步调用newStrategyInstance拿到实例后进行uploadFile后再startStrategy
 *              Algo类型的不允许客户主动登记策略
 *              ProgramTrade类型和Spec类型的可由客户主动登记策略，记录在smartserver  提供的信息比AlphaX的多一些
 *              Front类型的实际就是客户向组件库登记一个私有策略，记录在smartserver，如果之后uploadFile则为向组件库上传一个纯前端的私有策略，如果是不调用uploadFile直接startStrategy则直接启动本地组件目录中的该策略（只能是.smart包格式），如果本地不存在该策略则菜单中不显示
 * @param strategy_id String可选 策略id  可以含中文，为了防止冲突，尽量特殊些，不要用"网格交易"这种很通用的命名，很容易冲突
 * @param config 策略信息对象  记录在smartserver
 *              {
 *                  strategy_path:'',//String(可选)  对Front为.smart包的文件名   对AlphaX不需要传，自动取strategy_id作为策略存放相对路径   对Algo不需要传    对ProgramTrade和Spec类型的为策略所在文件夹在托管机器的全路径（removeStrategy时会删除该文件夹）
 *                  strategy_configfile_path_list: [''],//Array< String >(可选)  策略配置文件路径列表  对AlphaX和ProgramTrade和Spec类型的需要传递  可以多个路径
 *                  strategy_log_path_list: [''],//Array< String >(可选) 策略日志文件的路径列表  仅ProgramTrade和Spec类型的需要传递  可以多个，里面的路径都会被smart的logstash收集  Front类型的日志自动被smart收集无需传递
 *                  startStrategyCMD: '',//String(可选) 策略启动的cmd命令字符串  仅ProgramTrade和Spec类型的需要传递
 *                  template_code: '',//String(可选) 策略模板代码  AlphaX平台创建公共策略时必填
 *              }
 *
 * @return Promise形式返回Strategy对象
 * 
 * 不同的策略有不同的行为：
 * AlphaX类型的登记后smart server形成一条记录 客户端策略列表中会出现，需要进一步调用newStrategyInstance拿到实例后进行uploadFile后再startStrategy
 * Algo类型的不允许客户主动登记策略
 * ProgramTrade类型和Spec类型的可由客户主动登记策略，记录在smartserver 提供的信息比AlphaX的多一些
 * Front类型的实际就是客户向组件库登记一个私有策略，记录在smartserver，如果之后uploadFile则为向组件库上传一个纯前端的私有策略， 如果是不调用uploadFile直接startStrategy则直接启动本地组件目录中的该策略（只能是.smart包格式），如果本地不存在该策略则菜单中不显示
 *
 */
let strategy = await smart.addStrategy(account_id, strategy_platform_type, strategy_id, config);
``` -->

<!-- ### `smart.modifyStrategy`
修改策略
```js
待实现 ？？？
```

### `smart.removeStrategy`
删除策略
```js
待实现 ？？？
``` -->

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
### `通用指标etf行情数据订阅`
- 通过通用指标订阅etf行情数据
* 具体要素详情见[通用指标订阅-subscribe_indicator](#通用指标订阅-subscribe-indicator)
### `获取当前交易日及下一交易日`
* `method` 必填 该值为"current_next_trading_day"
*  `inParams`  必填 查询参数对象，具体要素详情见[异步数据查询](#method为current-next-trading-day-异步获取当前交易日及下一交易日)或是[同步数据查询](#method为current-next-trading-day-同步获取当前交易日及下一交易日)

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

### `策略集合-strategy_map`
所有本客户端登录的资金账号下的策略集合     Object key为`${策略id}_${平台类型}`  value为[Strategy](#策略-strategy)对象
```python
smart.strategy_map[strategy.clent_id + "_" + StrategyPlatformType.Algo]
```
### `可交易etf集合-etf_map`
可交易etf集合（全局静态数据）
```python
smart.etf_map
```

### `国债逆回购列表-reverse_repo_list`
国债逆回购列表（全局静态数据）
```python
smart.reverse_repo_list
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

#### `account.on_credit_ticker_assign` <Badge type="warning" text="仅支持两融账户" />
账户收到信用可融券头寸更新
* `callback`  Function (必填) - 更新信用可融券头寸，返回为[CreditTickerAssignInfo](#信用可融券头寸信息-credittickerassigninfo)对象
```python
def callback(creditTickerAssignInfo):
    logger.debug("get on_credit_ticker_assign:%s",smart.utils.toString(creditTickerAssignInfo))
smart.current_account.on_credit_ticker_assign(callback)
```

#### `account.on_credit_debt_finance` <Badge type="warning" text="仅支持两融账户" />
账户收到信用融资负债合约更新
* `callback` Function (必填) - 更新信用融资负债合约，返回为[CreditDebtFinance](#信用融资负债信息-creditdebtfinance)对象
```python
def callback(creditDebtFinance):
    logger.debug("get on_credit_debt_finance:%s",smart.utils.toString(creditDebtFinance))
smart.current_account.on_credit_debt_finance(callback)
```

#### `account.on_credit_debt_security` <Badge type="warning" text="仅支持两融账户" />
账户收到信用融券负债合约更新
* `callback` Function (必填) - 更新信用融券负债合约，返回为[CreditDebtSecurity](#信用融券负债信息-creditdebtsecurity)对象
```python
def callback(creditDebtSecurity):
    logger.debug("get on_credit_debt_security:%s",smart.utils.toString(creditDebtSecurity))
smart.current_account.on_credit_debt_security(callback)
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

#### `account.strategy_map` <Badge type="warning" text="标准版不支持" />

该资金账号的策略集合 key为strategy_id+'_'+StrategyPlatformType value为strategy对象


#### `credit_ticker_assign_list` <Badge type="warning" text="仅支持两融账户" />

该账号的信用实时可融券头寸信息 Array 元素是[CreditTickerAssignInfo](#信用可融券头寸信息-credittickerassigninfo)对象

#### `credit_debt_finance_list` <Badge type="warning" text="仅支持两融账户" />

该账号的信用融资负债合约列表 Array 元素是[CreditDebtFinance](#信用融资负债信息-creditdebtfinance)对象

#### `credit_debt_security_list` <Badge type="warning" text="仅支持两融账户" />

该账号的信用融券负债合约列表 Array 元素是[CreditDebtSecurity](#信用融券负债信息-creditdebtsecurity)对象

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

#### `account.subscribe_index`

订阅指数行情 注意无account_id参数 通过smart.current_account.on_quote(on_quote_callback)监听指数行情变化  

* `instruments` 必填 订阅的指数列表 数组 如["000001", "CESCPD", "931646"]
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
* `callback` 选填 订阅后的数据或错误返回信息参数(quoteList,[err](#接口响应错误对象-rsperror))，quoteList只是订阅成功的结果，后续行情变化将随行情事件推送，详见示例
```python
smart.current_account.subscribe_index(instruments=["000001", "CESCPD", "931646"])
def on_quote_callback(quote):
    if quote.instrument_type == smart.Type.InstrumentType.Index: 
        logger.debug(f"{smart.utils.toString(quote)}")
smart.current_account.on_quote(on_quote_callback)
```

#### `account.unsubscribe_index`
取消订阅指数行情
* `instruments` 必填 取消订阅的指数列表 数组 如["000001", "CESCPD", "931646"]
* `is_level2` 选填 是否level2 bool类型，默认为False True or False 目前暂不支持level2
```python
smart.current_account.unsubscribe_index(instruments=["000001", "CESCPD", "931646"])
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

#### `account.queryCreditAssets` <Badge type="warning" text="仅支持两融账户" />
>查询信用资产信息
* `queryCreditAssetsCB` Function(必填) - 获取信用资产回调，返回信用资产信息(assets,[err](#接口响应错误对象-rsperror))
```python
def queryCreditAssetsCB(assets,err):
    if(assets):logger.debug("get queryCreditAssets: %s",smart.utils.toString(assets))
    if(not assets):logger.debug("get queryCreditAssets FAIL: %s",err.message)
smart.current_account.queryCreditAssets(queryCreditAssetsCB)
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

#### `account.submit_source_apply` <Badge type="warning" text="仅支持两融账户" />
>账户提交券源申请
* `sourceQuoteApplyList` String(必填) - 券源行情申请列表
* `callback(suclist<SourceQuoteInfo>,err )` Function(必填) - 券源申请提交的回调，suclist为券源申请成功的列表信息，若[err](#接口响应错误对象-rsperror)有值，则券源申请失败的列表信息在err.value
```python
def callback(suclist,err):
    if err: #券源申请推送:存在失败
        errList =  [] if type(err)!= dict or not 'value' in err.keys() else err["value"]
        if errList: #券源申请推送：失败数据
            for i in range(len(errList)):
                logger.debug("submitSourceApplyCB【error】:%s",smart.utils.toString(errList[i]))  
        if suclist:#券源申请推送：成功数据
            for i in range(len(suclist)):
                logger.debug("submitSourceApplyCB【success】:%s",smart.utils.toString(suclist[i]))                
    else: #券源申请推送全部成功
        if suclist:#券源申请推送：成功数据
            for i in range(len(suclist)):
                logger.debug("submitSourceApplyCB【success】:%s",smart.utils.toString(suclist[i]))
smart.current_account.submit_source_apply(sourceQuoteApplyList,callback)
```

#### `account.createStrategy` <Badge type="warning" text="标准版不支持" />
>创建一个全新的策略实例
* `strategy_platform_type` String(必填) - 策略平台类型 [StrategyPlatformType](#策略平台类型-strategyplatformtype) 的枚举值
* `strategy_id` String(必填) - 策略id 可以含中文，为了防止冲突，尽量特殊些，不要用"网格交易"这种很通用的命名，很容易冲突
* `config` String(必填) - 策略信息对象 记录在smartserver
* `createStrategyCallback` Function(必填) - 返回策略信息对象(strategy,[err](#接口响应错误对象-rsperror))

```python
def createStrategyCallback(strategy,err):
    if(err):
        logger.debug("get error from createStrategy:%s",err)
    else:
        logger.debug("get createStrategyCallback: %s",strategy)    
smart.current_account.createStrategy(strategy_platform_type, strategy_id, config ,createStrategyCallback)
```
#### `account.startStrategy` <Badge type="warning" text="标准版不支持" />
>开始运行策略实例
* `strategy_platform_type` String(必填) - 策略平台类型 [StrategyPlatformType](#策略平台类型-strategyplatformtype) 的枚举值
* `clent_id` String(必填) - 策略实例的ID
* `startStrategyCallback` Function(必填) - 返回母单信息(strategy,[err](#接口响应错误对象-rsperror))

```python
def startStrategyCallback(strategy,err):
    if(err):
        logger.debug("get error from startStrategy:%s",err)
    else:
        logger.debug("get startStrategy: %s",strategy)
smart.current_account.startStrategy(strategy_platform_type, clent_id,startStrategyCallback)
```

#### `account.insertAlgoOrder` <Badge type="warning" text="标准版不支持" />
>创建并开始运行策略实例
* `strategy_id` String(必填) - 策略id 
* `config` String(必填) - 策略信息对象
* `insertAlgoOrderCallback` Function(必填) - 返回母单信息(strategy,[err](#接口响应错误对象-rsperror))

```python
def insertAlgoOrderCallback(strategy,err):
    if(err):
        logger.debug("get error from insertAlgoOrder:%s",err)
    else:
        logger.debug("get insertAlgoOrder: %s",strategy)
smart.current_account.insertAlgoOrder(strategy_id, config, insertAlgoOrderCallback)
```


## `策略-Strategy` <Badge type="warning" text="标准版不支持" />

> 获取策略相关数据、控制策略的行为

### 实例事件

`Strategy` 是一个EventEmitter。可以监听的事件详见[Event](#事件-event)


#### `strategy.on_strategy_quote`
> 某策略订阅的行情推送
* `callback` Function
    - `quote` Object - 事件发生时返回一个[Quote](#行情信息-quote)对象
```python
def callback(quote):
    logger.debug("get on_strategy_quote:%s",smart.utils.toString(quote))
strategy.on_strategy_quote(callback)
#  或者 emitter 写法
strategy.on(smart.Event.ON_QUOTE, callback)
```

#### `strategy.on_order`

> 接收策略的委托推送 

* `callback` Function
    - `order` Object - 事件发生时返回一个[Order](#委托回报-order)对象

```python
def callback(order):
    logger.debug("get on_order:%s",smart.utils.toString(order))
strategy.on_order(callback)
#  或者 emitter 写法
strategy.on(smart.Event.ON_ORDER, callback)
```

#### `strategy.on_trade`

> 接收策略的成交回报推送

* `callback` Function
    - `trade` Object - 事件发生时返回一个[Trade](#成交回报-trade)对象

```python
def callback(trade):
    logger.debug("get on_trade:%s",smart.utils.toString(trade))
strategy.on_trade(callback)
# 或者 emitter 写法
strategy.on(smart.Event.ON_TRADE, callback)
```

#### `strategy.on_strategy_status_change`

策略进程状态变化推送

* `callback` Function
    - `status` Object - 事件发生时返回一个[进程状态](#策略状态对象)对象

```python
def callback(position):
    logger.debug("get on_strategy_status_change:%s",smart.utils.toString(position))
strategy.on_strategy_status_change(callback)
#  或者 emitter 写法
strategy.on(smart.Event.ON_STRATEGY_STATUS_CHANGE, callback)
```
<!--
#### 策略状态对象

一个包含当前策略状态，策略名等信息的js对象

* `process_type` String - 固定值 `"strategy"`
* `process_name` String - 进程名
* `strategy_id` String - 策略id
* `status` String - 进程状态 [StrategyStatus](#策略执行状态-strategystatus)枚举
* `status_name` String - 进程状态中文名
* `strategy_platform_type` String - 策略所属平台类型  [StrategyPlatformType](#策略平台类型-strategyplatformtype)枚举

#### `on_alphax_msg`

接收服务端功夫策略的自定义消息推送  <Badge text="AlphaX" type="warning"/>

```js
'''
 *  接收服务端功夫策略的自定义消息推送
 *  @param message String 功夫策略推送过来的自定义内容，可以以json字符串形式存放更多复杂信息，前台通过JSON.parseJSON处理
'''
strategy.on_alphax_msg(message => {});
// 或者 emitter 写法
strategy.on(smart.Event.ON_ALPHAX_MSG, message => {});
```
tegy.on_strategy_cancel_fail(fail);
```-->

### 静态方法

### 实例属性

#### `strategy_platform_type` 
策略平台类型       [StrategyPlatformType](#策略平台类型-strategyplatformtype)枚举

#### `strategy_id`
策略id           String  对于功夫即策略名称

#### `parent_order_id`
母单编号          String

#### `status`
策略状态          [StrategyStatus](#策略执行状态-strategystatus)枚举

#### `status_name`
策略状态中文       String

<!--#### `isPrivate`

`Boolean` 类型。True 表示是客户自有的策略。相反的则是有其他策略平台提供的公共策略。

#### `round_list`

当天策略启动的轮次信息  Round对象Array集合 元素[Round对象](#round)

#### `last_round`
最后执行的轮次对象     [Round对象](#round)
```
#### `book`

策略的账簿信息

* `avail`          可用资金       Number
* `margin`         保证金         Number
* `market_value`   市值          Number 
* `initial_equity` 初始权益       Number
* `dynamic_equity` 动态权益       Number
* `static_equity`  静态权益       Number
* `realized_pnl`   已实现盈亏     Number
* `unrealized_pnl` 未实现盈亏     Number
-->
#### `strategy.strategy_position_list`
该策略的实时持仓    Position对象Array集合  元素[Position对象](#持仓-position)

#### `strategy.strategy_order_list`
该策略实时委托列表   Order对象Array集合  元素[Order对象](#委托回报-order)

#### `strategy.strategy_trade_list`
该策略的实时成交回报 Trade对象Array集合  元素[Trade对象](#成交回报-trade)

#### `strategy.relation_account_map`
该策略涉及的资金账号map集合 key为资金账号 value为[Account对象](#资金账户-account)

### 实例方法
<!--
#### `strategy.loadData()` <Badge text="AlphaX" type="warning"/>
> 加载策略相关交易数据并注册相关事件监听

返回 `Promise<void>` - 

当strategy对象刚刚创建成功后，其实并没有历史交易数据，也没有和后台的策略平台建立链路，所以后台系统的策略更新并不会推送到策略中。

需要调用一下loadData方法，加载历史数据，并和后台建立逻辑链路。之后的交易信息变动会以事件的形式触发。

```js
await strategy.loadData();
```-->
<!--
#### `strategy.startStrategy`
> 启动当前策略
* `account_id` 账号id
* `strategy_platform_type` String(必填) - 策略平台类型 [StrategyPlatformType](#策略平台类型-strategyplatformtype) 的枚举值
* `clent_id` String(必填) - 策略实例的ID
* `startStrategyCallback` Function(必填) - 返回母单信息(strategy,[err](#接口响应错误对象-rsperror))
```python
def startStrategyCallback(strategy,err):
    if(err):
        logger.debug("get error from startStrategyr:%s",err)
    else:
        logger.debug("get startStrategyr: %s",strategy)
strategy.startStrategy(account_id, strategy_platform_type, clent_id, startStrategyCallback)
```
-->

#### `strategy.stopStrategy`
> 停止当前策略
* `stopStrategyCallback` Function(必填)停止当前策略的返回信息(stg,[err](#接口响应错误对象-rsperror))
```python
def stopStrategyCallback(stg,err):
    if(err):
        logger.debug("get error from stopStrategy:%s",err)
    else:
        logger.debug("get stopStrategyCallback: %s",stg)
strategy.stopStrategy(stopStrategyCallback)
```

#### `strategy.forceStopStrategy`
> 强制停止当前策略
* `forceStopStrategy` Function(必填) 强制停止当前策略的返回信息(stg,[err](#接口响应错误对象-rsperror))
```python
def forceStopStrategyCallback(stg,err):
    if(err):
        logger.debug("get error from forceStopStrategy:%s",err)
    else:
        logger.debug("get forceStopStrategy: %s",stg)
strategy.forceStopStrategy(forceStopStrategyCallback)
```
<!--
#### `strategy.postStrategyParamsBeforeStart` <Badge text="AlphaX" type="warning"/>

> 策略启动前传参

* `param` String | Object - 参数对象，类型是字符串|JSON对象均可 特别是作为字符串传递时其内容可以是json字符串、csv字符串、xml字符串均可，但要注意里面的'和"进行转义以防止破坏字符串表达
* `filePath` String - 策略平台落地的参数文件的相对本策略根目录的相对路径

返回 `Promise<void>` -

```js
await strategy.postStrategyParamsBeforeStart({ aaa: "bbb" }, "/lib/config.json");
```

#### `postStrategyParams`  <Badge text="AlphaX" type="warning"/>

> 策略启动后（运行期间）向策略发送消息

* `message` Object - 消息对象，必须是对象类型

返回 `Promise<void>` -

```js
await strategy.postStrategyParams({ aaa: "bbb" });
```

#### `startTD` <Badge text="AlphaX" type="warning"/>
启动td  
```js
    /**
     *  启动td 仅对AlphaX有效
     *  @param account_id 资金账号 String
     *  @param source smart.Type.Source枚举  默认为xtp
     *  @param pwd 资金账号的密码 可选 String 当不传时前台自动弹出对话框让用户输入密码
     *
     *  @return Promise形式返回的TD状态JSON对象:  
     *            {
     *                 account_id: "15003941",//资金账号 String
     *                 process_name: "td_xtp_15003941",//td进程名称 String
     *                 process_type: "td",//进程类型 String
     *                 source: "xtp",//柜台源类型 smart.Type.Source的枚举值 String类型 
     *                 status: "Stopped",//目前进程状态
     *                 status_name: "已停止",//进程状态中文名
     *            }
     *          注意catch Promise的reject的err对象
     */
    strategy.startTD(account_id, source, pwd);
```

#### `startMD`
启动md  <Badge text="AlphaX" type="warning"/>
```js
/**
 *  启动md 仅对AlphaX有效
 *  @param account_id 资金账号 String 必填
 *  @param source smart.Type.Source枚举  默认为xtp  必填
 *  @param pwd 资金账号的密码 可选 String 当不传时前台自动弹出对话框让用户输入密码
 *  
 *  @return Promise形式返回的MD状态JSON对象:  
 *            {
 *                 account_id: "15003941",//资金账号 String
 *                 process_name: "md_xtp_15003941",//td进程名称 String
 *                 process_type: "md",//进程类型 String
 *                 source: "xtp",//柜台源类型 smart.Type.Source的枚举值 String类型 
 *                 status: "Stopped",//目前进程状态
 *                 status_name: "已停止",//进程状态中文名
 *            }
 *          注意catch Promise的reject的err对象
 */
strategy.startMD(account_id, source, pwd);
```


#### `download`

> 将后台的策略目录下的文件下载到前台，比如策略参数的配置文件，严禁下载大文件

* `filePath` String - 策略中，文件相对路径
* `raw` Boolean(可选) - 是否使用原始编码，默认为False，SDK会尝试文件内容转为字符串。如果希望得到二进制的文件内容，可以设置为True

返回 `String` 或者 `TypedArray` - Promise形式的文件内容  当raw不传或传False时，返回String 或者 当raw传True是返回TypedArray代表文件的二进制

如果获取出错，会抛出异常。

```js
const content = await strategy.download("/lib/config.json");
```
-->
### Strategy方法的支持情况

| 方法 | Front | Algo |
| ---- | ----- | ---- ||
| uploadFile                    |       | x    |
| startStrategy                 |       | ○    |
| stopStrategy                  |       | ○    |
| forceStopStrategy             |       | ○    |
| postStrategyParamsBeforeStart |       | x    |
| postStrategyParams            |       | x    |
| download                      |       | x    |
| modifyStrategyBook            |       | x    |
| modifyStrategyPosition        |       | x    |
| setCommission                 |       | x    |
| subscribeStrategyLog          |       | x    |
| unsubscribeStrategyLog        |       | x    |
| getStrategyLogContent         |       | x    |
| throwStrategyException        |       | x    |
| addAccount                    |       | x    |
| removeAccount                 |       | x    |
| startTD                       |       | x    |
| startMD                       |       | x    |
| insert_order                  |       | x    |
| cancel_order                  |       | x    |
| subscribe                     |       | x    |
| unsubscribe                   |       | x    |
| on_strategy_quote             |       | ○    |
| on_book                       |       | x    |
| on_order                      |       | ○    |
| on_trade                      |       | ○    |
| on_position                   |       | x    |
| on_alphax_msg                 |       | x    |
| on_strategy_status_change     |       | ○    |
| on_strategy_cancel_fail       |       | x    |

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
* `ON_SHOW` 组件被显示
* `ON_HIDE` 组件被隐藏
* `ON_RESET` 组件用户数据被清空重置
* `ON_QUOTE` 订阅行情后，行情变化推送 策略之间、组件之间、策略和账户直接的订阅和取消订阅不相互影响
* `ON_ETF_PROFIT` ETF折溢价利润推送数据
* `ON_ASSETS` **账户**资金的全量推送
<!--* `ON_BOOK` **策略**资金的全量推送-->
* `ON_POSITION` 持仓变化的增量推送
* `ON_ORDER` 委托变化推送
* `ON_TRADE` 成交变化推送
* `ON_CANCEL_FAIL` 撤单失败的消息推送
<!--* `ON_ALPHAX_TD_STATUS_CHANGE` alphax td状态变化时推送-->
<!--* `ON_ALPHAX_MD_STATUS_CHANGE` alphax md状态变化时推送-->
* `ON_STRATEGY_STATUS_CHANGE`  策略状态变化时推送 <Badge type="warning" text="标准版不支持" />
<!--* `ON_ALPHAX_MSG` alphax 策略往前端推送数据 -->
* `ON_CREDIT_TICKER_ASSIGN` 更新信用账户可融券头寸信息 <Badge type="warning" text="仅支持两融账户" />
* `ON_CREDIT_DEBT_FINANCE` 更新融资负债合约信息 <Badge type="warning" text="仅支持两融账户" />
* `ON_CREDIT_DEBT_SECURITY` 更新融券负债合约信息 <Badge type="warning" text="仅支持两融账户" />

<!-- * `ON_STRATEGY_CANCEL_FAIL` 某策略撤单失败消息推送 -->
<!-- * `ON_STRATEGY_UPLOAD_RESULT` 某策略上传结果事件 -->
<!-- * `ON_STRATEGY_START_RESULT` 某策略启动结果消息 -->
<!-- * `ON_STRATEGY_STOP_RESULT` 某策略停止结果消息 -->
<!-- * `ON_STRATEGY_FORCE_STOP_RESULT` 某策略强制停止结果消息 -->
<!-- * `ON_STRATEGY_EXCEPTION` 某策略运行中的异常消息  如td md断线  程序异常等 -->
<!-- * `ON_STRATEGY_LOG` 某策略log日志发生变化时的增量变化消息 -->
<!-- * `ON_STRATEGY_PRE_START` 后台组件的策略pre_start完成后触发 -->
<!-- * `ON_STRATEGY_POST_START` 后台组件的策略post_start完成后触发 -->
<!-- * `ON_STRATEGY_PRE_STOP` 后台组件的策略pre_stop完成后触发 -->

不同对象派发出的事件不同(表格中标明了等效事件监听方法)

| 事件                      | smart               | Account                              | Strategy | 说明                                                                                  |
| ------------------------- | ------------------- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------- |
| `ON_INIT`                 | ○<br>smart.on_init  | -                                    | -        | 组件初始化 类似domReady事件，组件所有代码都必须在该事件之后                           |
| `ON_CLOSE`                | ○<br>smart.on_close | -                                    | -        | 组件被关闭                                                                            |
| `ON_SHOW`                 | ○<br>smart.on_show  | -                                    | -        | 组件被显示                                                                            |
| `ON_HIDE`                 | ○<br>smart.on_hide  | -                                    | -        | 组件被隐藏                                                                            |
| `ON_RESET`                | ○                   | -                                    | -        | 组件用户数据被清空重置                                                                |
| `ON_QUOTE`                | ○                   | ○<br>account.on_quote                | -        | 订阅行情后，行情变化推送 策略之间、组件之间、策略和账户直接的订阅和取消订阅不相互影响 |
| `ON_ETF_PROFIT`           | ○                   | -                                    | -        | ETF折溢价利润推送数据                                                                 |
| `ON_ASSETS`               | -                   | ○<br>account.on_assets               | -        | **账户**资金的全量推送                                                                |
| `ON_POSITION`             | -                   | ○<br>account.on_position             | -        | 持仓变化的增量推送                                                                    |
| `ON_ORDER`                | -                   | ○<br>account.on_order                | -        | 委托变化推送                                                                          |
| `ON_TRADE`                | -                   | ○<br>account.on_trade                | -        | 成交变化推送                                                                          |
| `ON_CANCEL_FAIL`          | -                   | ○<br>account.on_cancel_fail          | -        | 撤单失败的消息推送                                                                    |
| `ON_CREDIT_TICKER_ASSIGN` | ○                   | ○<br>account.on_credit_ticker_assign | -        | 更新信用账户可融券头寸信息 <Badge type="warning" text="仅支持两融账户" />             |
| `ON_CREDIT_DEBT_FINANCE`  | ○                   | ○<br>account.on_credit_debt_finance  | -        | 更新融资负债合约信息 <Badge type="warning" text="仅支持两融账户" />                   |
| `ON_CREDIT_DEBT_SECURITY` | ○                   | ○<br>account.on_credit_debt_security | -        | 更新融券负债合约信息 <Badge type="warning" text="仅支持两融账户" />                   |

<!-- `ON_STRATEGY_CANCEL_FAIL`||||某策略撤单失败消息推送
`ON_STRATEGY_UPLOAD_RESULT`||||某策略上传结果事件
`ON_STRATEGY_START_RESULT`||||某策略启动结果消息
`ON_STRATEGY_STOP_RESULT`||||某策略停止结果消息
`ON_STRATEGY_FORCE_STOP_RESULT`||||某策略强制停止结果消息
`ON_STRATEGY_EXCEPTION`||||某策略运行中的异常消息  如td md断线  程序异常等
`ON_STRATEGY_LOG`||||某策略log日志发生变化时的增量变化消息
`ON_STRATEGY_PRE_START`||||后台组件的策略pre_start完成后触发
`ON_STRATEGY_POST_START`||||后台组件的策略post_start完成后触发
`ON_STRATEGY_PRE_STOP`||||后台组件的策略pre_stop完成后触发 -->

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

    #  市价，通用，
    #  对于股票上海为最优五档剩余撤销，深圳为即时成交剩余撤销
    #  xtp:4 XTP_PRICE_BEST5_OR_CANCEL最优5档即时成交剩余转撤销，市价单-沪
    #  或
    #  xtp:2 XTP_PRICE_BEST_OR_CANCEL即时成交剩余转撤销，市价单-深 / 沪期权
    Any = 2

    #  上海深圳最优五档即时成交剩余撤销，上交所的市价需要报价，深交所的市价不需要报价  xtp:4 XTP_PRICE_BEST5_OR_CANCEL最优5档即时成交剩余转撤销，市价单-沪深
    FakBest5 = 4

    #  仅深圳本方最优价格申报, 不需要报价  xtp:6 XTP_PRICE_FORWARD_BEST本方最优，市价单-深
    ForwardBest = 6

    #  上海最优五档即时成交剩余转限价，需要报价；深圳对手方最优价格申报，不需要报价
    #  xtp:3 XTP_PRICE_BEST5_OR_LIMIT最优五档即时成交剩余转限价，市价单-沪
    #  或
    #   7 XTP_PRICE_REVERSE_BEST_LIMIT对方最优剩余转限价，市价单-深 / 沪期权
    ReverseBest = 3

    #  股票（仅深圳）即时成交剩余撤销，不需要报价；期货即时成交剩余撤销，需要报价
    #  xtp:2 XTP_PRICE_BEST_OR_CANCEL即时成交剩余转撤销，市价单-深 / 沪期权
    Fak = 2

    #  股票（仅深圳）市价全额成交或者撤销，不需要报价；期货全部或撤销，需要报价
    #  xtp:5 XTP_PRICE_ALL_OR_CANCEL全部成交或撤销,市价单-深 / 沪期权
    #  或
    #  8 XTP_PRICE_LIMIT_OR_CANCEL期权限价申报FOK
    Fok = 5
```
### `买卖方向-Side`
买卖方向
```python
class Side():
    Unknown = 0  # 无效
    Buy = 1  # 买
    Sell = 2  # 卖
    Lock = 12  # 锁仓  对应xtp的XTP_SIDE_FREEZE 12
    # 以下是alphax缺少的
    Purchase = 7  # 申购
    Pedemption = 8  # 赎回
    Split = 9  # 拆分
    Merge = 10  # 合并
    Cover = 11  # 备兑
    MarginTrade = 21  # 融资买入
    ShortSell = 22  # 融券卖出
    RepayMargin = 23  # 卖券还款
    RepayStock = 24  # 买券还券
    StockRepayStock = 26  # 现券还券
    SurstkTrans = 27  # 余券划转
    GrtstkTransin = 28  # 担保品转入
    GrtstkTransout = 29  # 担保品转出
```

### `委托业务类型-BusinessType`
委托业务类型
```python
class BusinessType():
    CASH = 0  # 普通股票
    REPO = 2  # 国债逆回购
    ETF = 3  # ETF申赎
    MARGIN= 4 # 融资融券
    BOND_SWAP_STOCK = 15  # 债转股
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
<!--
### `成交量条件-VolumeCondition`
成交量条件
```python
class VolumeCondition():
    Any = 0  # 任何数量 == 对成交数量不做要求  对应ctp:'1' THOST_FTDC_VC_AV
    Min = 1  # 最小数量 == 要求本次委托须成交的数量的最小值 对应ctp:'2' THOST_FTDC_VC_NV
    All = 2  # 全部数量 == 要求本次委托须全部成交 对应ctp:'3' THOST_FTDC_VC_CV
```
### `成交时间条件-TimeCondition`
成交时间条件
```python
class TimeCondition():
    IOC = 0  # 立即完成，否则撤销 对应ctp:'1' THOST_FTDC_VC_IOC
    GFS = 1  # 本节有效 对应ctp:'2' THOST_FTDC_VC_GFS
    GFD = 2  # 当日有效 对应ctp:'3' THOST_FTDC_VC_GFD
    # 以下为alphax缺少但ctp有的
    GTD = 3  # 指定日期前有效  对应ctp:'4' THOST_FTDC_VC_GTD
    GTC = 4  # 撤销前有效  对应ctp:'5' THOST_FTDC_VC_GTC
    GFA = 5  # 集合竞价有效  对应ctp:'6' THOST_FTDC_VC_GFA
```
-->
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
### `策略平台类型-StrategyPlatformType` <Badge type="warning" text="标准版不支持" />
策略平台类型
```python
# 策略平台类型
class StrategyPlatformType():
    Front = "front"  # 客户端直接运行的js前端策略
    AlphaX = "alphax"  # AlphaX即功夫
    Algo = "algo"  # 算法平台
    ProgramTrade = "programTrade"  # 程序化交易
    Spec = "spec"  # 特定平台 按ProgramTrade相同的逻辑处理  1.0.0未写入文档
    FrontPy = "frontpy" # 客户端python策略类型
```
<!-- ### `ETFReplaceType`
ETF替代类型
```python
   //ETF替代类型
   const ETFReplaceType = {
        ERT_CASH_FORBIDDEN: {
            name: '禁止现金替代',
            i: 0
        },
        ERT_CASH_OPTIONAL: {
            name: '可以现金替代',
            i: 1
        },
        ERT_CASH_MUST: {
            name: '必须现金替代',
            i: 2
        },
        ERT_CASH_RECOMPUTE_INTER_SZ: {
            name: '深市退补现金替代',
            i: 3
        },
        ERT_CASH_MUST_INTER_SZ: {
            name: '深市必须现金替代',
            i: 4
        },
        ERT_CASH_RECOMPUTE_INTER_OTHER: {
            name: '非沪深市场成分证券退补现金替代',
            i: 5
        },
        ERT_CASH_MUST_INTER_OTHER: {
            name: '表示非沪深市场成份证券必须现金替代',
            i: 6
        },
        EPT_INVALID: {
            name: '无效值',
            i: 7
        }
    };
``` -->

### `策略执行状态-StrategyStatus` <Badge type="warning" text="标准版不支持" />
策略执行状态
```python
class StrategyStatus():
    Unknown = "Unknown"  # 未知
    Starting = "Starting"  # 启动中  预留暂时无用
    Started = "Started"  # 启动完毕运行中
    Pause = "Pause"  # 暂停  预留暂时无用
    Stopping = "Stopping"  # 停止中  预留暂时无用
    Stopped = "Stopped"  # 已停止
    Errored = "Errored"  # 错误
```

**结构体**

### `ETF配方表-ETF`
ETF配方表对象
```python
#ETF配方表对象
class ETF(Instrument):
    def __init__(self):
        # 证券基础字段参见Instrument
        super().__init__()
        self.cash_component = None  # T-1日现金差额
        self.estimate_amount = None  # T日预估现金余额
        self.max_cash_ratio = None  # 现金替代比率上限
        self.net_value = None  # T-1日基金份额净值
        self.redemption_status = None  # 基金当天赎回状态：1可以，0不可以
        self.total_amount = None  # 最小申赎单位净值
        self.unit = None  # 最小申购赎回单位
        self.basket = []  # 成分股篮子列表
```
### `ETF成分股-ETFCompoment`
ETF成分股对象
```python
#ETF成分股对象
class ETFCompoment(Instrument):
    def __init__(self):
        # 证券基础字段参见Instrument
        super().__init__()
        self.amount = None  # 替代金额
        self.creation_amount = None  # 溢价替代金额
        self.creation_premium_ratio = None  # 溢价比例
        self.premium_ratio = None  # 溢价比例
        self.quantity = None  # 股票数量
        self.redemption_amount = None  # 折价替代金额
        self.redemption_discount_ratio = None  # 折价比例
        self.replace_type = None  # 现金替代类型 参考ETFReplaceType
        self.ticker = None  # 申赎代码如：510501
        self.creation_amount = None  # 申购现金替代金额
        self.redemption_amount = None  # 赎回现金替代金额
```

### `ETF预期利润-ETFProfit`
ETF预期利润
```python
class ETFProfit:
    def __init__(self):
        self.instrument_id = None  # ETF的证券代码
        self.iopv = 0  # ETF的模拟净值
        self.iopv_buy = 0  # ETF的买模拟净值
        self.iopv_sale = 0  # ETF的卖模拟净值
        self.diopv = 0  # ETF的动态模拟净值
        self.dis_profit = 0  # ETF折价预期利润
        self.pre_profit = 0  # ETF溢价预期利润
```

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
如图所示：

![股票](../../../.vuepress/public/gupiao.png)


对于期权，具体值如下
第 0 位：
S=启动(开市前)
C=集合竞价
T=连续交易
B=休市
E=闭市 V=波动性中断
P=临时停牌
U=收盘集合竞价
M=可恢复交易的熔断(盘中集合竞价)
N=不可恢复交易的熔断(暂停交易至闭市)
第1位：
0=未连续停牌；
1=连续停牌；
(预留，暂填空格)
第2位：
0=不限制开仓
1=限制备兑开仓
2=限制卖出开仓
3=限制卖出开仓、备兑开仓
4=限制买入开仓
5=限制买入开仓、备兑 开仓
6=限制买入开仓、卖出开仓
7=限制买入开仓、卖出开仓、备兑开仓
第3位：
0=在当前时段不接受进行新订单申报
1=在当前时段可接受进行新订单申报 
如图所示：

![期权](../../../.vuepress/public/qiquan.png)

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

### `新股信息-IPO`
>新股信息
```python  
class IPO(Instrument):
    def __init__(self):
        # 证券基础字段参见Instrument
        super().__init__()
        self.market_type = None
        self.price = None  # 价格
        self.qty_upper_limit = None  # 持仓数量
        self.instrument_id = None  # 股票代码
        self.instrument_name = None  # 股票名称
        self.instrument_type = None  # 股票类型
        self.unit = None  # 最小申购赎回单位
```

### `可转债信息-ConvertableBond`
>可转债信息
```python  
class ConvertableBond(Instrument):
    def __init__(self):
        # 证券基础字段参见Instrument
        super().__init__()
        self.qtyMax = None # 最大可转数量
        self.qtyMin = None # 最小可转数量
        self.swapFlag = None # 是否可转
        self.swapPrice = None # 转换价格
        self.underlyingTicker = None # 正股代码
        self.unit = None # 转换单位
```

### `信用可融券头寸信息-CreditTickerAssignInfo` <Badge type="warning" text="仅支持两融账户" />

>信用可融券头寸信息
```python  
class CreditTickerAssignInfo():
    def __init__(self):
        self.instrument_id  # 证券代码
        self.instrument_name  # 证券名称
        self.exchange_id = Exchange.Unknown  # 交易所id
        self.exchange_id_name = "未知"  # 交易所名称
        self.name_py = ""  # 拼音首字母  如"安诺其"为"anq"  alphax缺少
        self.left_volume = 0  # 剩余可融券数量
        self.frozen_volume = 0  # 冻结融券数量
        self.yesterday_volume = 0 #昨日日融券数量
        self.xtp_market_type = "XTP_EXCHANGE_UNKNOWN"  # xtp交易市场
        self.code = None  # 证券代码.交易所标识 如"600000.SH"
```
### `信用融资负债信息-CreditDebtFinance` <Badge type="warning" text="仅支持两融账户" />
>信用融资负债信息
```python  
class CreditDebtFinance():
    def __init__(self):
        self.debt_id  # 负债合约编号
        self.instrument_id  # 证券代码
        self.instrument_name  # 证券名称
        self.exchange_id = Exchange.Unknown  # 交易所id
        self.exchange_id_name = "未知"  # 交易所名称
        self.name_py = ""  # 拼音首字母  如"安诺其"为"anq"  alphax缺少
        self.xtp_market_type  #  xtp交易市场
        self.remain_amt = 0  # 未偿还金额
        self.remain_principal = 0  # 未偿还本金
        self.remain_interest = 0  # 未偿还利息
        self.debt_status = 0 #合约状态:0未了结，1已了结，2过期未平仓
        self.end_date #负债截止日期
        self.orig_end_date #负债原始截止日期
        self.order_xtp_id #负债订单编号
        self.order_date #委托日期
        self.extended #是否接收到展期
        self.code = None  # 证券代码.交易所标识 如"600000.SH"
```
### `信用融券负债信息-CreditDebtSecurity` <Badge type="warning" text="仅支持两融账户" />
>信用融券负债信息
```python  
class CreditDebtSecurity():
    def __init__(self):
        self.debt_id  # 负债合约编号
        self.instrument_id  # 证券代码
        self.instrument_name  # 证券名称
        self.exchange_id = Exchange.Unknown  # 交易所id
        self.exchange_id_name = "未知"  # 交易所名称
        self.name_py = ""  # 拼音首字母  如"安诺其"为"anq"  alphax缺少
        self.xtp_market_type  #  xtp交易市场
        self.remain_interest = 0  # 未偿还利息
        self.remain_volume = 0 #未偿还融券数量
        self.due_right_volume = 0 #应偿还权益数量
        self.debt_status = 0 #合约状态:0未了结，1已了结，2过期未平仓
        self.end_date #负债截止日期
        self.orig_end_date #负债原始截止日期
        self.order_xtp_id #负债订单编号
        self.order_date #委托日期
        self.extended #是否接收到展期
        self.code = None  # 证券代码.交易所标识 如"600000.SH"
```
### `券源行情信息-SourceQuoteInfo` <Badge type="warning" text="仅支持两融账户" />
>券源行情信息
```python  
class SourceQuoteInfo():
    def __init__(self):
        self.sno = None # 行情序号
        self.stk_code = None# 证券代码
        self.stk_name = None # 证券名称
        self.quotation_type = '0' # 行情类型 0：库存券源 1：意向券源 2：准库存券
        self.end_date = None # 到期日期
        self.term_rate = 0 # 费率 券源申请时：若为意向券需维护该字段,注：0.1即为10%
        self.lend_qty = 0 # 可出借数量
        self.reallend_qty = 0 # 发布出借数量
        self.match_qty = 0 # 已成交数量
        self.market = None # 交易市场
        self.term_code = None # 期限(天)
        self.lend_qty_des = None # 出借数量描述
        self.remark = None # 备注
        self.sys_date = None # 系统日期
        self.req_qty = 0 # 数量：券源申请时使用字段
        self.prepare_date = ""  # 筹券开始日期：券源申请时使用字段
        self.prepare_date_end = "" # 筹券结束日期：券源申请时使用字段
        self.error_msg = None # 错误信息
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
### `策略对象-Strategy` <Badge type="warning" text="标准版不支持" />
>策略对象
```python  
class Strategy(Emitter):
    # 策略对象  strategy_platform_type为smart.Type.StrategyPlatformType的某一种  返回一个Strategy对象  然后调用strategy.startStrategy()等方法
    def __init__(self,context,strategyPlatformYype, strategyId):
        super().__init__()
        self.smart = context
        self.strategy_platform_type = strategyPlatformYype # StrategyPlatformType枚举 
        self.strategy_id = strategyId
        self.status = StrategyStatus.Unknown
        self.isPrivate = False # 是否是私有策略
        self.status_name = "未知"
        self.round_list = [] # 当天策略启动的轮次信息   一个策略对象，alphax同时只能start一次，形成一个round对象，round_list是该策略当天历次启动的列表；对algo一个策略对象可同时start多次，形成多个round对象，round_list也是当天历次启动的列表，每个round_id对algo就是parent_order_id
        self.last_round = None # 最后执行的轮次对象
        self.strategy_position_list = [] # 该策略的实时持仓 StrategyPosition对象集合
        self.strategy_order_list = [] # 该策略实时委托列表 Order对象集合
        self.strategy_trade_list = [] # 该策略的实时成交回报 Trade对象集合
        self.relation_account_map = {} # 该策略涉及的资金账号
        self.data = {} # 策略的详细数据
        self.runtime_id = ""
```
### `算法平台策略-AlgoXStrategy` <Badge type="warning" text="标准版不支持" />
>算法平台策略
```python  
class AlgoXStrategy(Strategy):
    def __init__(self,context, strategy_id):
        super().__init__(context,StrategyPlatformType.Algo, strategy_id)
        self.orderMap = {}
        self.tradeMap = {}
        self.account = self.smart.current_account
        self.configdata = {}
        self.mclientStrategyId = ""
        self.mxtpStrategyId = ""
        self.started = False
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

* `marketData` String(必填) - 行情对象
* `flag` String(必填) - 盘口。涨停:H；跌停:L；现价:P；买一到买五分别为：B1、B2、B3、B4、B5；卖一到卖五分别为：S1、S2、S3、S4、S5。
返回价格，类型是数字

```python
smart.utils.getBestPrice(marketData, flag)
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
