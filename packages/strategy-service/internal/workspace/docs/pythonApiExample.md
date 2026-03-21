---
title: Python组件API使用样例
---
## 基础API示例

### 订阅行情及接收行情推送
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

### 订阅指数行情及接收指数行情推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #订阅指数行情
    def subscribe_callback(quoteList, err):
        if err:
            logger.debug("get error from subscribe:%s",err)
        else:
            for i in range(len(quoteList)):
                logger.debug("subscribe_index quote:%s", smart.utils.toString(quoteList[i]))
                # 输出：{"source_id": "xtp", "trading_day": "20240402", "rcv_time": "20240402145804000", "data_time": "20240402145804000", "instrument_id": "000001", "exchange_id": "SSE", "instrument_type": 5, "pre_close_price": 2952.5957, "pre_settlement_price": null, "last_price": 2967.6828, "volume": 22373065001, "turnover": 230451555146, "pre_open_interest": null, "open_interest": null, "open_price": 2947.0866, "high_price": 2975.1856, "low_price": 2946.1389, "upper_limit_price": 9999, "lower_limit_price": 0, "close_price": 1.6401, "settlement_price": null, "bid_price": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "ask_price": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bid_volume": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "ask_volume": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "code": "000001.SH", "avg_price": 0, "iopv": 0, "instrument_status": ""}
    smart.current_account.subscribe_index(instruments=["000001", "CESCPD", "931646"], callback=subscribe_callback)

    #接收指数行情
    def on_quote_callback(quote):
        if quote.instrument_type == smart.Type.InstrumentType.Index:
            logger.debug("get on_quote: %s",smart.utils.toString(quote))
            # 输出：{"source_id": "xtp", "trading_day": "20240402", "rcv_time": "20240402145804000", "data_time": "20240402145804000", "instrument_id": "000001", "exchange_id": "SSE", "instrument_type": 5, "pre_close_price": 2952.5957, "pre_settlement_price": null, "last_price": 2967.6828, "volume": 22373065001, "turnover": 230451555146, "pre_open_interest": null, "open_interest": null, "open_price": 2947.0866, "high_price": 2975.1856, "low_price": 2946.1389, "upper_limit_price": 9999, "lower_limit_price": 0, "close_price": 1.6401, "settlement_price": null, "bid_price": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "ask_price": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "bid_volume": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "ask_volume": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "code": "000001.SH", "avg_price": 0, "iopv": 0, "instrument_status": ""}
            #取消订阅指数行情
            smart.current_account.unsubscribe_index([quote.instrument_id])
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

### 委托下单
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

### 委托撤单
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def cancel_callback(data,err):
        if(err):
            logger.debug("get error from cancel_insert:%s",err)
            # 输出：RspError({'code': '9003', 'message': KeyError('')})
        else:
            logger.debug("get cancel_insert:%s",data)
            # 输出：{'orderXtpId': '37906458003637226', 'userName': '253191000961', 'reqID': '00000000007', 'requestID': 'cancelOrder_18'}
    smart.cancel_order(account_id=None, order_id="37906458003637226", cb=cancel_callback)
        
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

### 订阅及取消订阅ETF折溢价预期利润
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    #订阅ETF折溢价预期利润，第一次订阅没有缓存，回调正常返回空
    def etfProfitCB(arr,err):
        if(err):
            logger.debug("get error from subscribeETFProfit:%s",err)
        else:
            for i in range(len(arr)):
                if ((i+1)==len(arr)):
                    logger.debug("subscribeETFProfitTest【OK】:%s",smart.utils.toString(arr[i]))
                    # 输出：{"instrument_id": "588460", "iopv": 0.8998, "iopv_buy": 0.8995, "iopv_sale": 0.9002, "diopv": 0.8997, "dis_profit": -3137.442789999935, "pre_profit": -541.2358000000652}
    smart.subscribeETFProfit(etfProfitCB)

    #接收ETF折溢价预期利润
    def on_etf_profit(etfProfit):
        logger.debug(f"on_etf_profit:{smart.utils.toString(etfProfit)}")
        # 输出：{"instrument_id": "159869", "iopv": 1.0179, "iopv_buy": 1.0177, "iopv_sale": 1.0188, "diopv": 1.0184, "dis_profit": -2040.7242999999814, "pre_profit": -1073.9139600000187}
    smart.on(smart.Event.ON_ETF_PROFIT, on_etf_profit)

    # 取消订阅ETF折溢价预期利润
    def time_callback():
        smart.unsubscribeETFProfit()
    smart.add_timer(2000, time_callback)

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


### 查询设置中的设置项
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    def getSysCB(data,err):
        if(err):
            logger.debug("get error from getSystemSet:%s",err)
        else:
            logger.debug("get getSystemSet:%s",smart.utils.toString(data))
            # 输出：{"isModal": true, "isDbWithdrawal": false, "isHideMarketCompo": false, "isClearData": true, "isSystemModalCLose": true, "isGeneralMaxValue": false, "generalMaxValue": 0, "splitUnitType": 0, "isClickQuantity": false, "splitMaxMarketValue": 50000, "splitMaxSplitQty": 50000, "splitMinRandomQty": 10000, "splitMaxRandomQty": 50000, "splitMinMarketValue": 10000, "etfRate": {"sh_etf_sx": 4.5e-05, "sh_etf_min_sx": 5, "sz_etf_sx": 4.87e-05, "sz_etf_min_sx": 5, "sh_etf_gh": 0.0005, "sz_etf_gh": 0.00025, "sh_stock_sx": 0.00015, "sh_stock_min_sx": 5, "sz_stock_sx": 0.00015, "sz_stock_min_sx": 5, "sh_stock_gh": 1e-05, "sz_stock_gh": 0, "cross_sh_stock_sx": 0.0005, "cross_sz_stock_sx": 0.0005, "buy_yh": 0, "sell_yh": 0.001, "is_del_fee": true, "is_use": true}, "etfMonitor": false, "etfCancel": false, "etfPreStockPK": "S1", "etfUpperBuy": false, "etfPreAuto": false, "etfDisSingleAuto": false, "etfDisCrossAuto": false, "fundFee": {}}
    smart.getSystemSet(getSysCB)
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

### 查询证券信息根据证券代码和交易所
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

### 查询可交易的ETF列表
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def getETFListCB(arr,err):
        if(err):
            logger.debug("get error from getETFList:%s",err)
        else:
            logger.debug("get getETFList length:%d",len(arr))
            for i in range(len(arr)):
                if ((i+1)==len(arr)):
                    logger.debug("get getETFList:%s",smart.utils.toString(arr[i]))
                    # 输出：{"instrument_id": "159601", "instrument_name": "A50ETF", "instrument_type": "Fund", "instrument_type_ext": "XTP_SECURITY_ETF_INTER_MARKET_STOCK", "exchange_id": "SZE", "exchange_id_name": "深交所", "xtp_market_type": "XTP_MKT_SZ_A", "name_py": "a50etf", "price_tick": 0.001, "precision": 3, "buy_volume_unit": 100, "sell_volume_unit": 1, "bid_volume_unit": 100, "ask_volume_unit": 1, "bid_upper_limit_volume": 1000000, "bid_lower_limit_volume": 100, "ask_upper_limit_volume": 1000000, "ask_lower_limit_volume": 1, "market_bid_volume_unit": 100, "market_ask_volume_unit": 1, "market_bid_upper_limit_volume": 1000000, "market_bid_lower_limit_volume": 100, "market_ask_upper_limit_volume": 1000000, "market_ask_lower_limit_volume": 1, "pre_close_price": 0.784, "upper_limit_price": 0.862, "lower_limit_price": 0.7060000000000001, "is_registration": false, "kw": "A50ETF", "code": "159601.SZ", "cash_component": 1671.42, "estimate_amount": 2261.42, "max_cash_ratio": 0.5, "net_value": 0.7837, "redemption_status": 1, "total_amount": 2037534.42, "unit": 2600000, "basket": []}
    #查询可交易的ETF列表
    smart.getETFList(getETFListCB)
    
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

### 查询ETF成分股列表
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    def getETFBasketCB(arr,err):
        if(err):
            logger.debug("get error from getETFBasket:%s",err)
        else:
            logger.debug("get getETFBasket length:%d",len(arr))
            for i in range(len(arr)):
                if ((i+1)==len(arr)):
                    logger.debug("get getETFBasket:%s",smart.utils.toString(arr[i]))
                    # 输出：{"instrument_id": "688599", "instrument_name": "天合光能", "instrument_type": "Stock", "instrument_type_ext": "XTP_SECURITY_TECH_BOARD", "exchange_id": "SSE", "exchange_id_name": "上交所", "xtp_market_type": "XTP_MKT_SH_A", "name_py": "thgn", "price_tick": 0.01, "precision": 2, "buy_volume_unit": 1, "sell_volume_unit": 1, "bid_volume_unit": 1, "ask_volume_unit": 1, "bid_upper_limit_volume": 100000, "bid_lower_limit_volume": 200, "ask_upper_limit_volume": 100000, "ask_lower_limit_volume": 200, "market_bid_volume_unit": 1, "market_ask_volume_unit": 1, "market_bid_upper_limit_volume": 50000, "market_bid_lower_limit_volume": 200, "market_ask_upper_limit_volume": 50000, "market_ask_lower_limit_volume": 200, "pre_close_price": 36.02, "upper_limit_price": 43.22, "lower_limit_price": 28.82, "is_registration": true, "kw": "天合光能", "code": "688599.SH", "amount": 0, "creation_amount": 0, "creation_premium_ratio": 0.1, "premium_ratio": 0.1, "quantity": 374, "redemption_amount": 0, "redemption_discount_ratio": 0, "replace_type": "ERT_CASH_OPTIONAL", "ticker": "510050"}
    smart.getETFBasket("510050",getETFBasketCB)
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

