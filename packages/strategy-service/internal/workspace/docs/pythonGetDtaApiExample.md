## `get_data_async-异步查询数据`
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `queryCallback` Function(必填) -  回调函数：返回查询结果集(datalist,err)
* `outFormat` String(选填) -  #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。不填时默认为OutFormat.List 
```python
smart.get_data_async(method=method, inParams=inParams,queryCallback=queryCallback,outFormat=outFormat)
```
### `历史行情-异步`
### `异步-交易日历-trading_day`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryTradingDay_callback(datalist,err):
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                #get_data_async【OK】前5个:{"trading_date": "2023-01-03"}
        logger.debug("get_data_async【OK】:%d",len(datalist))
        #get_data_async【OK】:242        
    smart.get_data_async(
        method="trading_day", # method方法：固定值
        inParams={
            "start_date": "20230101",# 开始日期
            "end_date": "20231231", # 结束日期
        },
        queryCallback=queryTradingDay_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史ticker行情-his_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryHisTicker_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"a2_v": "0.0", "a3_v": "0.0", "a4_v": "0.0", "a5_v": "0.0", "a1_v": "400.0", "total_turnover": "0.0", "b1": "11.88", "b2": "0.0", "limit_down": "10.69", "b3": "0.0", "datetime": "2023-06-12 09:15:00", "high": "0.0", "b4": "0.0", "exchange_id": "SZE", "b5": "0.0", "code": "000001.SZ", "low": "0.0", "trading_date": "2023-06-12 00:00:00", "num_trades": "0.0", "last": "11.88", "b4_v": "0.0", "b3_v": "0.0", "b5_v": "0.0", "b2_v": "19300.0", "b1_v": "400.0", "instrument_id": "000001", "change_rate": "0.0", "volume": "0.0", "a1": "11.88", "a2": "0.0", "a3": "0.0", "a4": "0.0", "limit_up": "13.07", "a5": "0.0", "open": "0.0", "prev_close": "11.88"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:4820        
    smart.get_data_async(
        method="his_ticker", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2023-06-12", # 开始日期
            "end_date": "2023-06-12" # 结束日期
        },
        queryCallback=queryHisTicker_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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

### `异步-历史bar数据-his_bar`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryHisBar_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"num_trades": "14847.0", "instrument_id": "000001", "total_turnover": "717567546.58", "volume": "122716026.7776", "datetime": "2013-01-04", "high": "5.1003", "exchange_id": "SZE", "code": "000001.SZ", "low": "4.936", "close": "4.9577", "open": "5.06"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:240        
    smart.get_data_async(
        method="his_bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2013-01-04", # 开始日期
            "end_date": "2014-01-04", # 结束日期
            "frequency": "1d", # 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
            "adjust_type": "pre" # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        queryCallback=queryHisBar_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-行业分类列表-industry_category`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndustryCategory_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"first_industry_name": "石油石化", "third_industry_code": "101010", "second_industry_code": "1010", "first_industry_code": "10", "second_industry_name": "石油开采Ⅱ", "third_industry_name": "石油开采Ⅲ"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:278
                
    smart.get_data_async(
        method="industry_category", # method方法：固定值
        inParams={},
        queryCallback=queryIndustryCategory_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-某行业板块下股票-industry_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndustryTicker_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"exchange_id": "SZE", "code": "000059.SZ", "instrument_id": "000059"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:50        
    smart.get_data_async(
        method="industry_ticker", # method方法：固定值
        inParams={
            "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
        },
        queryCallback=queryIndustryTicker_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
def init():
    get_data_async()
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
### `技术指标-异步`
### `异步-历史macd指标-indicator_macd`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorMacd_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"date": "2021-01-04 08:00:00", "dif": null, "dea": null, "hist": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:485        
    smart.get_data_async(
        method="indicator_macd", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "fastperiod": 12, # 快周期参数
            "slowperiod": 26, # 慢周期参数
            "signalperiod": 9 # 信号量参数
        },
        queryCallback=queryIndicatorMacd_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
def init():
    get_data_async()
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
### `异步-历史ma指标-indicator_ma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorMa_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"date": "2021-01-04 08:00:00", "MA": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:485        
    smart.get_data_async(
        method="indicator_ma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30 # 周期
        },
        queryCallback=queryIndicatorMa_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史ema指标-indicator_ema`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorEma_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"date": "2021-01-08 08:00:00", "EMA": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:485        
    smart.get_data_async(
        method="indicator_ema", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30 # 周期
        },
        queryCallback=queryIndicatorEma_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史boll指标-indicator_boll`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorBoll_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #get_data_async【OK】前5个:{"date": "2021-01-04 08:00:00", "upper": null, "middle": null, "lower": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #get_data_async【OK】:485
                
    smart.get_data_async(
        method="indicator_boll", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
            "nbdevup": 2, # 上轨线标准倍差
            "nbdevdn": 2, # 下轨线标准倍差
            "matype": 0 # 移动平均类型 0: 简单移动平均
        },
        queryCallback=queryIndicatorBoll_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史wma指标-indicator_wma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorWma_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"date": "2022-01-04 08:00:00", "WMA": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:242
                
    smart.get_data_async(
        method="indicator_wma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorWma_callback # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史sma指标-indicator_sma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorSma_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"date": "2022-01-04 08:00:00", "SMA": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            #  get_data_async【OK】:242
    smart.get_data_async(
        method="indicator_sma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorSma_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-历史cci指标-indicator_cci`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorCci_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"date": "2022-01-04 08:00:00", "CCI": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:242
    smart.get_data_async(
        method="indicator_cci", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14 # 周期
        },
        queryCallback=queryIndicatorCci_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    

def init():
    get_data_async()
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
### `异步-历史rsi指标-indicator_rsi`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorRsi_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"date": "2022-01-04 08:00:00", "RSI": null}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:242
    smart.get_data_async(
        method="indicator_rsi", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14 # 周期
        },
        queryCallback=queryIndicatorRsi_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-获取十大流通股东-top10_currency_shareholder`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorRsi_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"end_date": "2023-06-30", "shareholder_type": "", "shareholder_kind": "资产管理公司", "hold_percent_total": "0.255442", "instrument_id": "000001", "exchange_id": "SZE", "share_pledge": "", "DataPageInfo": "000001.SZ", "shareholder_attr": "企业", "rank": "10", "share_freeze": "", "shareholder_name": "瑞银资产管理(新加坡)有限公司-瑞银卢森堡投资SICAV", "info_date": "2023-08-24", "hold_percent_float": "0.255446"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:10
    smart.get_data_async(
        method="top10_currency_shareholder", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        queryCallback=queryIndicatorRsi_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-获取十大股东-top10_shareholder`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorRsi_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"end_date": "2023-06-30", "shareholder_type": "外资股东", "shareholder_kind": "资产管理公司", 
                    # "hold_percent_total": "0.255442", "instrument_id": "000001", "exchange_id": "SZE", "share_pledge": "", 
                    # "DataPageInfo": "000001.SZ", "shareholder_attr": "企业", "rank": "10", "share_freeze": "", 
                    # "shareholder_name": "瑞银资产管理(新加坡)有限公司-瑞银卢森堡投资SICAV", "info_date": "2023-08-24", "hold_percent_float": "0.255446"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:10
    smart.get_data_async(
        method="top10_shareholder", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        queryCallback=queryIndicatorRsi_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
### `异步-最新财务数据-finance_data`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_async():
    def queryIndicatorRsi_callback(datalist,err):
        if(err):
            logger.debug("get error from get_data_async:%s",err)
        else:
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_async【OK】前5个:{"pe_ratio_1": "4.689891470647685", "total_assets": "5500524000000.0", 
                    # "undistributed_profit_per_share": "10.515039686245306", "total_circulation_a": "19405918198.0",
                    #  "a_share_market_val_in_circulation": "213461016450.0", "pe_ratio_ttm": "4.372940698105091", 
                    # "pb_ratio": "0.5586205186677797", "cash_flow_from_operating_activities": "44241000000.0", 
                    # "operating_revenue": "88610000000.0", "basic_earnings_per_share": "1.2", "instrument_id": "000001",
                    #  "a_share_market_val": "213465100178.0", "exchange_id": "SZE", "DataPageInfo": "000001.SZ", 
                    # "capital_reserve_per_share_ttm": "4.162969727880536", "free_circulation": "8160427512.0", "net_profit": "25387000000.0",
                    #  "total_circulation": "19405918198.0", "circulation_a": "19405546950.0", "non_circulation_a": "371248.0"}
            logger.debug("get_data_async【OK】:%d",len(datalist))
            # get_data_async【OK】:10
    smart.get_data_async(
        method="finance_data", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        queryCallback=queryIndicatorRsi_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_async()
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
## `get_data_page_async-异步分页查询数据`
>分页查询数据，返回数据带分页信息
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `queryCallback` Function(必填) -  回调函数：返回查询结果集(datalist,err)
* `outFormat` String(选填) -  查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
```python
smart.get_data_page_async(method=method, inParams=inParams,queryCallback=queryCallback,outFormat=outFormat)
```
### 历史行情-异步分页
### `异步分页-历史ticker行情his_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryHisTicker_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：4820,总记录数：4820,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"a2_v": "0.0", "a3_v": "0.0", "a4_v": "0.0", "a5_v": "0.0", "a1_v": "400.0", "total_turnover": "0.0", "b1": "11.88", "b2": "0.0", "limit_down": "10.69", "b3": "0.0", "datetime": "2023-06-12 09:15:00", "high": "0.0", "b4": "0.0", "exchange_id": "SZE", "b5": "0.0", "code": "000001.SZ", "low": "0.0", "trading_date": "2023-06-12 00:00:00", "num_trades": "0.0", "last": "11.88", "b4_v": "0.0", "b3_v": "0.0", "b5_v": "0.0", "b2_v": "19300.0", "b1_v": "400.0", "instrument_id": "000001", "change_rate": "0.0", "volume": "0.0", "a1": "11.88", "a2": "0.0", "a3": "0.0", "a4": "0.0", "limit_up": "13.07", "a5": "0.0", "open": "0.0", "prev_close": "11.88"}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:4820
            
    smart.get_data_page_async(
        method="his_ticker", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2023-06-12", # 开始日期
            "end_date": "2023-06-12", # 结束日期
        },
        queryCallback=queryHisTicker_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史bar数据his_bar`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryHisBar_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：240,总记录数：240,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"num_trades": "14847.0", "instrument_id": "000001", "total_turnover": "717567546.58", "volume": "122716026.7776", "datetime": "2013-01-04", "high": "5.1003", "exchange_id": "SZE", "code": "000001.SZ", "low": "4.936", "close": "4.9577", "open": "5.06"}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:240
    smart.get_data_page_async(
        method="his_bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2013-01-04", # 开始日期
            "end_date": "2014-01-04", # 结束日期
            "frequency": "1d", # 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
            "adjust_type": "pre", # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        queryCallback=queryHisBar_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `技术指标-异步分页`
### `异步分页-历史macd指标indicator_macd`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorMacd_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：485,总记录数：485,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2021-01-04 08:00:00", "dif": null, "dea": null, "hist": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:485
    smart.get_data_page_async(
        method="indicator_macd", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "fastperiod": 12, # 快周期参数
            "slowperiod": 26, # 慢周期参数
            "signalperiod": 9, # 信号量参数
        },
        queryCallback=queryIndicatorMacd_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史ma指标indicator_ma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorMa_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：485,总记录数：485,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2021-01-04 08:00:00", "MA": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:485
    smart.get_data_page_async(
        method="indicator_ma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorMa_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史ema指标indicator_ema`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorEma_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：485,总记录数：485,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2021-01-04 08:00:00", "EMA": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:485
    smart.get_data_page_async(
        method="indicator_ema", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorEma_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史boll指标indicator_boll`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorBoll_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：485,总记录数：485,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2021-01-04 08:00:00", "upper": null, "middle": null, "lower": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:485
    smart.get_data_page_async(
        method="indicator_boll", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
            "nbdevup": 2, # 上轨线标准倍差
            "nbdevdn": 2, # 下轨线标准倍差
            "matype": 0, # 移动平均类型 0: 简单移动平均
        },
        queryCallback=queryIndicatorBoll_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史wma指标indicator_wma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorWma_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：242,总记录数：242,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2022-01-04 08:00:00", "WMA": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:242
    smart.get_data_page_async(
        method="indicator_wma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorWma_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史sma指标indicator_sma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorSma_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：242,总记录数：242,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2022-01-04 08:00:00", "SMA": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:242
    smart.get_data_page_async(
        method="indicator_sma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        queryCallback=queryIndicatorSma_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史cci指标indicator_cci`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorCci_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：242,总记录数：242,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    #  get_data_page_async【OK】前5个:{"date": "2022-01-04 08:00:00", "CCI": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:242
    smart.get_data_page_async(
        method="indicator_cci", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14, # 周期
        },
        queryCallback=queryIndicatorCci_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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
### `异步分页-历史rsi指标indicator_rsi`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_async():
    def queryIndicatorRsi_callback(result:GetDataInfo,err):
        if(err):
            logger.debug("get error from get_data_page_async:%s",err)
        else:
            logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
            # get_data_page_async:当前页：1,每页记录数：242,总记录数：242,总页数：1
            datalist = result.data
            for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_page_async【OK】前5个:{"date": "2022-01-04 08:00:00", "RSI": null}
            logger.debug("get_data_page_async【OK】:%d",len(datalist))
            # get_data_page_async【OK】:242
    smart.get_data_page_async(
        method="indicator_rsi", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14, # 周期
        },
        queryCallback=queryIndicatorRsi_callback, # 回调函数
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )

def init():
    get_data_page_async()
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

## `get_data_sync-同步查询数据`
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `outFormat` String(选填) -  #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。不填时默认为OutFormat.List 
```python
smart.get_data_sync(method=method, inParams=inParams, outFormat=outFormat)
```
### `历史行情-同步`
### `同步-交易日历-trading_day`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="trading_day", # method方法：固定值
        inParams={
            "start_date": "20230101",# 开始日期
            "end_date": "20231231", # 结束日期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"trading_date": "2023-01-03"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:242        

def init():
    get_data_sync()
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
### `同步-历史ticker行情-his_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():            
    datalist = smart.get_data_sync(
        method="his_ticker", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2023-06-12", # 开始日期
            "end_date": "2023-06-12" # 结束日期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"a2_v": "0.0", "a3_v": "0.0", "a4_v": "0.0", "a5_v": "0.0", "a1_v": "400.0", "total_turnover": "0.0", "b1": "11.88", "b2": "0.0", "limit_down": "10.69", "b3": "0.0", "datetime": "2023-06-12 09:15:00", "high": "0.0", "b4": "0.0", "exchange_id": "SZE", "b5": "0.0", "code": "000001.SZ", "low": "0.0", "trading_date": "2023-06-12 00:00:00", "num_trades": "0.0", "last": "11.88", "b4_v": "0.0", "b3_v": "0.0", "b5_v": "0.0", "b2_v": "19300.0", "b1_v": "400.0", "instrument_id": "000001", "change_rate": "0.0", "volume": "0.0", "a1": "11.88", "a2": "0.0", "a3": "0.0", "a4": "0.0", "limit_up": "13.07", "a5": "0.0", "open": "0.0", "prev_close": "11.88"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:4820        

def init():
    get_data_sync()
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

### `同步-历史bar数据-his_bar`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="his_bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2013-01-04", # 开始日期
            "end_date": "2014-01-04", # 结束日期
            "frequency": "1d", # 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
            "adjust_type": "pre" # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"num_trades": "14847.0", "instrument_id": "000001", "total_turnover": "717567546.58", "volume": "122716026.7776", "datetime": "2013-01-04", "high": "5.1003", "exchange_id": "SZE", "code": "000001.SZ", "low": "4.936", "close": "4.9577", "open": "5.06"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:240        

def init():
    get_data_sync()
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
### `同步-行业分类列表-industry_category`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="industry_category", # method方法：固定值
        inParams={},
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"first_industry_name": "石油石化", "third_industry_code": "101010", "second_industry_code": "1010", "first_industry_code": "10", "second_industry_name": "石油开采Ⅱ", "third_industry_name": "石油开采Ⅲ"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:278

def init():
    get_data_sync()
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
### `同步-某行业板块下股票-industry_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="industry_ticker", # method方法：固定值
        inParams={
            "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"exchange_id": "SZE", "code": "000059.SZ", "instrument_id": "000059"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:50        
def init():
    get_data_sync()
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
### `技术指标-同步`
### `同步-历史macd指标-indicator_macd`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync(): 
    datalist = smart.get_data_sync(
        method="indicator_macd", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "fastperiod": 12, # 快周期参数
            "slowperiod": 26, # 慢周期参数
            "signalperiod": 9 # 信号量参数
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "dif": null, "dea": null, "hist": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:485      
def init():
    get_data_sync()
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
### `同步-历史ma指标-indicator_ma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="indicator_ma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30 # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "MA": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:485        

def init():
    get_data_sync()
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
### `同步-历史ema指标-indicator_ema`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="indicator_ema", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30 # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"date": "2021-01-08 08:00:00", "EMA": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:485        

def init():
    get_data_sync()
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
### `同步-历史boll指标-indicator_boll`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="indicator_boll", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
            "nbdevup": 2, # 上轨线标准倍差
            "nbdevdn": 2, # 下轨线标准倍差
            "matype": 0 # 移动平均类型 0: 简单移动平均
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #get_data_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "upper": null, "middle": null, "lower": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #get_data_sync【OK】:485

def init():
    get_data_sync()
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
### `同步-历史wma指标-indicator_wma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync(): 
    datalist = smart.get_data_sync(
        method="indicator_wma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "WMA": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    # get_data_sync【OK】:242

def init():
    get_data_sync()
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
### `同步-历史sma指标-indicator_sma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="indicator_sma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "SMA": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    #  get_data_sync【OK】:242

def init():
    get_data_sync()
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
### `同步-历史cci指标-indicator_cci`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():     
    datalist = smart.get_data_sync(
        method="indicator_cci", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14 # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "CCI": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    # get_data_sync【OK】:242

def init():
    get_data_sync()
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
### `同步-历史rsi指标-indicator_rsi`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():   
    datalist = smart.get_data_sync(
        method="indicator_rsi", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14 # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "RSI": null}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    # get_data_sync【OK】:242
def init():
    get_data_sync()
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
### `同步-获取十大流通股东-top10_currency_shareholder`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="top10_currency_shareholder", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
                if i < 5:   
                    logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
                    # get_data_sync【OK】前5个:{"end_date": "2023-06-30", "shareholder_type": "", "shareholder_kind": "资产管理公司", "hold_percent_total": "0.255442", "instrument_id": "000001", "exchange_id": "SZE", "share_pledge": "", "DataPageInfo": "000001.SZ", "shareholder_attr": "企业", "rank": "10", "share_freeze": "", "shareholder_name": "瑞银资产管理(新加坡)有限公司-瑞银卢森堡投资SICAV", "info_date": "2023-08-24", "hold_percent_float": "0.255446"}
            logger.debug("get_data_sync【OK】:%d",len(datalist))
            # get_data_sync【OK】:10
def init():
    get_data_sync()
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
### `同步-获取十大股东-top10_shareholder`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="top10_shareholder", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"end_date": "2023-06-30", "shareholder_type": "外资股东", "shareholder_kind": "资产管理公司", 
            # "hold_percent_total": "0.255442", "instrument_id": "000001", "exchange_id": "SZE", "share_pledge": "", 
            # "DataPageInfo": "000001.SZ", "shareholder_attr": "企业", "rank": "10", "share_freeze": "", 
            # "shareholder_name": "瑞银资产管理(新加坡)有限公司-瑞银卢森堡投资SICAV", "info_date": "2023-08-24", "hold_percent_float": "0.255446"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    # get_data_sync【OK】:10

def init():
    get_data_sync()
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
### `同步-最新财务数据-finance_data`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_sync():
    datalist = smart.get_data_sync(
        method="finance_data", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_sync【OK】前5个:{"pe_ratio_1": "4.689891470647685", "total_assets": "5500524000000.0", 
            # "undistributed_profit_per_share": "10.515039686245306", "total_circulation_a": "19405918198.0",
            #  "a_share_market_val_in_circulation": "213461016450.0", "pe_ratio_ttm": "4.372940698105091", 
            # "pb_ratio": "0.5586205186677797", "cash_flow_from_operating_activities": "44241000000.0", 
            # "operating_revenue": "88610000000.0", "basic_earnings_per_share": "1.2", "instrument_id": "000001",
            #  "a_share_market_val": "213465100178.0", "exchange_id": "SZE", "DataPageInfo": "000001.SZ", 
            # "capital_reserve_per_share_ttm": "4.162969727880536", "free_circulation": "8160427512.0", "net_profit": "25387000000.0",
            #  "total_circulation": "19405918198.0", "circulation_a": "19405546950.0", "non_circulation_a": "371248.0"}
    logger.debug("get_data_sync【OK】:%d",len(datalist))
    # get_data_sync【OK】:10

def init():
    get_data_sync()
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
## `get_data_page_sync-同步分页查询数据`
>分页查询数据，返回数据带分页信息
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `outFormat` String(选填) -  查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
```python
smart.get_data_page_sync(method=method, inParams=inParams, outFormat=outFormat)
```
### 历史行情-同步分页
### `同步分页-历史ticker行情his_ticker`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="his_ticker", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2023-06-12", # 开始日期
            "end_date": "2023-06-12", # 结束日期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：4820,总记录数：4820,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"a2_v": "0.0", "a3_v": "0.0", "a4_v": "0.0", "a5_v": "0.0", "a1_v": "400.0", "total_turnover": "0.0", "b1": "11.88", "b2": "0.0", "limit_down": "10.69", "b3": "0.0", "datetime": "2023-06-12 09:15:00", "high": "0.0", "b4": "0.0", "exchange_id": "SZE", "b5": "0.0", "code": "000001.SZ", "low": "0.0", "trading_date": "2023-06-12 00:00:00", "num_trades": "0.0", "last": "11.88", "b4_v": "0.0", "b3_v": "0.0", "b5_v": "0.0", "b2_v": "19300.0", "b1_v": "400.0", "instrument_id": "000001", "change_rate": "0.0", "volume": "0.0", "a1": "11.88", "a2": "0.0", "a3": "0.0", "a4": "0.0", "limit_up": "13.07", "a5": "0.0", "open": "0.0", "prev_close": "11.88"}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:4820

def init():
    get_data_page_sync()
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
### `同步分页-历史bar数据his_bar`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="his_bar", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2013-01-04", # 开始日期
            "end_date": "2014-01-04", # 结束日期
            "frequency": "1d", # 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
            "adjust_type": "pre", # 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_async:当前页：1,每页记录数：240,总记录数：240,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_async【OK】前5个:{"num_trades": "14847.0", "instrument_id": "000001", "total_turnover": "717567546.58", "volume": "122716026.7776", "datetime": "2013-01-04", "high": "5.1003", "exchange_id": "SZE", "code": "000001.SZ", "low": "4.936", "close": "4.9577", "open": "5.06"}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_async【OK】:240

def init():
    get_data_page_sync()
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
### `技术指标-同步分页`
### `同步分页-历史macd指标indicator_macd`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_macd", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "fastperiod": 12, # 快周期参数
            "slowperiod": 26, # 慢周期参数
            "signalperiod": 9, # 信号量参数
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：485,总记录数：485,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "dif": null, "dea": null, "hist": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:485
def init():
    get_data_page_sync()
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
### `同步分页-历史ma指标indicator_ma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_ma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：485,总记录数：485,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_async【OK】前5个:{"date": "2021-01-04 08:00:00", "MA": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:485

def init():
    get_data_page_sync()
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
### `同步分页-历史ema指标indicator_ema`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_ema", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：485,总记录数：485,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "EMA": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:485

def init():
    get_data_page_sync()
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
### `同步分页-历史boll指标indicator_boll`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_boll", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2021-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
            "nbdevup": 2, # 上轨线标准倍差
            "nbdevdn": 2, # 下轨线标准倍差
            "matype": 0, # 移动平均类型 0: 简单移动平均
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：485,总记录数：485,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2021-01-04 08:00:00", "upper": null, "middle": null, "lower": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:485

def init():
    get_data_page_sync()
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
### `同步分页-历史wma指标indicator_wma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_wma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：242,总记录数：242,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "WMA": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:242

def init():
    get_data_page_sync()
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
### `同步分页-历史sma指标indicator_sma`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_sma", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 30, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：242,总记录数：242,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "SMA": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:242

def init():
    get_data_page_sync()
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
### `同步分页-历史cci指标indicator_cci`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_cci", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：242,总记录数：242,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            #  get_data_page_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "CCI": null}
    logger.debug("get_data_page_sync【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:242

def init():
    get_data_page_sync()
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
### `同步分页-历史rsi指标indicator_rsi`
```python
from smart import *
import logging
from smart.type import *
logger = logging.getLogger()

# 回测 获取数据
def get_data_page_sync():
    result = smart.get_data_page_sync(
        method="indicator_rsi", # method方法：固定值
        inParams={
            "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
            "start_date": "2022-01-01", # 开始日期
            "end_date": "2023-01-01", # 结束日期
            "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
            "timeperiod": 14, # 周期
        },
        #参数outFormat(查询结果的转出类型):OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List。此样例未填，其他转出类型样例参见API文档
    )
    logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
    # get_data_page_sync:当前页：1,每页记录数：242,总记录数：242,总页数：1
    datalist = result.data
    for i in range(len(datalist)):
        if i < 5:   
            logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
            # get_data_page_sync【OK】前5个:{"date": "2022-01-04 08:00:00", "RSI": null}
    logger.debug("get_data_page_async【OK】:%d",len(datalist))
    # get_data_page_sync【OK】:242

def init():
    get_data_page_sync()
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