### 查询可交易的IPO列表
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    def getIPOListCB(arr,err):
        if(err):
            logger.debug("get error from getIPOList:%s",err)
        else:
            logger.debug("get getIPOList length:%d",len(arr))
            for i in range(len(arr)):
                if ((i+1)==len(arr)):
                    logger.debug("get getIPOList:%s",smart.utils.toString(arr[i]))
                    # 输出：{"instrument_id": "304129", "instrument_name": "创测204", "instrument_type": 1, "instrument_type_ext": "XTP_TICKER_TYPE_STOCK", "exchange_id": "SZE", "exchange_id_name": "深交所", "xtp_market_type": "XTP_MKT_SZ_A", "name_py": null, "price_tick": null, "precision": null, "buy_volume_unit": null, "sell_volume_unit": null, "bid_volume_unit": null, "ask_volume_unit": null, "bid_upper_limit_volume": null, "bid_lower_limit_volume": null, "ask_upper_limit_volume": null, "ask_lower_limit_volume": null, "market_bid_volume_unit": null, "market_ask_volume_unit": null, "market_bid_upper_limit_volume": null, "market_bid_lower_limit_volume": null, "market_ask_upper_limit_volume": null, "market_ask_lower_limit_volume": null, "pre_close_price": null, "upper_limit_price": null, "lower_limit_price": null, "is_registration": null, "kw": null, "code": "304129.SZ", "price": 11.25, "qty_upper_limit": 260000, "unit": 500}
    smart.getIPOList(getIPOListCB)
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

### 查询自选股列表
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

### 查询国债逆回购列表
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    def getBondReverseRepoListCB(data,err):
        if(err):
            logger.debug("get error from getBondReverseRepoList:%s",err)
        else:
            logger.debug("get getBondReverseRepoList length:%s",len(data))
            for i in range(len(data)):
                if ((i+1)==len(data)):
                    logger.debug("get getBondReverseRepoList:%s",smart.utils.toString(data[i]))
                    # 输出：{"instrument_id": "204182", "instrument_name": "GC182", "instrument_type": "Bond", "instrument_type_ext": "XTP_SECURITY_NATIONAL_BOND_REVERSE_REPO", "exchange_id": "SSE", "exchange_id_name": "上交所", "xtp_market_type": "XTP_MKT_SH_A", "name_py": "gc182", "price_tick": 0.005, "precision": 3, "buy_volume_unit": 10, "sell_volume_unit": 10, "bid_volume_unit": 10, "ask_volume_unit": 10, "bid_upper_limit_volume": 100000000, "bid_lower_limit_volume": 10, "ask_upper_limit_volume": 100000000, "ask_lower_limit_volume": 10, "market_bid_volume_unit": 10, "market_ask_volume_unit": 10, "market_bid_upper_limit_volume": 100000000, "market_bid_lower_limit_volume": 10, "market_ask_upper_limit_volume": 100000000, "market_ask_lower_limit_volume": 10, "pre_close_price": 1.99, "upper_limit_price": 9999.995, "lower_limit_price": 0.005, "is_registration": false, "kw": "GC182", "code": "204182.SH"}
    smart.getBondReverseRepoList(getBondReverseRepoListCB)
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

### 查询可转债信息 <Badge type="warning" text="标准版不支持" />
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    def getConvertableBondCB(convertableBond, error):
        if error:
            logger.error(f"getConvertableBond error:{error}")
        else:
            logger.debug(f"getConvertableBond:{smart.utils.toString(convertableBond)}")
            # 输出：{"instrument_id": "113658", "instrument_name": "密卫转债", "instrument_type": 3, "instrument_type_ext": "XTP_SECURITY_CONVERTABLE_BOND", "exchange_id": "SSE", "exchange_id_name": "上交所", "xtp_market_type": "XTP_MKT_SH_A", "name_py": "mwzz", "price_tick": 0.001, "precision": 3, "buy_volume_unit": 10, "sell_volume_unit": 10, "bid_volume_unit": 10, "ask_volume_unit": 10, "bid_upper_limit_volume": 1000000, "bid_lower_limit_volume": 10, "ask_upper_limit_volume": 1000000, "ask_lower_limit_volume": 10, "market_bid_volume_unit": 10, "market_ask_volume_unit": 10, "market_bid_upper_limit_volume": 1000000, "market_bid_lower_limit_volume": 10, "market_ask_upper_limit_volume": 1000000, "market_ask_lower_limit_volume": 10, "pre_close_price": 107.083, "upper_limit_price": 128.5, "lower_limit_price": 85.66600000000001, "is_registration": false, "kw": "密卫转债", "code": "113658.SH", "qtyMax": 999999990, "qtyMin": 10, "swapFlag": 1, "swapPrice": 134.07, "underlyingTicker": "603713", "unit": 10}
    smart.getConvertableBond("113658.SH", getConvertableBondCB)
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

### 获取国债逆回购列表
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    reverse_repo_list = smart.reverse_repo_list
    logger.debug("get reverse_repo_list:%s",smart.utils.toString(reverse_repo_list[1]))
    # 输出：{"instrument_id": "131801", "instrument_name": "Ｒ-007", "instrument_type": "Bond", "instrument_type_ext": "XTP_SECURITY_NATIONAL_BOND_REVERSE_REPO", "exchange_id": "SZE", "exchange_id_name": "深交所", "xtp_market_type": "XTP_MKT_SZ_A", "name_py": "r-007", "price_tick": 0.005, "precision": 3, "buy_volume_unit": 10, "sell_volume_unit": 10, "bid_volume_unit": 10, "ask_volume_unit": 10, "bid_upper_limit_volume": 100000000, "bid_lower_limit_volume": 10, "ask_upper_limit_volume": 100000000, "ask_lower_limit_volume": 10, "market_bid_volume_unit": 10, "market_ask_volume_unit": 10, "market_bid_upper_limit_volume": 100000000, "market_bid_lower_limit_volume": 10, "market_ask_upper_limit_volume": 100000000, "market_ask_lower_limit_volume": 10, "pre_close_price": 1.925, "upper_limit_price": 999999999.9999001, "lower_limit_price": 0.005, "is_registration": false, "kw": "R-007", "code": "131801.SZ"}
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

### 国债逆回购下单
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
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(order))
            # 输出：{"rcv_time": null, "order_id": "37906458003637231", "source_order_id": "37906458003637231", "insert_time": null, "update_time": null, "trading_day": null, "instrument_id": "204001", "exchange_id": "SSE", "account_id": "253191000961", "client_id": "5f8d1871-3b32-11ee-b730-3319f43f98a4", "instrument_type": 3, "limit_price": 1.965, "frozen_price": 1.965, "volume": 200, "volume_traded": 0, "volume_left": 200, "tax": null, "commission": null, "status": 1, "error_id": null, "error_msg": null, "side": 2, "offset": 100, "price_type": 1, "volume_condition": 0, "time_condition": 2, "parent_order_id": null, "code": "204001.SH", "traffic": "frontpy", "traffic_sub_id": "PythonDemo-_dev_", "cancel_time": null, "order_cancel_client_id": null, "order_cancel_xtp_id": null, "instrument_name": "GC001", "trade_amount": 0, "xtp_business_type": "XTP_BUSINESS_TYPE_REPO", "xtp_market_type": "XTP_MKT_SH_A", "xtp_price_type": "XTP_PRICE_LIMIT", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_SELL", "xtp_order_status": "XTP_ORDER_STATUS_INIT", "exchange_id_name": "上交所", "instrument_type_name": "债券", "status_name": "初始化", "side_name": "卖", "offset_name": "初始值", "price_type_name": "限价", "xtp_business_type_name": "回购业务", "xtp_market_name": "沪A", "xtp_price_type_name": "限价", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "借出", "xtp_order_status_name": "初始化", "volume_condition_name": "任何数量", "time_condition_name": "本节有效", "traffic_name": "Python策略", "business_type": "frontpy"}
    smart.insert_order(
        instrument_id="204001",
        exchange_id=smart.Type.Exchange.SSE,
        limit_price=1.965,  # 年化收益
        volume=200,
        price_type=smart.Type.PriceType.Limit,
        side=smart.Type.Side.Sell,
        offset=smart.Type.Offset.Init,
        business_type=smart.Type.BusinessType.REPO,
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


### 获取所有证券列表
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    # 所有证券列表
    instrument_list = smart.instrument_list
    logger.debug("get instrument_list:%s",smart.utils.toString(instrument_list[1]))
    # 输出：{"instrument_id": "000001", "instrument_name": "上证指数", "instrument_type": "Index", "instrument_type_ext": "XTP_SECURITY_INDEX", "exchange_id": "SSE", "exchange_id_name": "上交所", "xtp_market_type": "XTP_MKT_SH_A", "name_py": "szzs", "price_tick": 0.0001, "precision": 4, "buy_volume_unit": 0, "sell_volume_unit": 0, "bid_volume_unit": 0, "ask_volume_unit": 0, "bid_upper_limit_volume": 0, "bid_lower_limit_volume": 0, "ask_upper_limit_volume": 0, "ask_lower_limit_volume": 0, "market_bid_volume_unit": 0, "market_ask_volume_unit": 0, "market_bid_upper_limit_volume": 0, "market_bid_lower_limit_volume": 0, "market_ask_upper_limit_volume": 0, "market_ask_lower_limit_volume": 0, "pre_close_price": 3189.248, "upper_limit_price": 9999.9999, "lower_limit_price": 0, "is_registration": false, "kw": "上证指数", "code": "000001.SH"}

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

### 获取证券列表按照证券代码_市场 
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    # 证券列表 key为证券代码_市场  方便查找证券
    instrument_map = smart.instrument_map
    logger.debug("get instrument_map:%s",smart.utils.toString(instrument_map['000001_SZE']))
    # 输出：{"instrument_id": "000001", "instrument_name": "平安银行", "instrument_type": "Stock", "instrument_type_ext": "XTP_SECURITY_MAIN_BOARD", "exchange_id": "SZE", "exchange_id_name": "深交所", "xtp_market_type": "XTP_MKT_SZ_A", "name_py": "payh", "price_tick": 0.01, "precision": 2, "buy_volume_unit": 100, "sell_volume_unit": 1, "bid_volume_unit": 100, "ask_volume_unit": 1, "bid_upper_limit_volume": 1000000, "bid_lower_limit_volume": 100, "ask_upper_limit_volume": 1000000, "ask_lower_limit_volume": 1, "market_bid_volume_unit": 100, "market_ask_volume_unit": 1, "market_bid_upper_limit_volume": 1000000, "market_bid_lower_limit_volume": 100, "market_ask_upper_limit_volume": 1000000, "market_ask_lower_limit_volume": 1, "pre_close_price": 11.67, "upper_limit_price": 12.84, "lower_limit_price": 10.5, "is_registration": false, "kw": "平安银行", "code": "000001.SZ"}

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

### 获取证券列表按照类型分类
```python
from smart import *
import logging
logger = logging.getLogger()

def init():
    # 按照类型分类的证券列表 
    fund_list = smart.instrument_map_by_type[smart.Type.InstrumentType.Fund]
    logger.debug("get instrument_map_by_type:%s", smart.utils.toString(fund_list[0]))
    # 输出：{"instrument_id": "159001", "instrument_name": "货币ETF", "instrument_type": 6, "instrument_type_ext": "XTP_SECURITY_MONETARY_FUND_SZ", "exchange_id": "SZE", "exchange_id_name": "深交所", "xtp_market_type": "XTP_MKT_SZ_A", "name_py": "hbetf", "price_tick": 0.001, "precision": 3, "buy_volume_unit": 100, "sell_volume_unit": 1, "bid_volume_unit": 100, "ask_volume_unit": 1, "bid_upper_limit_volume": 1000000, "bid_lower_limit_volume": 1, "ask_upper_limit_volume": 1000000, "ask_lower_limit_volume": 1, "market_bid_volume_unit": 100, "market_ask_volume_unit": 1, "market_bid_upper_limit_volume": 1000000, "market_bid_lower_limit_volume": 1, "market_ask_upper_limit_volume": 1000000, "market_ask_lower_limit_volume": 1, "pre_close_price": 100, "upper_limit_price": 110, "lower_limit_price": 90, "is_registration": false, "kw": "货币ETF", "code": "159001.SZ"}

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

### 消息通知弹窗
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

### 接收委托信息推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #接收委托推送 不保序
    def callback(order):
        logger.debug("get on_order: %s",smart.utils.toString(order))
        # 输出：{"rcv_time": 20230815150122628, "order_id": "37906458003637233", "source_order_id": "37906458003637233", "insert_time": 20230815150122612, "update_time": 20230815150122628, "trading_day": "20230815", "instrument_id": "600000", "exchange_id": "SSE", "account_id": "253191000961", "client_id": 13, "instrument_type": 1, "limit_price": 7.17, "frozen_price": 7.17, "volume": 100, "volume_traded": 50, "volume_left": 50, "tax": null, "commission": null, "status": 7, "error_id": 0, "error_msg": "", "side": 1, "offset": 100, "price_type": 1, "volume_condition": 0, "time_condition": 2, "parent_order_id": "cm_8aebd4f0-3b39-11ee-b730-3319f43f98a4", "code": "600000.SH", "traffic": "common", "traffic_sub_id": "", "cancel_time": 0, "order_cancel_client_id": 0, "order_cancel_xtp_id": "0", "instrument_name": "浦发银行", "trade_amount": 358.5, "xtp_business_type": "XTP_BUSINESS_TYPE_CASH", "xtp_market_type": "XTP_MKT_SH_A", "xtp_price_type": "XTP_PRICE_LIMIT", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_BUY", "xtp_order_status": "XTP_ORDER_STATUS_PARTTRADEDQUEUEING", "exchange_id_name": "上交所", "instrument_type_name": "股票", "status_name": "部分成交", "side_name": "买", "offset_name": "初始值", "price_type_name": "限价", "xtp_business_type_name": "普通股票", "xtp_market_name": "沪A", "xtp_price_type_name": "限价", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "买", "xtp_order_status_name": "部分成交", "volume_condition_name": "任何数量", "time_condition_name": "本节有效", "traffic_name": "普通下单", "business_type": "common"}
    smart.current_account.on_order(callback)

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

### 接收成交回报推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #接收成交回报推送 不保序
    def callback(trade):
        logger.debug("get on_trade: %s",smart.utils.toString(trade))
        # 输出：{"rcv_time": 20230815150550932, "order_id": "37906458003637235", "parent_order_id": "cm_2ad7c5f0-3b3a-11ee-b730-3319f43f98a4", "trade_time": 20230815150550932, "instrument_id": "600000", "exchange_id": "SSE", "account_id": "253191000961", "client_id": 13, "instrument_type": 1, "side": 1, "offset": 100, "price": 7.17, "volume": 1000, "tax": null, "commission": null, "code": "600000.SH", "traffic": "common", "traffic_sub_id": "", "instrument_name": "浦发银行", "trade_amount": 7170, "xtp_business_type": "XTP_BUSINESS_TYPE_CASH", "xtp_market_type": "XTP_MKT_SH_A", "xtp_exec_id": "0000000000001198", "xtp_report_index": "6549825126420", "xtp_order_exch_id": "0141020000001262", "xtp_trade_type": "0", "xtp_branch_pbu": "13688", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_BUY", "exchange_id_name": "上交所", "instrument_type_name": "股票", "side_name": "买", "offset_name": "初始值", "xtp_business_type_name": "普通股票", "xtp_market_name": "沪A", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "买", "traffic_name": "普通下单", "xtp_trade_type_name": "普通成交", "business_type": "", "_rowid": "XTP_BUSINESS_TYPE_CASH_XTP_MKT_SH_A_0000000000001198_XTP_SIDE_BUY_600000_0"}
    smart.current_account.on_trade(callback)

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

### 接收资产变化推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #接收资产变化推送
    def callback(assets):
        logger.debug("get on_assets: %s",smart.utils.toString(assets))
        # 输出：{"banlance": 0, "buying_power": 999919485.65, "captial_asset": 0, "deposit_withdraw": 0, "force_freeze_amount": 0, "frozen_exec_cash": 0, "frozen_exec_fee": 0, "frozen_margin": 0, "fund_buy_amount": 58534.5, "fund_buy_fee": 135.26, "fund_sell_amount": 0, "fund_sell_fee": 0, "orig_banlance": 0, "pay_later": 0, "preadva_pay": 0, "preferred_amount": 0, "security_asset": 0, "total_asset": 999941330.24, "market_value": 4267231298.5, "trade_netting": 0, "withholding_amount": 21844.59, "update_time": "15:08:52", "all_asset": 0, "all_debt": 0, "guaranty": 0, "line_of_credit": 0, "maintenance_ratio": 0, "remain_amount": 0, "security_interest": 0, "cash_remain_amt": 0, "cash_interest": 0, "extras_money": 0}
    smart.current_account.on_assets(callback)

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

### 接收持仓变化推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #接收持仓变化推送
    def callback(position):
        logger.debug("get on_position: %s",smart.utils.toString(position))
        # 输出： {"instrument_id": "000001", "instrument_name": "平安银行", "exchange_id": "SZE", "exchange_id_name": "深交所", "direction": 2, "direction_name": "净", "name_py": "payh", "volume": 5000500, "sellable_volume": 5000000, "position_cost_price": 1.001, "last_price": 0, "market_value": 0, "unrealized_pnl": 0, "yesterday_volume": 5000000, "purchase_redeemable_qty": 5000500, "executable_option": 0, "executable_underlying": 0, "locked_position": 0, "usable_locked_position": 0, "xtp_market_type": "XTP_MKT_SZ_A", "xtp_market_name": "深A", "_instrument_id_direction": "000001_2", "code": "000001.SZ", "profit_price": 1.001}
    smart.current_account.on_position(callback)

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

### Python和JS双向通信
> start.py
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def testPy(data):
        logger.debug(f"testPy:{data}")
        # 输出：testPy:{'hi': "It's JS", 'reqID': 'jspy_0', 'reqtype': 1}
        return {"hi":"goodJob"}
        
    smart.registCallableFunction("testPy",testPy)
    smart.callJSFunction("testJS",{"hi":"It's python!"})
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
> src/index.js (首次使用需在终端执行npm install命令，代码编写完成后需在终端执行npm run build命令进行构建发布)
```js
import Vue from 'vue'
import App from './js/App'
import smartx_ui from '@xtp-smart/ui'
import iView from 'iview';

Vue.use(smartx_ui);
Vue.use(iView);
import '!style-loader!css-loader!iview/dist/styles/iview.css';
import '@xtp-smart/style/dist/css/smartx.min.css'

smart.on_init(function () {
	console.log("onInit");

	const globalApp = new Vue({
		render: h => h(App),
	}).$mount('#app');

	let port0 = smart.runPython("./start.py");

    smart.registCallableFunction("testJS",function(data){
        console.log("testJS:",data)
		// 输出：testJS: { hi: 'It\'s python!', reqtype: 1 }

        function testPyHandler(rsp){
            console.log("testPyHandler:",rsp)
			// 输出：testPyHandler: { hi: 'goodJob', reqtype: 1 }
        }
        smart.callPythonFunction(port0,"testPy",{"hi":"It's JS"},testPyHandler)
    })
});
```

### 两融业务下单 <Badge type="warning" text="仅支持两融账户" />
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def insert_callback(data,err):
        if(err):
            logger.debug("get error from insert_order:%s",err)
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(data))
            # 输出：{"rcv_time": null, "order_id": "36223105735067604", "source_order_id": "36223105735067604", "insert_time": null, "update_time": null, "trading_day": null, "instrument_id": "600000", "exchange_id": "SSE", "account_id": "53410900072", "client_id": "bd2beb41-3b3d-11ee-9fa4-190ab0ddfad6", "instrument_type": 1, "limit_price": 7.16, "frozen_price": 7.16, "volume": 200, "volume_traded": 0, "volume_left": 200, "tax": null, "commission": null, "status": 1, "error_id": null, "error_msg": null, "side": 22, "offset": 100, "price_type": 1, "volume_condition": 0, "time_condition": 2, "parent_order_id": null, "code": "600000.SH", "traffic": "frontpy", "traffic_sub_id": "PythonDemo-_dev_", "cancel_time": null, "order_cancel_client_id": null, "order_cancel_xtp_id": null, "instrument_name": "浦发银行", "trade_amount": 0, "xtp_business_type": "XTP_BUSINESS_TYPE_MARGIN", "xtp_market_type": "XTP_MKT_SH_A", "xtp_price_type": "XTP_PRICE_LIMIT", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_SHORT_SELL", "xtp_order_status": "XTP_ORDER_STATUS_INIT", "exchange_id_name": "上交所", "instrument_type_name": "股票", "status_name": "初始化", "side_name": "融券卖出", "offset_name": "初始值", "price_type_name": "限价", "xtp_business_type_name": "融资融券", "xtp_market_name": "沪A", "xtp_price_type_name": "限价", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "融券卖出", "xtp_order_status_name": "初始化", "volume_condition_name": "任何数量", "time_condition_name": "本节有效", "traffic_name": "Python策略", "business_type": "frontpy"}
    smart.current_account.insert_order(
        instrument_id="600000",
        exchange_id=smart.Type.Exchange.SSE,
        limit_price=7.16,
        volume=200,
        side=smart.Type.Side.ShortSell,
        business_type=smart.Type.BusinessType.MARGIN,
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

### 查询信用资产信息 <Badge type="warning" text="仅支持两融账户" />
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()
def init():
    #手动查询信用资产信息，会触发on_assets监听函数
    def queryCreditAssetsCB(assets,err):
        if(assets):logger.debug("get queryCreditAssets: %s",smart.utils.toString(assets))
        # 输出：{"banlance": 0, "buying_power": 90000000, "captial_asset": 0, "deposit_withdraw": 0, "force_freeze_amount": 0, "frozen_exec_cash": 0, "frozen_exec_fee": 0, "frozen_margin": 0, "fund_buy_amount": 0, "fund_buy_fee": 0, "fund_sell_amount": 0, "fund_sell_fee": 0, "orig_banlance": 0, "pay_later": 0, "preadva_pay": 0, "preferred_amount": 0, "security_asset": 0, "total_asset": 100001422.51, "market_value": 2146358.5, "trade_netting": 0, "withholding_amount": 0, "update_time": "15:34:59", "all_asset": 102151777.51, "all_debt": 1080181.37, "guaranty": 99295205.05, "line_of_credit": 49997128.97, "maintenance_ratio": 94.56909769699139, "remain_amount": 863761.37, "security_interest": 650.98, "cash_remain_amt": 863110.39, "cash_interest": 1797.29, "extras_money": 0}
        if(not assets):logger.debug("get queryCreditAssets FAIL :%s",err)
    smart.current_account.queryCreditAssets(queryCreditAssetsCB)

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

### 融资融券负债合约推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()
def init():
    #信用融资负债合约增加或变更推送
    def callback(creditDebtFinance):
        logger.debug("get on_credit_debt_finance:%s",smart.utils.toString(creditDebtFinance))
        # 输出：{"debt_id": "534109000720000000000000003", "instrument_id": "600000", "instrument_name": "浦发银行", "exchange_id": "SSE", "exchange_id_name": "上交所", "name_py": "pfyh", "xtp_market_type": "XTP_MKT_SH_A", "remain_amt": 3580, "remain_principal": 3580, "remain_interest": 0, "debt_status": 0, "end_date": "20240214", "orig_end_date": "20240214", "order_xtp_id": "36223105735067605", "order_date": "20230815", "extended": false, "code": "600000.SH"}
    smart.current_account.on_credit_debt_finance(callback)
    

    #信用融券负债合约增加或变更推送
    def callback(creditDebtSecurity):
        logger.debug("get on_credit_debt_security: %s",smart.utils.toString(creditDebtSecurity))
        # 输出：{"debt_id": "534109000720000000000000004", "instrument_id": "600000", "instrument_name": "浦发银行", "exchange_id": "SSE", "exchange_id_name": "上交所", "name_py": "pfyh", "xtp_market_type": "XTP_MKT_SH_A", "due_right_volume": 0, "remain_volume": 1000, "remain_interest": 0, "debt_status": 0, "end_date": "20240214", "orig_end_date": "20240214", "order_xtp_id": "36223105735067607", "order_date": "20230815", "extended": false, "code": "600000.SH"}
    smart.current_account.on_credit_debt_security(callback)
    

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

### 可融券头寸更新推送
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()
def init():
    #可融券头寸更新推送（融券下单可触发更新推送）
    def callback(creditTickerAssignInfo):
        logger.debug("get on_credit_ticker_assign: %s",smart.utils.toString(creditTickerAssignInfo))
        # 输出：{"instrument_id": "000989", "instrument_name": "九 芝 堂", "exchange_id": "SZE", "exchange_id_name": "深交所", "name_py": "jzt", "limit_volume": "0", "left_volume": 74900, "frozen_volume": 0, "yesterday_volume": 0, "xtp_market_type": "XTP_MKT_SZ_A", "code": "000989.SZ"}
    smart.current_account.on_credit_ticker_assign(callback)

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

### 查询券源行情 <Badge type="warning" text="仅支持两融账户" />
```python
from smart import *
from datetime import datetime
import logging
from smart.type import AccountType
from msilib.schema import Error
from subprocess import call
from smart.account import Account
from smart.type import *
from smart import utils
from smart.utils import *
logger = logging.getLogger()

#券源行情查询
def query_source_quote_listTest():
    def querySourceQuoteListCB(sourceQuoteList:list[SourceQuoteInfo],err:RspError):
        for i in range(len(sourceQuoteList)):
            if i < 5:
               logger.debug("sourceQuoteList【OK】前5个:%s",smart.utils.toString(sourceQuoteList[i]))
        logger.debug("sourceQuoteList【OK】:%d",len(sourceQuoteList))
    smart.query_source_quote_list(querySourceQuoteListCB)

def init():
    query_source_quote_listTest()
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

### 提交券源申请 <Badge type="warning" text="仅支持两融账户" />
```python
from smart import *
from datetime import datetime
import logging
from smart.type import AccountType
from msilib.schema import Error
from subprocess import call
from smart.account import Account
from smart.type import *
from smart import utils
from smart.utils import *
logger = logging.getLogger()

def account_do_apply(sourceQuoteApplyList:list[SourceQuoteInfo]):
    if not sourceQuoteApplyList:
        return

    def callback(suclist:list[SourceQuoteInfo],err:RspError):
        if err: #券源申请推送:存在失败
            logger.debug("credit_ticker_applyCallback【error】:%s",err)
            errList =  [] if type(err)!= dict or not 'value' in err.keys() else err["value"]
            if errList: #券源申请推送：失败数据
                for i in range(len(errList)):
                    logger.debug("credit_ticker_applyCallback【error】:%s",smart.utils.toString(errList[i]))  
            if suclist:#券源申请推送：成功数据
                for i in range(len(suclist)):
                    logger.debug("credit_ticker_applyCallback【success】:%s",smart.utils.toString(suclist[i]))                
        else: #券源申请推送全部成
            if suclist:#券源申请推送：成功数据
                for i in range(len(suclist)):
                    logger.debug("credit_ticker_apply【success】:%s",smart.utils.toString(suclist[i]))     
    try:
        for item in sourceQuoteApplyList:
            if item.quotation_type=='1' and item.sno =='1':
                # item.term_rate=0.1
                item.req_qty=200
            elif item.quotation_type=='1':
                item.term_rate=0.1
                item.req_qty=200
        smart.current_account.submit_source_apply(sourceQuoteApplyList,callback)
    except Exception as err:
        logger.error(err,exc_info=True, stack_info=True)

#券源申请
def account_apply_sourceTest():
    #先获取券源，再进行循环券源行情集合->库存券对数量赋值,意向券对费率、数量赋值->券源申请
    def quoteCallback(sourceQuoteList:list[smart.Type.SourceQuoteInfo],err:RspError):
        # newList = sourceQuoteList[:4]
        newList = []
        for item in sourceQuoteList:
            if  item.sno =='1' or item.sno =='852':
                newList.append(item)
        #新增加券源
        sourceQuoteInfo = SourceQuoteInfo()
        sourceQuoteInfo.sno = '123'
        sourceQuoteInfo.stk_code = '000001'
        sourceQuoteInfo.stk_name = '平安银行'
        sourceQuoteInfo.quotation_type = '1'
        sourceQuoteInfo.market = '0'
        sourceQuoteInfo.term_code = '12'
        sourceQuoteInfo.term_rate = '0.0001'
        sourceQuoteInfo.req_qty=200
        sourceQuoteInfo.prepare_date='20230221'
        sourceQuoteInfo.prepare_date_end='20230221'
        newList.append(sourceQuoteInfo)
        account_do_apply(newList)
    smart.query_source_quote_list(quoteCallback)

def init():
    account_apply_sourceTest()
    

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

### 订阅bar行情及接收行情推送
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

### 异步-获取当天任意分钟的bar行情
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

### 同步-获取当天任意分钟的bar行情
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

### `同步-获取历史bar数据-query_bar`
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
    "period": "5m", #String(选填) 频次 仅支持1m 5m 15m 30m 60m 1d 1w 默认1d,(m代表分钟，d代表天，w代表周)
    "adjust_type": "pre" #String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    }
    datalist = smart.query_bar(inParams) # 正常传值
    #返回结果为bar实体的数组            
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("query_bar【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #query_bar【OK】前5个:{"type": "bar_5min", "code": "000001.SZ", "instrument_id": "000001", "exchange_id": "SZE", "trading_day": "2024-01-12", "source_id": "xtp", "start_time": "2024-01-12 09:55:00", "end_time": "2024-01-12 10:00:00", "time_interval": "5m", "period": "5m","high": 9.2, "low": 9.17, "open": 9.19, "close": 9.19, "volume": 2380100, "start_volume": 13549009, "turnover": 21865172, "start_turnover": 123997543}
    logger.debug("query_bar【OK】:%d",len(datalist))
    #query_bar【OK】:43

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
### `通用指标订阅及接收数据推送`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

#方式一：
def methodOne():
    #订阅
    type = "etf"
    codes = ['159915.Sz']
    failList = smart.subscribe_indicator(type, codes)
    if failList:
        logger.debug("存在订阅指标行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅指标行情全部成功")

    def indicator_callback(type, quote):
        logger.debug("通用指标行情:%s", smart.utils.toString(quote))
        # 通用指标行情:{"code": "159915.SZ", "etfData": {"saleEtfProfit": 1777000, "iopvSale": 1.7776, "diopv": 1.7773, "iopvBuy": 1.7767, "buyEtfProfit": 1778000, "sumQuantity": 55200, "shTickerPreAmtSum": 0, "bidQty": 910300, "shTickerDisAmtSum": 0, "hasNoWeightTicker": 0, "askQty": 4319800, "preCashAndEsa": -5617.71, "szTickerPreAmtSum": 1783190, "disCashAndEsa": -5617.71, "szTickerDisAmtSum": 1782357, "estimateAmountDiff": 297.3752, "iopv": 1.7772, "estimateAmountDiff2": -334, "lastPrice": 1.778}, "type": "etf"}
        #取消订阅
        smart.unsubscribe_indicator(type, [quote['code']])
     #监听行情
    smart.on(smart.Event.ON_INDICATOR, indicator_callback)

#方式二：
def methodTwo():
    def on_indicator_callback(type, quote):
        logger.debug("通用指标行情:%s", smart.utils.toString(quote))
        # 通用指标行情:{"code": "159915.SZ", "etfData": {"saleEtfProfit": 1772000, "iopvSale": 1.7729, "diopv": 1.7724, "iopvBuy": 1.7721, "buyEtfProfit": 1773000, "sumQuantity": 55200, "shTickerPreAmtSum": 0, "bidQty": 4495400, "shTickerDisAmtSum": 0, "hasNoWeightTicker": 0, "askQty": 449100, "preCashAndEsa": -5617.71, "szTickerPreAmtSum": 1778471, "disCashAndEsa": -5617.71, "szTickerDisAmtSum": 1777722, "estimateAmountDiff": 300.9766, "iopv": 1.7724, "estimateAmountDiff2": -320, "lastPrice": 1.773}, "type": "etf"}
        #取消订阅
        smart.unsubscribe_indicator(type, [quote['code']])
    #订阅
    type = "etf"
    codes = ['159915.Sz']
    failList = smart.subscribe_indicator(type, codes, on_indicator_callback)
    if failList:
        logger.debug("存在订阅指标行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅指标行情全部成功")
#方式三：
def methodThree():
    type = "etf"
    codes = ['159915.Sz']
    def on_indicator_callback(type, quote):
        logger.debug("通用指标行情:%s", smart.utils.toString(quote))
        # 通用指标行情:{"code": "159915.SZ", "etfData": {"saleEtfProfit": 1772000, "iopvSale": 1.7724, "diopv": 1.7721, "iopvBuy": 1.7717, "buyEtfProfit": 1773000, "sumQuantity": 55200, "shTickerPreAmtSum": 0, "bidQty": 3230700, "shTickerDisAmtSum": 0, "hasNoWeightTicker": 0, "askQty": 2762100, "preCashAndEsa": -5617.71, "szTickerPreAmtSum": 1777981, "disCashAndEsa": -5617.71, "szTickerDisAmtSum": 1777269, "estimateAmountDiff": 299.081, "iopv": 1.7722, "estimateAmountDiff2": -328, "lastPrice": 1.773}, "type": "etf"}
        #取消订阅
        smart.unsubscribe_indicator(type, [quote['code']])
    #订阅
    smart.on_indicator = on_indicator_callback
    failList = smart.subscribe_indicator(type, codes, on_indicator_callback)
    if failList:
        logger.debug("存在订阅指标行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅指标行情全部成功")
def init():
    methodOne()
    methodTwo()
    methodThree()
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
### `异步-获取市场数据-query_market_data_async`
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
### `同步-获取市场数据-query_market_data`
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
### `异步-获取当前交易日及下一交易日-get_trading_day_async`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    def query_callback(tradingDayMap,err:RspError):
        if err:
           logger.debug("查询失败:%s", smart.utils.toString(err))
        else:
            logger.debug("get_trading_day_async【OK】:%s",tradingDayMap)
            # get_trading_day_async【OK】:{'CURRENT_TRDY': '20240613', 'NEXT_TRDY': '20240614'}
            for k,v in tradingDayMap.items():
                logger.debug("get_trading_day_async【OK】:%s,%s", k, v)
                # get_trading_day_async【OK】:CURRENT_TRDY, 20240613
                # get_trading_day_async【OK】:NEXT_TRDY, 20240614
    smart.get_trading_day_async(query_callback)
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
### `同步-获取当前交易日及下一交易日-get_trading_day`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

def query():
    tradingDayMap = smart.get_trading_day()
    logger.debug("get_trading_day【OK】:%s", tradingDayMap)
    # get_trading_day【OK】:{'CURRENT_TRDY': '20240613', 'NEXT_TRDY': '20240614'}
    for k,v in tradingDayMap.items():
        logger.debug("get_trading_day【OK】:%s, %s", k, v)
        # get_trading_day【OK】:CURRENT_TRDY, 20240613
        # get_trading_day【OK】:NEXT_TRDY, 20240614
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
### `异步查询数据-获取历史bar行情`
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
### `异步查询数据-获取市场数据`
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
### `同步查询数据-获取历史bar行情`
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
### `异步查询数据-获取当前交易日及下一交易日`
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
### `同步查询数据-获取当前交易日及下一交易日`
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
### `同步查询数据-获取市场数据`
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
### `异步分页查询数据-获取历史bar数据`
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
### `异步分页查询数据-获取市场数据`
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
### `同步分页查询数据-获取历史bar数据`
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
### `同步分页查询数据-获取市场数据`
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

## 算法API示例

### 创建及启动算法策略 <Badge type="warning" text="标准版不支持" />
```python
from subprocess import call
from smart import *
import traceback
import json
import time
import math
import random
from datetime import datetime
import logging
from smart.account import Account
from smart.type import *
logger = logging.getLogger() 
def init():
    # 1.配置策略参数
    param={
        "start_time":"09:35:00",
        "end_time":"15:00:00",
        "ticker":"300001",
        "market":"SZ",
        "side":"BUY",
        "quantity":1600,
        "limit_action":False,
        "expire_action":False,
        "price":0,
        "business_type":"CASH"
    }
    config = {
        "strategyType": 3101,
        "clientStrategyId":  str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000))),
        "strategyParam": json.dumps(param)
    }  # 各算法编号"strategyType"及配置项参数"strategyParam"详见SmartX SDK API文档createStrategy方法中的"config参数参考文档"

    # 2.创建策略实例
    def createStrategyCallback(strategy,err):
        if(err):
            logger.debug("get error from createStrategy:%s",err)
        else:
            logger.debug("createStrategyCallback:%s", strategy.clent_id)
            # 输出：1693275174576

            # 3.运行策略实例
            def startStrategyCallback(strategy,err):
                if(err):
                    logger.debug("get error from startStrategy:%s",err)
                else:
                    logger.debug("startStrategyCallback:%s", strategy.clent_id)
                    # 输出：1693275174576
            smart.startStrategy(smart.current_account.account_id, Type.StrategyPlatformType.Algo, strategy.clent_id, startStrategyCallback)

            # 4.策略进程状态变化推送
            def statusChangeCallback(rsp):
                logger.debug("get on_strategy_status_change")
                logger.debug("get on_strategy_status_change:%s",smart.utils.toString(rsp))
                # 输出：{"process_name": "strategyStateReport", "strategy_id": "1168434331649", "status": "XTP_STRATEGY_STATE_STARTED", "status_name": "执行中", "strategy_platform_type": "algo", "data": {"childOrderXtpId": "0", "requestId": 0, "lastResp": true, "mclientStrategyId": "1693275174576", "mxtpStrategyId": "1168434331649", "mstrategyType": 3101, "mstrategyState": "XTP_STRATEGY_STATE_STARTED", "resqtype": "strategyStateReport", "errorId": 0, "errorMsg": "", "userName": "315000648", "strategyType": 3101, "clientStrategyId": "1693275174576", "strategyParam": "{\"start_time\": \"09:35:00\", \"end_time\": \"15:00:00\", \"ticker\": \"300001\", \"market\": \"SZ\", \"side\": \"BUY\", \"quantity\": 1600, \"limit_action\": false, \"expire_action\": false, \"price\": 0, \"business_type\": \"CASH\"}", "_disabled": false, "start_time": "09:35:00", "end_time": "15:00:00", "ticker": "300001", "market": "SZ", "side": "BUY", "quantity": 1600, "limit_action": false, "expire_action": false, "price": 0, "business_type": "CASH", "mstrategyOrderedAsset": 0, "mstrategyExecutionAsset": 0, "mstrategyOrderedQty": 0, "mstrategyExecutionQty": 0, "mstrategyAssetDiff": 0, "mstrategyCancelledQty": 0, "mstrategyUnclosedQty": 0, "mstrategyAsset": 0, "mstrategyExecutionPrice": 0, "mstrategyMarketPrice": 0, "mstrategyPriceDiff": 0, "mstrategyQty": 1600, "report_time": "2023-08-29 10:10:06", "order_time": 1693275006506, "merrorInfo": ""}}
            strategy.on_strategy_status_change(statusChangeCallback)
            
    smart.createStrategy(smart.current_account.account_id, Type.StrategyPlatformType.Algo, config.get("clientStrategyId"), config, createStrategyCallback)
    
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

### 快速启动算法策略 <Badge type="warning" text="标准版不支持" />
```python
from subprocess import call
from smart import *
import traceback
import json
import time
import math
import random
from datetime import datetime
import logging
from smart.account import Account
from smart.type import *
logger = logging.getLogger()

def init():
    # 1.配置策略参数
    param={
        "start_time":"09:35:00",
        "end_time":"15:00:00",
        "ticker":"600000",
        "market":"SH",
        "side":"BUY",
        "quantity":1600,
        "limit_action":False,
        "expire_action":False,
        "price":0,
        "business_type":"CASH"
    }
    config = {
        "strategyType": 3101,
        "clientStrategyId":  str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000))),
        "strategyParam": json.dumps(param)
    }  # 各算法编号"strategyType"及配置项参数"strategyParam"详见SmartX SDK API文档createStrategy方法中的"config参数参考文档"
    
    # 2.快速启动算法策略
    def insertAlgoOrderCallback(strategy,err):
        if(err):
            logger.debug("get error from insertAlgoOrder:%s",err)
        else:
            # 3.策略进程状态变化推送
            def statusChangeCallback(rsp):
                logger.debug("get on_strategy_status_change")
                logger.debug("get on_strategy_status_change:%s",smart.utils.toString(rsp))
                # 输出：{"process_name": "strategyStateReport", "strategy_id": "1168434331651", "status": "XTP_STRATEGY_STATE_STARTED", "status_name": "执行中", "strategy_platform_type": "algo", "data": {"childOrderXtpId": "0", "requestId": 0, "lastResp": true, "mclientStrategyId": "1693277414783", "mxtpStrategyId": "1168434331651", "mstrategyType": 3101, "mstrategyState": "XTP_STRATEGY_STATE_STARTED", "resqtype": "strategyStateReport", "errorId": 0, "errorMsg": "", "userName": "315000648", "strategyType": 3101, "clientStrategyId": "1693277414783", "strategyParam": "{\"start_time\": \"09:35:00\", \"end_time\": \"15:00:00\", \"ticker\": \"600000\", \"market\": \"SH\", \"side\": \"BUY\", \"quantity\": 1600, \"limit_action\": false, \"expire_action\": false, \"price\": 0, \"business_type\": \"CASH\"}", "_disabled": false, "start_time": "09:35:00", "end_time": "15:00:00", "ticker": "600000", "market": "SH", "side": "BUY", "quantity": 1600, "limit_action": false, "expire_action": false, "price": 0, "business_type": "CASH", "mstrategyOrderedAsset": 0, "mstrategyExecutionAsset": 0, "mstrategyOrderedQty": 0, "mstrategyExecutionQty": 0, "mstrategyAssetDiff": 0, "mstrategyCancelledQty": 0, "mstrategyUnclosedQty": 0, "mstrategyAsset": 0, "mstrategyExecutionPrice": 0, "mstrategyMarketPrice": 0, "mstrategyPriceDiff": 0, "mstrategyQty": 1600, "report_time": "2023-08-29 10:47:08", "order_time": 1693277228569, "merrorInfo": ""}}
            strategy.on_strategy_status_change(statusChangeCallback)
            
    smart.insertAlgoOrder(smart.current_account.account_id, config.get("clientStrategyId"), config, insertAlgoOrderCallback)
   
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

### 停止算法策略
```python
from subprocess import call
from smart import *
import traceback
import json
import time
import math
import random
from datetime import datetime
import logging
from smart.account import Account
from smart.type import *
logger = logging.getLogger()

def init():
    # 1.配置策略参数
    param={
        "start_time":"09:35:00",
        "end_time":"15:00:00",
        "ticker":"600000",
        "market":"SH",
        "side":"BUY",
        "quantity":1600,
        "limit_action":False,
        "expire_action":False,
        "price":0,
        "business_type":"CASH"
    }
    config = {
        "strategyType": 3101,
        "clientStrategyId":  str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000))),
        "strategyParam": json.dumps(param)
    }  # 各算法编号"strategyType"及配置项参数"strategyParam"详见SmartX SDK API文档createStrategy方法中的"config参数参考文档"
    
    # 2.快速启动算法策略
    def insertAlgoOrderCallback(strategy,err):
        if(err):
            logger.debug("get error from insertAlgoOrder:%s",err)
        else:
            # 3.停止算法策略
            def timeCallback():
                def stopStrategyCallback(stg,err):
                    if(err):
                        logger.debug("get error from stopStrategy:%s",err)
                    else:
                        logger.debug("stopStrategyCallback:%s",stg) 
                        # 输出：{'xtpStrategyId': '1168434331655'}
                strategy.stopStrategy(stopStrategyCallback)
            smart.add_timer(1000,timeCallback)
            
    smart.insertAlgoOrder(smart.current_account.account_id, config.get("clientStrategyId"), config, insertAlgoOrderCallback)
    
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

### 策略进程状态变化推送
```python
from subprocess import call
from smart import *
import traceback
import json
import time
import math
import random
from datetime import datetime
import logging
from smart.account import Account
from smart.type import *
logger = logging.getLogger()

def init():
    # 1.配置策略参数
    param={
        "start_time":"09:35:00",
        "end_time":"15:00:00",
        "ticker":"600000",
        "market":"SH",
        "side":"BUY",
        "quantity":1600,
        "limit_action":False,
        "expire_action":False,
        "price":0,
        "business_type":"CASH"
    }
    config = {
        "strategyType": 3101,
        "clientStrategyId":  str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000))),
        "strategyParam": json.dumps(param)
    }  # 各算法编号"strategyType"及配置项参数"strategyParam"详见SmartX SDK API文档createStrategy方法中的"config参数参考文档"
    
    # 2.快速启动算法策略
    def insertAlgoOrderCallback(strategy,err):
        if(err):
            logger.debug("get error from insertAlgoOrder:%s",err)
        else:
            # 3.策略进程状态变化推送
            def statusChangeCallback(rsp):
                logger.debug("get on_strategy_status_change")
                logger.debug("get on_strategy_status_change:%s",smart.utils.toString(rsp))
                # 输出：{"process_name": "strategyStateReport", "strategy_id": "1168434331651", "status": "XTP_STRATEGY_STATE_STARTED", "status_name": "执行中", "strategy_platform_type": "algo", "data": {"childOrderXtpId": "0", "requestId": 0, "lastResp": true, "mclientStrategyId": "1693277414783", "mxtpStrategyId": "1168434331651", "mstrategyType": 3101, "mstrategyState": "XTP_STRATEGY_STATE_STARTED", "resqtype": "strategyStateReport", "errorId": 0, "errorMsg": "", "userName": "315000648", "strategyType": 3101, "clientStrategyId": "1693277414783", "strategyParam": "{\"start_time\": \"09:35:00\", \"end_time\": \"15:00:00\", \"ticker\": \"600000\", \"market\": \"SH\", \"side\": \"BUY\", \"quantity\": 1600, \"limit_action\": false, \"expire_action\": false, \"price\": 0, \"business_type\": \"CASH\"}", "_disabled": false, "start_time": "09:35:00", "end_time": "15:00:00", "ticker": "600000", "market": "SH", "side": "BUY", "quantity": 1600, "limit_action": false, "expire_action": false, "price": 0, "business_type": "CASH", "mstrategyOrderedAsset": 0, "mstrategyExecutionAsset": 0, "mstrategyOrderedQty": 0, "mstrategyExecutionQty": 0, "mstrategyAssetDiff": 0, "mstrategyCancelledQty": 0, "mstrategyUnclosedQty": 0, "mstrategyAsset": 0, "mstrategyExecutionPrice": 0, "mstrategyMarketPrice": 0, "mstrategyPriceDiff": 0, "mstrategyQty": 1600, "report_time": "2023-08-29 10:47:08", "order_time": 1693277228569, "merrorInfo": ""}}
            strategy.on_strategy_status_change(statusChangeCallback)
            
    smart.insertAlgoOrder(smart.current_account.account_id, config.get("clientStrategyId"), config, insertAlgoOrderCallback)
 
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


### 某策略订阅的行情推送
```python
from subprocess import call
from smart import *
import traceback
import json
import time
import math
import random
from datetime import datetime
import logging
from smart.account import Account
from smart.type import *
logger = logging.getLogger()

def init():
    # 1.配置策略参数
    param={
        "start_time":"09:00:00",
        "end_time":"15:00:00",
        "ticker":"600918",
        "market":"SH",
        "side":"BUY",
        "quantity":1600,
        "limit_action":False,
        "expire_action":False,
        "price":0,
        "business_type":"CASH"
    }
    config = {
        "strategyType": 3103,
        "clientStrategyId":  str(math.floor(time.time()*1000)  + (100000 + math.floor(random.random() * 100000))),
        "strategyParam": json.dumps(param)
    }  # 各算法编号"strategyType"及配置项参数"strategyParam"详见SmartX SDK API文档createStrategy方法中的"config参数参考文档"
    
    # 2.快速启动算法策略
    def insertAlgoOrderCallback(strategy,err):
        if(err):
            logger.debug("get error from insertAlgoOrder:%s",err)
        else:
            # 3.策略订阅行情推送
            strategy.subscribe(instruments=[param.get("ticker")], exchange_id=smart.utils.getExchangeIdFromExchangeStr(param.get("market")))
            def functionCB(quote):
                logger.debug("get on_strategy_quote")
                logger.debug("get on_strategy_quote:%s",smart.utils.toString(quote))
                # 输出：{"source_id": "xtp", "trading_day": "20230830", "rcv_time": "20230830101825000", "data_time": "20230830101825000", "instrument_id": "600918", "exchange_id": "SSE", "instrument_type": 1, "pre_close_price": 7.63, "pre_settlement_price": null, "last_price": 7.54, "volume": 21176215, "turnover": 159023514.8, "pre_open_interest": null, "open_interest": null, "open_price": 7.55, "high_price": 7.6, "low_price": 7.47, "upper_limit_price": 8.39, "lower_limit_price": 6.87, "close_price": 0, "settlement_price": null, "bid_price": [7.53, 7.52, 7.51, 7.5, 7.49, 0, 0, 0, 0, 0], "ask_price": [7.54, 7.55, 7.56, 7.57, 7.58, 0, 0, 0, 0, 0], "bid_volume": [31500, 37500, 88800, 98400, 175200, 0, 0, 0, 0, 0], "ask_volume": [11500, 104300, 66200, 53600, 114900, 0, 0, 0, 0, 0], "code": "600918.SH", "avg_price": 7.50953, "iopv": 0, "instrument_status": "T111"}
            strategy.on_strategy_quote(functionCB)
            
    smart.insertAlgoOrder(smart.current_account.account_id, config.get("clientStrategyId"), config, insertAlgoOrderCallback)
 
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

## Demo示例

### 涨停下单
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger("user")

def init():
    strategy_platform_type = smart.Type.StrategyPlatformType.FrontPy
    strategy_id = None
    instrument_id = "000722"
    price_type = smart.Type.PriceType.Limit
    volume = 200
    side = smart.Type.Side.Buy
    offset = smart.Type.Offset.Init
    order_client_id = 0
    parent_order_id = ""
    business_type = smart.Type.BusinessType.CASH
    account_id = None
    is_level2 = False
    instruments= ['000722']
    exchange_id = smart.Type.Exchange.SZE
    smart.subscribe(account_id,instruments, exchange_id,is_level2)
    quoteCount=0
    #下单委托
    def insert_callback(order,err):
        if(err):
            logger.debug("get error from insert_order:%s",err)
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(order))

    def callback(quote):
        nonlocal quoteCount
        logger.debug("subscribeTest【OK】:%s",smart.utils.toString(quote))
        logger.debug("subscribeTest【OK】:%s,%s",quote.instrument_id,quote.last_price)
        if( quote.upper_limit_price <= quote.last_price and quoteCount<=0):
            quoteCount+=1
            logger.debug("subscribeTest quoteCount:%d",quoteCount)
            smart.insert_order(account_id,strategy_platform_type,strategy_id,instrument_id,exchange_id,quote.last_price,volume,price_type,side,offset,order_client_id,parent_order_id,business_type,insert_callback) 
    smart.on(smart.Event.ON_QUOTE,callback)

    def orderCallback(order):
        logger.debug("subscribeTest orderCallback:%s",smart.utils.toString(order))
    smart.current_account.on_order(orderCallback)

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

### 行情订阅
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

### 融券买卖
```python
from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    def insert_callback(data,err):
        if(err):
            logger.debug("get error from insert_order:%s",err)
        else:
            logger.debug("get insert_order: %s",smart.utils.toString(data))
            # 输出：{"rcv_time": null, "order_id": "36223105735067604", "source_order_id": "36223105735067604", "insert_time": null, "update_time": null, "trading_day": null, "instrument_id": "600000", "exchange_id": "SSE", "account_id": "53410900072", "client_id": "bd2beb41-3b3d-11ee-9fa4-190ab0ddfad6", "instrument_type": 1, "limit_price": 7.16, "frozen_price": 7.16, "volume": 200, "volume_traded": 0, "volume_left": 200, "tax": null, "commission": null, "status": 1, "error_id": null, "error_msg": null, "side": 22, "offset": 100, "price_type": 1, "volume_condition": 0, "time_condition": 2, "parent_order_id": null, "code": "600000.SH", "traffic": "frontpy", "traffic_sub_id": "PythonDemo-_dev_", "cancel_time": null, "order_cancel_client_id": null, "order_cancel_xtp_id": null, "instrument_name": "浦发银行", "trade_amount": 0, "xtp_business_type": "XTP_BUSINESS_TYPE_MARGIN", "xtp_market_type": "XTP_MKT_SH_A", "xtp_price_type": "XTP_PRICE_LIMIT", "xtp_position_effect_type": "XTP_POSITION_EFFECT_INIT", "xtp_side_type": "XTP_SIDE_SHORT_SELL", "xtp_order_status": "XTP_ORDER_STATUS_INIT", "exchange_id_name": "上交所", "instrument_type_name": "股票", "status_name": "初始化", "side_name": "融券卖出", "offset_name": "初始值", "price_type_name": "限价", "xtp_business_type_name": "融资融券", "xtp_market_name": "沪A", "xtp_price_type_name": "限价", "xtp_position_effect_type_name": "初始值", "xtp_side_type_name": "融券卖出", "xtp_order_status_name": "初始化", "volume_condition_name": "任何数量", "time_condition_name": "本节有效", "traffic_name": "Python策略", "business_type": "frontpy"}
    smart.current_account.insert_order(
        instrument_id="600000",
        exchange_id=smart.Type.Exchange.SSE,
        limit_price=7.16,
        volume=200,
        side=smart.Type.Side.ShortSell,
        business_type=smart.Type.BusinessType.MARGIN,
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

### Tushare接口调用
> [Tushare Pro版官网](https://tushare.pro/)
```python
from smart import *
import tushare as ts
import logging
logger = logging.getLogger("user")
import pandas as pd

def init():
    logger.debug(ts.__version__)
    # 输出：1.2.89
    pro = ts.pro_api(token='YOUR_API_TOKEN')  # 需要在Tushare Pro官网注册并获取接口令牌
    pd.set_option('display.max_rows', None)  # 显示所有行
    pd.set_option('display.max_columns', None)  # 显示所有列
    df = pro.query('daily', ts_code='601318.SH', start_date='20230801', end_date='20230813')
    logger.debug(df)
    # 输出：
    #      ts_code trade_date   open   high    low  close  pre_close  change  pct_chg         vol       amount
    # 0  601318.SH   20230811  51.30  51.41  49.35  49.37      51.36   -1.99  -3.8746   748920.93  3751696.963 
    # 1  601318.SH   20230810  51.05  51.47  50.88  51.36      51.26    0.10   0.1951   299263.22  1531979.641 
    # 2  601318.SH   20230809  51.08  51.58  50.95  51.26      51.26    0.00   0.0000   372852.64  1911450.576 
    # 3  601318.SH   20230808  51.47  51.69  50.46  51.26      51.70   -0.44   -0.8511  523263.42  2671294.850  
    # 4  601318.SH   20230807  51.38  51.77  51.20  51.70      51.90   -0.20   -0.3854  436896.13  2246940.970  
    # 5  601318.SH   20230804  53.23  53.85  51.90  51.90      52.41   -0.51   -0.9731 1051652.84  5566174.314
    # 6  601318.SH   20230803  51.41  52.60  51.11  52.41      51.41    1.00    1.9451  654944.21  3398760.968  
    # 7  601318.SH   20230802  51.60  52.56  50.93  51.41      51.74   -0.33   -0.6378  608798.17  3136350.132 
    # 8  601318.SH   20230801  52.50  53.00  51.44  51.74      52.60   -0.86   -1.6350  670613.72  3493879.471 

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
> [Tushare Pro版接口文档](https://tushare.pro/document/2)

### 客户端网格交易
> 客户端网格交易git地址: https://github.com/ztsec/smartx_client_python_grid_trading

> [客户端网格交易视频](https://www.bilibili.com/video/BV1X54y1K7TY/?share_source=copy_web&vd_source=2bbc2ffb0eefbf157aa2dc2163f0059e)

> 网格交易策略有不同的实现，本例的功能是在[excel](../../../res/grid_target.xlsx)文件中定义好要交易的股票及初始的一个基准价格，同时定义好买卖的价差，还有价格的上下限，单次最大的委托数量，买入最大数量，卖出最大数量等条件。实现逻辑是在每一次交易完成后，将成交价格作为新的基准价格，在新的基准价格的基础上，如果再浮动相应的价差，又会做相对应的买入或者卖出委托，买入卖出完成后，又会形成一个新的基准价格，又会在这个基准价格上进行买入卖出操作。往复来实现高抛低吸的网格交易,可以参考[网格交易策略说明](../../../res/InstructionsGrid_target.pdf)。
* 首先，用户要在[excel](../../../res/grid_target.xlsx)配置文件中对各参数进行配置；
* 策略开始运行后，根据用户的配置，接收与标的股票对应的行情数据；
* 在收到行情数据的基础上，根据实时行情价格和基准价格，判断满足交易条件。如果当前价格能够触发策略交易，在满足“价格上限”、“价格下限”、“最大买入数量”、“最大卖出数量”、“最大轧差”等约束条件的前提下，进行相应买入或卖出交易；
* 策略会计算最新完成的委托单的成交均价来修改对应标的股票的基准价格，并同时把该价格存放到 [excel](../../../res/grid_target.xlsx) 配置文件中对应标的股票的基准价格，便于下次启动策略继续使用该基准价格。
```python
from smart import *
import os
from datetime import datetime
import logging
import openpyxl
from smart.type import AccountType
logger = logging.getLogger()
CONFIG_FILENAME = "grid_target.xlsx" # "I:\smartx_python\gridtrading\grid_target.xlsx"
sz_exchange = smart.Type.Exchange.SZE
sh_exchange = smart.Type.Exchange.SSE

stock_dict = {}

class Stock:
    def __init__(self,strStockCode,strExchange,fInitBasisPrice,fSellPriceDelta,
                    fBuyPriceDelta,fPriceUpperBound,fPriceLowerBound,iAmountPerEntrust,
                    iMaxBuyAmount,iMaxSellAmount,iMaxNettingAmount,index = -1):
        self.strStockCode = strStockCode         # 股票代码 例 000666
        self.strExchange = strExchange           # 交易所 例 SSE
        self.fInitBasisPrice = fInitBasisPrice   # 初始基准价格
        self.fSellPriceDelta = fSellPriceDelta   # 卖出价差，为百分比，如，0.02代表价差百分比为2%
        self.fBuyPriceDelta = fBuyPriceDelta     # 买入价差，为百分比
        self.fPriceUpperBound = fPriceUpperBound # 价格上限
        self.fPriceLowerBound = fPriceLowerBound # 价格下限
        self.iAmountPerEntrust = iAmountPerEntrust # 单次委托数量 todo amount 改为volume
        self.iMaxBuyAmount = iMaxBuyAmount       # 最大买入数量
        self.iMaxSellAmount = iMaxSellAmount     # 最大卖出数量
        self.iMaxNettingAmount = iMaxNettingAmount     # 最大轧差
        self.iBuyAmount = 0                      # 委托买入数量
        self.iSellAmount = 0                     # 委托卖出数量
        self.fCurrBasisPrice = fInitBasisPrice   # 储存上一次的买卖成交均价
        self.isSell = True
        self.isBuy = True
        self.index = index #用于记录在excel中的索引序号,快速保存该股票的最新交易价格

def read_excel(config_file_dir):
    config_file_path =os.path.join( config_file_dir, CONFIG_FILENAME)
    wb = openpyxl.load_workbook(config_file_path) # 读取xlsx文件
    sheet1 = wb.active
    smart.cache.set("account", str(sheet1.cell(1,2).value) )

    sz = []
    sh = []
    nrows = sheet1.max_row + 1 
    ncols = sheet1.max_column + 1
    for i in range(3,nrows):  #
        instrument_id = sheet1.cell(i,1).value
        exchange_id = sheet1.cell(i,2).value
        if isinstance(instrument_id,str) and exchange_id == sz_exchange:
            sz.append(instrument_id)
        elif isinstance(instrument_id,str) and exchange_id == sh_exchange:
            sh.append(instrument_id)
        else:
            logger.warning("warning: error instrument_id or exchange_id info in the %s row." , i)
            continue

        if isinstance(instrument_id,str) and (exchange_id == sz_exchange or exchange_id == sh_exchange): #modified by shizhao on 20191125
            key = instrument_id + exchange_id
            stock_dict[key] = Stock(sheet1.cell(i,1).value, sheet1.cell(i,2).value, float(sheet1.cell(i,3).value), float(sheet1.cell(i,4).value)/100.0, float(sheet1.cell(i,5).value)/100.0, float(sheet1.cell(i,6).value), float(sheet1.cell(i,7).value), sheet1.cell(i,8).value, sheet1.cell(i,9).value, sheet1.cell(i,10).value ,sheet1.cell(i,11).value ,i)
    
    #smart.cache.set("stock_dict", stock_dict )
    smart.cache.set("sz", sz)
    smart.cache.set("sh", sh)


def init():
    try:
        strategy_platform_type = smart.Type.StrategyPlatformType.FrontPy
        strategy_id = None
        price_type = smart.Type.PriceType.Limit
        #smart.Type.Side.Buy
        offset = smart.Type.Offset.Init
        order_client_id = 0
        parent_order_id = ""
        business_type = smart.Type.BusinessType.CASH

        #logger.debug("file_abspath:%s ", os.path.abspath(__file__) )
        #logger.debug("file_dirname:%s ", os.path.dirname(__file__) )


        read_excel(os.path.dirname(__file__))
        account_id = smart.cache["account"]
        #logger.debug("smart.cache.sh: %s",smart.utils.toString(smart.cache["sh"]))
        #logger.debug("smart.cache.sz: %s",smart.utils.toString(smart.cache["sz"]))
        #logger.debug("smart.cache.stock_dict: %s",smart.utils.toString(stock_dict))dddfff
        for key,value in stock_dict.items():
            logger.debug("stock_dict:  key:%s , fInitBasisPrice:%s", key , value.fInitBasisPrice)
        
        # for item in smart.cache["sh"]:
        #     logger.debug("sz: item:%s", item )

        smart.cache.set("begin_time", '093000')   
        smart.cache.set("end_time", '150000')

        smart.subscribe(account_id, smart.cache["sh"] , sh_exchange,False)
        smart.subscribe(account_id, smart.cache["sz"] , sz_exchange,False)
    except Exception as e:
        logger.debug("err: %s", e)

    def on_order(order):
        logger.debug("get on_order: %s",smart.utils.toString(order))
        key = order.instrument_id + order.exchange_id
        if key in stock_dict:
            stock = stock_dict[key]
            if order.status == smart.Type.OrderStatus.Cancelled or order.status ==  smart.Type.OrderStatus.Error or order.status ==  smart.Type.OrderStatus.Filled or order.status ==  smart.Type.OrderStatus.PartialFilledNotActive:
                if order.side ==  smart.Type.Side.Buy:
                    stock.iBuyAmount = stock.iBuyAmount - order.volume_left
                elif order.side ==  smart.Type.Side.Sell:
                    stock.iSellAmount = stock.iSellAmount - order.volume_left
                else:
                    pass
                        
                if order.volume_traded > 0:#有成交股数
                    wb = openpyxl.load_workbook(CONFIG_FILENAME) # 读取xlsx文件
                    ws = wb.active
                    stock.fCurrBasisPrice = order.amount_traded/order.volume_traded #修改最新成交价
                    ws.cell(stock.index,3).value = stock.fCurrBasisPrice
                    wb.save(CONFIG_FILENAME)
                    
                    stock.isSell = True                    
                    stock.isBuy = True
                else:#无成交股数
                    if order.side ==  smart.Type.Side.Buy:#需要修改下
                        stock.isBuy = True
                    else:#取消卖出
                        stock.isSell = True

    smart.current_account.on_order(on_order)

    def on_trade(trade):
        logger.debug("get on_trade: %s",smart.utils.toString(trade))
    smart.current_account.on_trade(on_trade)

    def on_assets(assets):
        logger.debug("get on_assets: %s",smart.utils.toString(assets))
    smart.current_account.on_assets(on_assets)

    def on_position(position):
        logger.debug("get on_position: %s",smart.utils.toString(position))
    smart.current_account.on_position(on_position)

    #撤单
    def cancel_order_callback(data,err):
        logger.debug("get cancel_insert:%s",data)

    #下委托单
    def insert_order_callback(order,err):
        logger.debug("get insert_order: %s",smart.utils.toString(order))

        if order.order_id != '0':###已经考虑到报单错误或者交易所拒单的情况
            key = order.instrument_id + order.exchange_id
            stock = stock_dict[key]
            if order.side == smart.Type.Side.Sell:
                key = order.instrument_id + order.exchange_id
                stock = stock_dict[key]
                stock.iSellAmount = stock.iSellAmount + order.volume
                stock.isSell = False
            elif order.side == smart.Type.Side.Buy:
                stock.iBuyAmount = stock.iBuyAmount + order.volume
                stock.isBuy = False
        #smart.cancel_order(account_id, order_id, cancel_order_callback)
    #smart.insert_order(account_id,strategy_platform_type,strategy_id,instrument_id,exchange_id,price,volume,price_type,side,offset,order_client_id,parent_order_id,business_type,insert_order_callback)
    


    def on_quote(quote):
        logger.debug("quote_time_type:%s",type(quote.data_time))  #str  20230209151145000
            #added by shizhao on 20191125
        curr_time = quote.data_time[8:14]
        if curr_time <= smart.cache["begin_time"] or curr_time >= smart.cache["end_time"]:
            logger.debug("warning:当前时间是%s,不在交易时间区间内！！！",curr_time)
            return
        
        key = quote.instrument_id + quote.exchange_id
        #context.log.info("instrument_id:{} last_price:{}".format(quote.instrument_id, quote.last_price))
        if key in stock_dict:
            stock = stock_dict[key]
            logger.debug("quote: %s",smart.utils.toString(quote))
            if quote.last_price > stock.fCurrBasisPrice:#卖的可能
                rate_of_price_increase = quote.last_price/stock.fCurrBasisPrice - 1.0
                multiple = int(rate_of_price_increase/stock.fSellPriceDelta)
                if 0 == multiple:
                    return
                new_entrust_price = round(stock.fCurrBasisPrice*(1.0 + stock.fSellPriceDelta*multiple), 2)
                if new_entrust_price <= stock.fPriceUpperBound and new_entrust_price <= quote.upper_limit_price and new_entrust_price >= quote.lower_limit_price and stock.isSell and (stock.iSellAmount + stock.iAmountPerEntrust <= stock.iMaxSellAmount) and stock.iSellAmount+stock.iAmountPerEntrust-stock.iBuyAmount <= stock.iMaxNettingAmount:
                    smart.insert_order(account_id,strategy_platform_type,strategy_id,quote.instrument_id, quote.exchange_id , new_entrust_price ,int(stock.iAmountPerEntrust)*multiple,price_type , smart.Type.Side.Sell ,offset,order_client_id,parent_order_id,business_type,insert_order_callback)
            
            elif quote.last_price < stock.fCurrBasisPrice:#买的可能
                rate_of_price_decrease = 1.0 - quote.last_price/stock.fCurrBasisPrice
                multiple = int(rate_of_price_decrease/stock.fBuyPriceDelta)
                if 0 == multiple:
                    return            
                new_entrust_price = round(stock.fCurrBasisPrice*(1.0 - stock.fBuyPriceDelta*multiple), 2)
                if new_entrust_price >= stock.fPriceLowerBound and new_entrust_price >= quote.lower_limit_price and new_entrust_price <= quote.upper_limit_price and stock.isBuy and (stock.iBuyAmount + stock.iAmountPerEntrust <= stock.iMaxBuyAmount) and stock.iBuyAmount+stock.iAmountPerEntrust-stock.iSellAmount <= stock.iMaxNettingAmount:
                    smart.insert_order(account_id,strategy_platform_type,strategy_id,quote.instrument_id, quote.exchange_id , new_entrust_price ,int(stock.iAmountPerEntrust)*multiple, price_type , smart.Type.Side.Buy ,offset,order_client_id,parent_order_id,business_type,insert_order_callback)


            else:#no need any operation
                pass
    smart.on(smart.Event.ON_QUOTE,on_quote)
    

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
---
