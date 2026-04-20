## `get_data_async-异步查询数据`
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `queryCallback` Function(必填) -  回调函数：返回查询结果集(datalist,err)
* `outFormat` String(选填) - 查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。不填时默认为OutFormat.List 
```python
smart.get_data_async(method=method, inParams=inParams,queryCallback=queryCallback,outFormat=outFormat)
```
### `历史行情-异步`
### `异步-交易日历-trading_day`
[获取交易日历列表示例](../example/pythonApiExample.md#异步-交易日历-trading-day)
>获取交易日历列表

>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryTradingDay_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
                
smart.get_data_async(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    queryCallback=queryTradingDay_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List 
    )
```
* 返回

```python
[
    {
        "trading_date": "2023-01-03",     # 交易日期
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryTradingDay_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
        
smart.get_data_async(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    queryCallback=queryTradingDay_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
```
* 返回

```python
  trading_date
0 2023-01-03
1 2023-01-04
...
[242 rows x 1 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryTradingDay_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
        
smart.get_data_async(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    queryCallback=queryTradingDay_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
```
* 返回

```python
[
    {
        "trading_date": "2023-01-03",     # 交易日期
    },
    ...
]
```

### `异步-历史ticker行情-his_ticker`
[获取历史ticker行情示例](../example/pythonApiExample.md#异步-历史ticker行情-his-ticker)
-   获取一个时间范围内的 ticker 数据, 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryHisTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        
smart.get_data_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
```
* 返回

```python
[
    {
      "a1": "12.56",  #卖一档报盘价格
      "a2": "0.0",
      "a3": "0.0",
      "a4": "0.0",
      "a5": "0.0",
      "a1_v": "4200.0", #卖一档报盘量
      "a2_v": "0.0",
      "a3_v": "0.0",
      "a4_v": "0.0",
      "a5_v": "0.0",
      "b1": "12.56",  #买一档报盘
      "b2": "0.0",
      "b3": "0.0",
      "b4": "0.0",
      "b5": "0.0",
      "b1_v": "4200.0", #买一档报盘量
      "b2_v": "1900.0",
      "b3_v": "0.0",
      "b4_v": "0.0",
      "b5_v": "0.0",
      "open": "0.0",  #开盘价
      "high": "0.0",  #最高价
      "low": "0.0",   #最低价
      "last": "12.56", #最新价
      "limit_up": "13.82", #涨停价
      "limit_down": "11.3",#跌停价
      "datetime": "2023-04-14 09:15:00", #当前时间
      "volume": "0.0",  #成交量
      "prev_close": "12.56" #昨收价
      "total_turnover": "0.0", #成交额
      "change_rate": "0.0", #涨跌幅
      "code": "000001.SZ", #证券代码
      "instrument_id": "000001"   #证券代码
      "exchange_id": "SZE"        #市场类型
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryHisTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
        
smart.get_data_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
```
* 返回
```python
  'a2_v', 'a3_v', 'a4_v', 'a5_v', 'a1_v', 'total_turnover', 'b1', 'b2', 'limit_down', 'b3', 'datetime', 'high', 'b4', 'exchange_id', 'b5', 'code', 'low', 'trading_date', 'num_trades', 'last', 'b4_v', 'b3_v', 'b5_v', 'b2_v', 'b1_v', 'instrument_id', 'change_rate', 'volume', 'a1', 'a2', 'a3', 'a4', 'limit_up', 'a5', 'open', 'prev_close'
0 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
1 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
2 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
... ... ... ... ... ... ... ... ... ...
[4820 rows x 36 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryHisTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
        
smart.get_data_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
```
* 返回

```python
[
    {
      "a1": "12.56",  #卖一档报盘价格
      "a2": "0.0",
      "a3": "0.0",
      "a4": "0.0",
      "a5": "0.0",
      "a1_v": "4200.0", #卖一档报盘量
      "a2_v": "0.0",
      "a3_v": "0.0",
      "a4_v": "0.0",
      "a5_v": "0.0",
      "b1": "12.56",  #买一档报盘
      "b2": "0.0",
      "b3": "0.0",
      "b4": "0.0",
      "b5": "0.0",
      "b1_v": "4200.0", #买一档报盘量
      "b2_v": "1900.0",
      "b3_v": "0.0",
      "b4_v": "0.0",
      "b5_v": "0.0",
      "open": "0.0",  #开盘价
      "high": "0.0",  #最高价
      "low": "0.0",   #最低价
      "last": "12.56", #最新价
      "limit_up": "13.82", #涨停价
      "limit_down": "11.3",#跌停价
      "datetime": "2023-04-14 09:15:00", #当前时间
      "volume": "0.0",  #成交量
      "prev_close": "12.56" #昨收价
      "total_turnover": "0.0", #成交额
      "change_rate": "0.0", #涨跌幅
      "code": "000001.SZ", #证券代码
      "instrument_id": "000001"   #证券代码
      "exchange_id": "SZE"        #市场类型
    },
    ...
]
```
### `异步-历史bar数据-his_bar`
[获取历史bar数据示例](../example/pythonApiExample.md#异步-历史bar数据-his-bar)
-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryHisBar_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
  
smart.get_data_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryHisBar_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
  
smart.get_data_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'num_trades', 'instrument_id', 'total_turnover', 'volume', 'datetime', 'high', 'exchange_id', 'code', 'low', 'close', 'open'
0 '14847.0' '000001' '717567546.58' ... '4.936' '4.9577' '5.06'
1 '12904.0' '000001' '578450487.59' ... '4.9236' '5.0538' '4.9546'
2 '13639.0' '000001' '501360093.66' ... '4.9174' '4.9608' '5.0538'
.. ... ... ... ... ... ... ...
[240 rows x 11 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryHisBar_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
  
smart.get_data_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
]
```

### `异步-行业分类列表-industry_category`
[获取行业分类列表示例](../example/pythonApiExample.md#异步-行业分类列表-industry-category)
-   数据为中信 2019 标准
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndustryCategory_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="industry_category", # method方法：固定值
    inParams={},
    queryCallback=queryIndustryCategory_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "first_industry_name": "石油石化",      #一级行业名称
      "first_industry_code": "10",           #一级行业代码
      "second_industry_name": "石油开采Ⅱ",    #二级行业名称
      "second_industry_code": "1010",        #二级行业代码
      "third_industry_name": "石油开采Ⅲ"     #三级行业名称
      "third_industry_code": "101010",       #三级行业代码
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndustryCategory_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="industry_category", # method方法：固定值
    inParams={},
    queryCallback=queryIndustryCategory_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'first_industry_name', 'third_industry_code', 'second_industry_code', 'first_industry_code', 'second_industry_name', 'third_industry_name'
0 '石油石化' '101010' '1010' '10' '石油开采Ⅱ' '石油开采Ⅲ'
1 '石油石化' '102010' '1020' '10' '石油化工' '炼油'
2 '石油石化' '102040' '1020' '10' '石油化工' '油品销售及仓储'
.. ... ... ...
[278 rows x 6 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndustryCategory_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="industry_category", # method方法：固定值
    inParams={},
    queryCallback=queryIndustryCategory_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "first_industry_name": "石油石化",      #一级行业名称
      "first_industry_code": "10",           #一级行业代码
      "second_industry_name": "石油开采Ⅱ",    #二级行业名称
      "second_industry_code": "1010",        #二级行业代码
      "third_industry_name": "石油开采Ⅲ"     #三级行业名称
      "third_industry_code": "101010",       #三级行业代码
    },
    ...
]
```

### `异步-某行业板块下股票-industry_ticker`
[获取某行业板块下股票示例](../example/pythonApiExample.md#异步-某行业板块下股票-industry-ticker)
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndustryTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    queryCallback=queryIndustryTicker_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "code": "000059.SZ",      #证券代码 SZ:深证 SH:上海
      "instrument_id": "000059",           #证券代码
      "exchange_id": "SZE"                 #交易所类型 SZE:深证 SSE:上海
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndustryTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    queryCallback=queryIndustryTicker_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'first_industry_name', 'third_industry_code', 'second_industry_code', 'first_industry_code', 'second_industry_name', 'third_industry_name'
0 '石油石化' '101010' '1010' '10' '石油开采Ⅱ' '石油开采Ⅲ'
1 '石油石化' '102010' '1020' '10' '石油化工' '炼油'
.. ... ... ...
[278 rows x 6 columns]

```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndustryTicker_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    queryCallback=queryIndustryTicker_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[{
      "code": "000059.SZ",      #证券代码 SZ:深证 SH:上海
      "instrument_id": "000059",           #证券代码
      "exchange_id": "SZE"                 #交易所类型 SZE:深证 SSE:上海
    },
    ...
]
```
### `技术指标-异步`
### `异步-历史macd指标-indicator_macd`
[获取历史macd指标示例](../example/pythonApiExample.md#异步-历史macd指标-indicator-macd)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorMacd_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
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
    queryCallback=queryIndicatorMacd_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorMacd_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
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
    queryCallback=queryIndicatorMacd_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'dif', 'dea', 'hist'
0 2021-01-04 08:00:00 NaN NaN NaN
1 2021-01-05 08:00:00 NaN NaN NaN
.. ... ... ... ...
[485 rows x 4 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorMacd_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
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
    queryCallback=queryIndicatorMacd_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
]
```

### `异步-历史ma指标-indicator_ma`
[获取历史ma指标示例](../example/pythonApiExample.md#异步-历史ma指标-indicator-ma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>入参
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorMa_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorMa_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorMa_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorMa_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'MA'
0 2021-01-04 08:00:00 NaN
1 2021-01-05 08:00:00 NaN
2 2021-01-06 08:00:00 NaN
.. ... ...
[485 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorMa_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorMa_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
]
```

### `异步-历史ema指标-indicator_ema`
[获取历史ema指标示例](../example/pythonApiExample.md#异步-历史ema指标-indicator-ema)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorEma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorEma_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorEma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorEma_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'EMA'
0 2021-01-04 08:00:00 NaN
1 2021-01-05 08:00:00 NaN
2 2021-01-06 08:00:00 NaN
.. ... ...
[485 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorEma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorEma_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
]
```

### `异步-历史boll指标-indicator_boll`
[获取历史boll指标示例](../example/pythonApiExample.md#异步-历史boll指标-indicator-boll)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorBoll_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
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
    queryCallback=queryIndicatorBoll_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorBoll_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
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
    queryCallback=queryIndicatorBoll_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'upper', 'middle', 'lower'
0 2021-01-04 08:00:00 NaN NaN NaN
1 2021-01-05 08:00:00 NaN NaN NaN
2 2021-01-06 08:00:00 NaN NaN NaN
.. ... ... ... ...
[485 rows x 4 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorBoll_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
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
    queryCallback=queryIndicatorBoll_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
]
```

### `异步-历史wma指标-indicator_wma`
[获取历史wma指标示例](../example/pythonApiExample.md#异步-历史wma指标-indicator-wma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorWma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    queryCallback=queryIndicatorWma_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorWma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    queryCallback=queryIndicatorWma_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'WMA'
0 2022-12-26 08:00:00 12.638581
1 2022-12-27 08:00:00 12.665317
1 2022-12-28 08:00:00 12.691634
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorWma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    queryCallback=queryIndicatorWma_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
]
```

### `异步-历史sma指标-indicator_sma`
[获取历史sma指标示例](../example/pythonApiExample.md#异步-历史sma指标-indicator-sma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorSma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorSma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'SMA'
0 2022-12-26 08:00:00 12.378100
1 2022-12-27 08:00:00 12.413880
2 2022-12-28 08:00:00 12.456817
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorSma_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
]
```

### `异步-历史cci指标-indicator_cci`
[获取历史cci指标示例](../example/pythonApiExample.md#异步-历史cci指标-indicator-cci)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorCci_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorCci_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'CCI'
0 2022-01-04 08:00:00 NaN
1 2022-01-05 08:00:00 NaN
2 2022-01-06 08:00:00 NaN
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorCci_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
]
```

### `异步-历史rsi指标-indicator_rsi`
[获取历史rsi指标示例](../example/pythonApiExample.md#异步-历史rsi指标-indicator-rsi)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorRsi_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorRsi_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'date', 'RSI'
0 2022-01-04 08:00:00 NaN
1 2022-01-05 08:00:00 NaN
2 2022-01-06 08:00:00 NaN
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorRsi_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
]
```
### `基础财务-异步`
### `异步-获取十大流通股东-top10_currency_shareholder`
[获取十大流通股东示例](../example/pythonApiExample.md#异步-获取十大流通股东-top10-currency-shareholder)
-   获取的为最近 1 年流通股东的数据。
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryTop10CurrencyShareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10CurrencyShareholder_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryTop10CurrencyShareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10CurrencyShareholder_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'end_date', 'shareholder_type', 'shareholder_kind', 'hold_percent_total', 'instrument_id', 'exchange_id', 'share_pledge', 'code', 'shareholder_attr', 'rank', 'share_freeze', 'shareholder_name', 'info_date', 'hold_percent_float'
0 '2023-03-31' '' '保险投资组合' '0.28279' '000001' 'SZE' '' '000001.SZ' '证券品种' '10' '' '新华人寿保险股份有限公司-分红-个人分红-018L-FH002深' '2023-04-25' '0.282795'
1 '2023-03-31' '' '社保基金、社保机构' '0.299278' '000001' 'SZE' '' '000001.SZ' '证券品种' '9' '' '全国社保基金一零一组合' '2023-04-25' '0.299284'
... ...
[10 rows x 14 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryTop10CurrencyShareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10CurrencyShareholder_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```

### `异步-获取十大股东-top10_shareholder`
[获取获取十大股东示例](../example/pythonApiExample.md#异步-获取十大股东-top10-shareholder)
-   获取的为最近 1 年股东的数据。
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryTop10Shareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10Shareholder_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryTop10Shareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10Shareholder_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'end_date', 'shareholder_type', 'shareholder_kind', 'hold_percent_total', 'instrument_id', 'exchange_id', 'share_pledge', 'code', 'shareholder_attr', 'rank', 'share_freeze', 'shareholder_name', 'info_date', 'hold_percent_float'
0 '2023-03-31' '其他股东' '保险投资组合' '0.28279' '000001' 'SZE' '' '000001.SZ' '证券品种' '10' '' '新华人寿保险股份有限公司-分红-个人分红-018L-FH002深' '2023-04-25' '0.282795'
1 '2023-03-31' '其他股东' '社保基金、社保机构' '0.299278' '000001' 'SZE' '' '000001.SZ' '证券品种' '9' '' '全国社保基金一零一组合' '2023-04-25' '0.299284'
... ...
[10 rows x 14 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryTop10Shareholder_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10Shareholder_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```

### `异步-最新财务数据-finance_data`
[最新财务数据示例](../example/pythonApiExample.md#异步-最新财务数据-finance-data)
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryFinanceData_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
smart.get_data_async(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryFinanceData_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "code": "000001.SZ",                           #证券代码
      "exchange_id": "SZE",                                     #交易所类型
      "instrument_id": "000001",                                #证券代码
      "pe_ratio_1": "4.843378827868881",                        #市盈率(静态)
      "pe_ratio_ttm": "4.663857805053736",                      #市盈率TTM
      "total_assets": "5455897000000.0",                        #总资产
      "undistributed_profit_per_share": "10.245637334516399",   #每股未分配利润
      "a_share_market_val_in_circulation": "220447013352.0",    #流通 A 股市值
      "pb_ratio": "0.5850600999712846",                         #市净率
      "cash_flow_from_operating_activities": "109156000000.0",  #现金流量净额
      "operating_revenue": "45098000000.0",                     #主营业务收入
      "basic_earnings_per_share": "0.65",                       #基本每股收益
      "a_share_market_val": "220451230729.28",                  #A股市值
      "capital_reserve_per_share_ttm": "4.16372980528834",      #每股公积金
      "net_profit": "14602000000.0",                            #净利润
      "total_circulation": "19405918198.0",                     #总股本
      "total_circulation_a": "19405918198.0",                   #A股总股本
      "circulation_a": "19405546950.0",                         #流通A股
      "non_circulation_a": "371248.0"                           #非流通A股
      "free_circulation": "8160427512.0",                       #实际流通股本
    }
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryFinanceData_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        logger.debug("get_data_async【OK】:%s",datalist.values)
        logger.debug("get_data_async【OK】:%s",datalist.index)
        logger.debug("get_data_async【OK】:%s",datalist.columns.tolist())
smart.get_data_async(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryFinanceData_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
  'pe_ratio_1', 'total_assets', 'undistributed_profit_per_share', 'total_circulation_a', 'a_share_market_val_in_circulation', 'pe_ratio_ttm', 'pb_ratio', 'cash_flow_from_operating_activities', 'operating_revenue', 'basic_earnings_per_share', 'instrument_id', 'a_share_market_val', 'exchange_id', 'code', 'capital_reserve_per_share_ttm', 'free_circulation', 'net_profit', 'total_circulation', 'circulation_a', 'non_circulation_a'
0 '4.834851752467704' '5455897000000.0' '10.245637334516399' '19405918198.0' '220058902413.0' '4.6556467877913175' '0.5840300645840112' '109156000000.0' '45098000000.0' '0.65' '000001' '220063112365.32' 'SZE' '000001.SZ' '4.16372980528834' '8160427512.0' '14602000000.0' '19405918198.0' '19405546950.0' '371248.0'
[1 rows x 20 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryFinanceData_callback(datalist,err):
    if(err):
        logger.debug("get error from get_data_async:%s",err)
    else:
        logger.debug(datalist)
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_async【OK】:%d",len(datalist))
        logger.debug("get_data_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_async【OK】:%s",datalist.shape)
        logger.debug("get_data_async【OK】:%s",datalist.size)
        logger.debug("get_data_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_async【OK】:%s",datalist.itemsize)
smart.get_data_async(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryFinanceData_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
[
    {
      "code": "000001.SZ",                           #证券代码
      "exchange_id": "SZE",                                     #交易所类型
      "instrument_id": "000001",                                #证券代码
      "pe_ratio_1": "4.843378827868881",                        #市盈率(静态)
      "pe_ratio_ttm": "4.663857805053736",                      #市盈率TTM
      "total_assets": "5455897000000.0",                        #总资产
      "undistributed_profit_per_share": "10.245637334516399",   #每股未分配利润
      "a_share_market_val_in_circulation": "220447013352.0",    #流通 A 股市值
      "pb_ratio": "0.5850600999712846",                         #市净率
      "cash_flow_from_operating_activities": "109156000000.0",  #现金流量净额
      "operating_revenue": "45098000000.0",                     #主营业务收入
      "basic_earnings_per_share": "0.65",                       #基本每股收益
      "a_share_market_val": "220451230729.28",                  #A股市值
      "capital_reserve_per_share_ttm": "4.16372980528834",      #每股公积金
      "net_profit": "14602000000.0",                            #净利润
      "total_circulation": "19405918198.0",                     #总股本
      "total_circulation_a": "19405918198.0",                   #A股总股本
      "circulation_a": "19405546950.0",                         #流通A股
      "non_circulation_a": "371248.0"                           #非流通A股
      "free_circulation": "8160427512.0",                       #实际流通股本
    }
]
```

## `get_data_page_async-异步分页查询数据`
>分页查询数据，返回数据带分页信息
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `queryCallback` Function(必填) -  回调函数：返回查询结果(result,err)
* `outFormat` String(选填) -  查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
```python
smart.get_data_page_async(method=method, inParams=inParams,queryCallback=queryCallbackoutFormat=outFormat)
```
### 历史行情-异步分页
### `异步分页-历史ticker行情his_ticker`
[历史ticker行情示例](../example/pythonApiExample.md#异步分页-历史ticker行情his-ticker)
-   获取一个时间范围内的 ticker 数据, 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryHisTicker_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        
smart.get_data_page_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
        "a1": "12.56",  #卖一档报盘价格
        "a2": "0.0",
        "a3": "0.0",
        "a4": "0.0",
        "a5": "0.0",
        "a1_v": "4200.0", #卖一档报盘量
        "a2_v": "0.0",
        "a3_v": "0.0",
        "a4_v": "0.0",
        "a5_v": "0.0",
        "b1": "12.56",  #买一档报盘
        "b2": "0.0",
        "b3": "0.0",
        "b4": "0.0",
        "b5": "0.0",
        "b1_v": "4200.0", #买一档报盘量
        "b2_v": "1900.0",
        "b3_v": "0.0",
        "b4_v": "0.0",
        "b5_v": "0.0",
        "open": "0.0",  #开盘价
        "high": "0.0",  #最高价
        "low": "0.0",   #最低价
        "last": "12.56", #最新价
        "limit_up": "13.82", #涨停价
        "limit_down": "11.3",#跌停价
        "datetime": "2023-04-14 09:15:00", #当前时间
        "volume": "0.0",  #成交量
        "prev_close": "12.56" #昨收价
        "total_turnover": "0.0", #成交额
        "change_rate": "0.0", #涨跌幅
        "code": "000001.SZ", #证券代码
        "instrument_id": "000001"   #证券代码
        "exchange_id": "SZE"        #市场类型
    },
    ...
  ],
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryHisTicker_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
        
smart.get_data_page_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'a2_v', 'a3_v', 'a4_v', 'a5_v', 'a1_v', 'total_turnover', 'b1', 'b2', 'limit_down', 'b3', 'datetime', 'high', 'b4', 'exchange_id', 'b5', 'code', 'low', 'trading_date', 'num_trades', 'last', 'b4_v', 'b3_v', 'b5_v', 'b2_v', 'b1_v', 'instrument_id', 'change_rate', 'volume', 'a1', 'a2', 'a3', 'a4', 'limit_up', 'a5', 'open', 'prev_close'
        0 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        1 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        2 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        ... ... ... ... ... ... ... ... ... ...
  ,
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryHisTicker_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
        
smart.get_data_page_async(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
        "a1": "12.56",  #卖一档报盘价格
        "a2": "0.0",
        "a3": "0.0",
        "a4": "0.0",
        "a5": "0.0",
        "a1_v": "4200.0", #卖一档报盘量
        "a2_v": "0.0",
        "a3_v": "0.0",
        "a4_v": "0.0",
        "a5_v": "0.0",
        "b1": "12.56",  #买一档报盘
        "b2": "0.0",
        "b3": "0.0",
        "b4": "0.0",
        "b5": "0.0",
        "b1_v": "4200.0", #买一档报盘量
        "b2_v": "1900.0",
        "b3_v": "0.0",
        "b4_v": "0.0",
        "b5_v": "0.0",
        "open": "0.0",  #开盘价
        "high": "0.0",  #最高价
        "low": "0.0",   #最低价
        "last": "12.56", #最新价
        "limit_up": "13.82", #涨停价
        "limit_down": "11.3",#跌停价
        "datetime": "2023-04-14 09:15:00", #当前时间
        "volume": "0.0",  #成交量
        "prev_close": "12.56" #昨收价
        "total_turnover": "0.0", #成交额
        "change_rate": "0.0", #涨跌幅
        "code": "000001.SZ", #证券代码
        "instrument_id": "000001"   #证券代码
        "exchange_id": "SZE"        #市场类型
    },
    ...
  ],
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```

### `异步分页-历史bar数据his_bar`
[历史bar数据示例](../example/pythonApiExample.md#异步分页-历史bar数据his-bar)
-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryHisBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
  
smart.get_data_page_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
  ],
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryHisBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
  
smart.get_data_page_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'num_trades', 'instrument_id', 'total_turnover', 'volume', 'datetime', 'high', 'exchange_id', 'code', 'low', 'close', 'open'
        0 '14847.0' '000001' '717567546.58' ... '4.936' '4.9577' '5.06'
        1 '12904.0' '000001' '578450487.59' ... '4.9236' '5.0538' '4.9546'
        2 '13639.0' '000001' '501360093.66' ... '4.9174' '4.9608' '5.0538'
        .. ... ... ... ... ... ... ...,
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryHisBar_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))

        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
  
smart.get_data_page_async(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    queryCallback=queryHisBar_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
  ],
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
### 技术指标-异步分页
### `异步分页-历史macd指标indicator_macd`
[历史macd指标示例](../example/pythonApiExample.md#异步分页-历史macd指标indicator-macd)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorMacd_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorMacd_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'dif', 'dea', 'hist'
        0 2021-01-04 08:00:00 NaN NaN NaN
        1 2021-01-05 08:00:00 NaN NaN NaN
        .. ... ... ... ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorMacd_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `异步分页-历史ma指标indicator_ma`
[历史ma指标示例](../example/pythonApiExample.md#异步分页-历史ma指标indicator-ma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorMa_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
    {
      "date": "2021-02-19 08:00:00",
      "MA": 9.0927066667
    },
    ...
],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorMa_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'MA'
        0 2021-01-04 08:00:00 NaN
        1 2021-01-05 08:00:00 NaN
        2 2021-01-06 08:00:00 NaN
    ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorMa_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
    {
      "date": "2021-02-19 08:00:00",
      "MA": 9.0927066667
    },
    ...
],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `异步分页-历史ema指标indicator_ema`
[历史ema指标示例](../example/pythonApiExample.md#异步分页-历史ema指标indicator-ema)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorEma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "EMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorEma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data":'date', 'EMA'
        0 2021-01-04 08:00:00 NaN
        1 2021-01-05 08:00:00 NaN
        2 2021-01-06 08:00:00 NaN
    .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorEma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "EMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `异步分页-历史boll指标indicator_boll`
[历史boll指标示例](../example/pythonApiExample.md#异步分页-历史boll指标indicator-boll)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorBoll_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
    {
      "date": "2021-01-29 08:00:00",
      "upper": 9.1163876923,
      "middle": 8.867845,
      "lower": 8.6193023077
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorBoll_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'upper', 'middle', 'lower'
        0 2021-01-04 08:00:00 NaN NaN NaN
        1 2021-01-05 08:00:00 NaN NaN NaN
        2 2021-01-06 08:00:00 NaN NaN NaN
        .. ... ... ... ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorBoll_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
    {
      "date": "2021-01-29 08:00:00",
      "upper": 9.1163876923,
      "middle": 8.867845,
      "lower": 8.6193023077
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `异步分页-历史wma指标indicator_wma`
[历史wma指标示例](../example/pythonApiExample.md#异步分页-历史wma指标indicator-wma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorWma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "WMA": 8.1629105376
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorWma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'WMA'
        0 2022-12-26 08:00:00 12.638581
        1 2022-12-27 08:00:00 12.665317
        1 2022-12-28 08:00:00 12.691634,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorWma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "WMA": 8.1629105376
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `异步分页-历史sma指标indicator_sma`
[历史sma指标示例](../example/pythonApiExample.md#异步分页-历史sma指标indicator-sma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorSma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorSma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'SMA'
        0 2022-12-26 08:00:00 12.378100
        1 2022-12-27 08:00:00 12.413880
        2 2022-12-28 08:00:00 12.456817
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorSma_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `异步分页-历史cci指标indicator_cci`
[历史cci指标示例](../example/pythonApiExample.md#异步分页-历史cci指标indicator-cci)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorCci_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
    {
      "date": "2022-01-21 08:00:00",
      "CCI": 105.1149959181
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorCci_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'CCI'
        0 2022-01-04 08:00:00 NaN
        1 2022-01-05 08:00:00 NaN
        2 2022-01-06 08:00:00 NaN
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorCci_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
    {
      "date": "2022-01-21 08:00:00",
      "CCI": 105.1149959181
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `异步分页-历史rsi指标indicator_rsi`
[历史rsi指标示例](../example/pythonApiExample.md#异步分页-历史rsi指标indicator-rsi)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
def queryIndicatorRsi_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
    {
      "date": "2022-01-24 08:00:00",
      "RSI": 56.97103583
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
def queryIndicatorRsi_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        logger.debug("get_data_page_async【OK】:%s",datalist.values)
        logger.debug("get_data_page_async【OK】:%s",datalist.index)
        logger.debug("get_data_page_async【OK】:%s",datalist.columns.tolist())
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": 'date', 'RSI'
        0 2022-01-04 08:00:00 NaN
        1 2022-01-05 08:00:00 NaN
        2 2022-01-06 08:00:00 NaN
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
def queryIndicatorRsi_callback(result:DataPageInfo,err):
    if(err):
        logger.debug("get error from get_data_page_async:%s",err)
    else:
        logger.debug("get_data_page_async:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
        datalist = result.data
        for i in range(len(datalist)):
            if i < 5:   
                logger.debug("get_data_page_async【OK】前5个:%s",smart.utils.toString(datalist[i]))
        logger.debug("get_data_page_async【OK】:%d",len(datalist))
        logger.debug("get_data_page_async【OK】:%s",datalist.ndim)
        logger.debug("get_data_page_async【OK】:%s",datalist.shape)
        logger.debug("get_data_page_async【OK】:%s",datalist.size)
        logger.debug("get_data_page_async【OK】:%s",datalist.dtype)
        logger.debug("get_data_page_async【OK】:%s",datalist.itemsize)
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
    {
      "date": "2022-01-24 08:00:00",
      "RSI": 56.97103583
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
## `get_data_sync-同步查询数据`
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `outFormat` String(选填) - 查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。不填时默认为OutFormat.List 
```python
smart.get_data_sync(method=method, inParams=inParams, outFormat=outFormat)
```
### `历史行情-同步`
### `同步-交易日历-trading_day`
[获取交易日历列表示例](../example/pythonApiExample.md#同步-交易日历-trading-day)
>获取交易日历列表(同步接口)

>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python           
datalist = smart.get_data_sync(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List 
    )
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回

```python
[
    {
        "trading_date": "2023-01-03",     # 交易日期
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python     
datalist = smart.get_data_sync(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回

```python
  trading_date
0 2023-01-03
1 2023-01-04
...
[242 rows x 1 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python    
datalist = smart.get_data_sync(
    method="trading_day", # method方法：固定值
    inParams={
        "start_date": "20230101",# 开始日期
        "end_date": "20231231", # 结束日期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回

```python
[
    {
        "trading_date": "2023-01-03",     # 交易日期
    },
    ...
]
```

### `同步-历史ticker行情-his_ticker`
[获取历史ticker行情示例](../example/pythonApiExample.md#同步-历史ticker行情-his-ticker)
-   获取一个时间范围内的 ticker 数据, 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回

```python
[
    {
      "a1": "12.56",  #卖一档报盘价格
      "a2": "0.0",
      "a3": "0.0",
      "a4": "0.0",
      "a5": "0.0",
      "a1_v": "4200.0", #卖一档报盘量
      "a2_v": "0.0",
      "a3_v": "0.0",
      "a4_v": "0.0",
      "a5_v": "0.0",
      "b1": "12.56",  #买一档报盘
      "b2": "0.0",
      "b3": "0.0",
      "b4": "0.0",
      "b5": "0.0",
      "b1_v": "4200.0", #买一档报盘量
      "b2_v": "1900.0",
      "b3_v": "0.0",
      "b4_v": "0.0",
      "b5_v": "0.0",
      "open": "0.0",  #开盘价
      "high": "0.0",  #最高价
      "low": "0.0",   #最低价
      "last": "12.56", #最新价
      "limit_up": "13.82", #涨停价
      "limit_down": "11.3",#跌停价
      "datetime": "2023-04-14 09:15:00", #当前时间
      "volume": "0.0",  #成交量
      "prev_close": "12.56" #昨收价
      "total_turnover": "0.0", #成交额
      "change_rate": "0.0", #涨跌幅
      "code": "000001.SZ", #证券代码
      "instrument_id": "000001"   #证券代码
      "exchange_id": "SZE"        #市场类型
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python 
datalist = smart.get_data_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'a2_v', 'a3_v', 'a4_v', 'a5_v', 'a1_v', 'total_turnover', 'b1', 'b2', 'limit_down', 'b3', 'datetime', 'high', 'b4', 'exchange_id', 'b5', 'code', 'low', 'trading_date', 'num_trades', 'last', 'b4_v', 'b3_v', 'b5_v', 'b2_v', 'b1_v', 'instrument_id', 'change_rate', 'volume', 'a1', 'a2', 'a3', 'a4', 'limit_up', 'a5', 'open', 'prev_close'
0 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
1 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
2 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
... ... ... ... ... ... ... ... ... ...
[4820 rows x 36 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12" # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
    )
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回

```python
[
    {
      "a1": "12.56",  #卖一档报盘价格
      "a2": "0.0",
      "a3": "0.0",
      "a4": "0.0",
      "a5": "0.0",
      "a1_v": "4200.0", #卖一档报盘量
      "a2_v": "0.0",
      "a3_v": "0.0",
      "a4_v": "0.0",
      "a5_v": "0.0",
      "b1": "12.56",  #买一档报盘
      "b2": "0.0",
      "b3": "0.0",
      "b4": "0.0",
      "b5": "0.0",
      "b1_v": "4200.0", #买一档报盘量
      "b2_v": "1900.0",
      "b3_v": "0.0",
      "b4_v": "0.0",
      "b5_v": "0.0",
      "open": "0.0",  #开盘价
      "high": "0.0",  #最高价
      "low": "0.0",   #最低价
      "last": "12.56", #最新价
      "limit_up": "13.82", #涨停价
      "limit_down": "11.3",#跌停价
      "datetime": "2023-04-14 09:15:00", #当前时间
      "volume": "0.0",  #成交量
      "prev_close": "12.56" #昨收价
      "total_turnover": "0.0", #成交额
      "change_rate": "0.0", #涨跌幅
      "code": "000001.SZ", #证券代码
      "instrument_id": "000001"   #证券代码
      "exchange_id": "SZE"        #市场类型
    },
    ...
]
```
### `同步-历史bar数据-his_bar`
[获取历史bar数据示例](../example/pythonApiExample.md#同步-历史bar数据-his-bar)
-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'num_trades', 'instrument_id', 'total_turnover', 'volume', 'datetime', 'high', 'exchange_id', 'code', 'low', 'close', 'open'
0 '14847.0' '000001' '717567546.58' ... '4.936' '4.9577' '5.06'
1 '12904.0' '000001' '578450487.59' ... '4.9236' '5.0538' '4.9546'
2 '13639.0' '000001' '501360093.66' ... '4.9174' '4.9608' '5.0538'
.. ... ... ... ... ... ... ...
[240 rows x 11 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
]
```

### `同步-行业分类列表-industry_category`
[获取行业分类列表示例](../example/pythonApiExample.md#同步-行业分类列表-industry-category)
-   数据为中信 2019 标准
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="industry_category", # method方法：固定值
    inParams={},
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[{
      "first_industry_name": "石油石化",      #一级行业名称
      "first_industry_code": "10",           #一级行业代码
      "second_industry_name": "石油开采Ⅱ",    #二级行业名称
      "second_industry_code": "1010",        #二级行业代码
      "third_industry_name": "石油开采Ⅲ"     #三级行业名称
      "third_industry_code": "101010",       #三级行业代码
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="industry_category", # method方法：固定值
    inParams={},
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'first_industry_name', 'third_industry_code', 'second_industry_code', 'first_industry_code', 'second_industry_name', 'third_industry_name'
0 '石油石化' '101010' '1010' '10' '石油开采Ⅱ' '石油开采Ⅲ'
1 '石油石化' '102010' '1020' '10' '石油化工' '炼油'
2 '石油石化' '102040' '1020' '10' '石油化工' '油品销售及仓储'
.. ... ... ...
[278 rows x 6 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
smart.get_data_sync(
    method="industry_category", # method方法：固定值
    inParams={},
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[{
      "first_industry_name": "石油石化",      #一级行业名称
      "first_industry_code": "10",           #一级行业代码
      "second_industry_name": "石油开采Ⅱ",    #二级行业名称
      "second_industry_code": "1010",        #二级行业代码
      "third_industry_name": "石油开采Ⅲ"     #三级行业名称
      "third_industry_code": "101010",       #三级行业代码
    },
    ...
]
```
### `同步-某行业板块下股票-industry_ticker`
[获取某行业板块下股票示例](../example/pythonApiExample.md#同步-某行业板块下股票-industry-ticker)
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[{
      "code": "000059.SZ",      #证券代码 SZ:深证 SH:上海
      "instrument_id": "000059",           #证券代码
      "exchange_id": "SZE"                 #交易所类型 SZE:深证 SSE:上海
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'first_industry_name', 'third_industry_code', 'second_industry_code', 'first_industry_code', 'second_industry_name', 'third_industry_name'
0 '石油石化' '101010' '1010' '10' '石油开采Ⅱ' '石油开采Ⅲ'
1 '石油石化' '102010' '1020' '10' '石油化工' '炼油'
.. ... ... ...
[278 rows x 6 columns]

```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="industry_ticker", # method方法：固定值
    inParams={
        "industry": "10" # 行业代码,该值取至industry_category接口的一级行业代码、二级行业代码或三级行业代码
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[{
      "code": "000059.SZ",      #证券代码 SZ:深证 SH:上海
      "instrument_id": "000059",           #证券代码
      "exchange_id": "SZE"                 #交易所类型 SZE:深证 SSE:上海
    },
    ...
]
```
### `技术指标-同步`
### `同步-历史macd指标-indicator_macd`
[获取历史macd指标示例](../example/pythonApiExample.md#同步-历史macd指标-indicator-macd)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'dif', 'dea', 'hist'
0 2021-01-04 08:00:00 NaN NaN NaN
1 2021-01-05 08:00:00 NaN NaN NaN
.. ... ... ... ...
[485 rows x 4 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
]
```

### `同步-历史ma指标-indicator_ma`
[获取历史ma指标示例](../example/pythonApiExample.md#同步-历史ma指标-indicator-ma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>入参
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
smart.get_data_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'MA'
0 2021-01-04 08:00:00 NaN
1 2021-01-05 08:00:00 NaN
2 2021-01-06 08:00:00 NaN
.. ... ...
[485 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    queryCallback=queryIndicatorMa_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
]
```

### `同步-历史ema指标-indicator_ema`
[获取历史ema指标示例](../example/pythonApiExample.md#同步-历史ema指标-indicator-ema)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'EMA'
0 2021-01-04 08:00:00 NaN
1 2021-01-05 08:00:00 NaN
2 2021-01-06 08:00:00 NaN
.. ... ...
[485 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30 # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
]
```

### `同步-历史boll指标-indicator_boll`
[获取历史boll指标示例](../example/pythonApiExample.md#同步-历史boll指标-indicator-boll)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python   
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'upper', 'middle', 'lower'
0 2021-01-04 08:00:00 NaN NaN NaN
1 2021-01-05 08:00:00 NaN NaN NaN
2 2021-01-06 08:00:00 NaN NaN NaN
.. ... ... ... ...
[485 rows x 4 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python     
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
]
```

### `同步-历史wma指标-indicator_wma`
[获取历史wma指标示例](../example/pythonApiExample.md#同步-历史wma指标-indicator-wma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python       
datalist = smart.get_data_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'WMA'
0 2022-12-26 08:00:00 12.638581
1 2022-12-27 08:00:00 12.665317
1 2022-12-28 08:00:00 12.691634
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python   
datalist = smart.get_data_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
]
```

### `同步-历史sma指标-indicator_sma`
[获取历史sma指标示例](../example/pythonApiExample.md#同步-历史sma指标-indicator-sma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'SMA'
0 2022-12-26 08:00:00 12.378100
1 2022-12-27 08:00:00 12.413880
2 2022-12-28 08:00:00 12.456817
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
]
```

### `同步-历史cci指标-indicator_cci`
[获取历史cci指标示例](../example/pythonApiExample.md#同步-历史cci指标-indicator-cci)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    queryCallback=queryIndicatorCci_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'CCI'
0 2022-01-04 08:00:00 NaN
1 2022-01-05 08:00:00 NaN
2 2022-01-06 08:00:00 NaN
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
smart.get_data_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
]
```

### `同步-历史rsi指标-indicator_rsi`
[获取历史rsi指标示例](../example/pythonApiExample.md#同步-历史rsi指标-indicator-rsi)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python   
datalist = smart.get_data_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'date', 'RSI'
0 2022-01-04 08:00:00 NaN
1 2022-01-05 08:00:00 NaN
2 2022-01-06 08:00:00 NaN
.. ... ...
[242 rows x 2 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python      
datalist = smart.get_data_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14 # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
]
```
### `基础财务-同步`
### `同步-获取十大流通股东-top10_currency_shareholder`
[获取十大流通股东示例](../example/pythonApiExample.md#同步-获取十大流通股东-top10-currency-shareholder)
-   获取的为最近 1 年流通股东的数据。
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python     
datalist = smart.get_data_sync(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'end_date', 'shareholder_type', 'shareholder_kind', 'hold_percent_total', 'instrument_id', 'exchange_id', 'share_pledge', 'code', 'shareholder_attr', 'rank', 'share_freeze', 'shareholder_name', 'info_date', 'hold_percent_float'
0 '2023-03-31' '' '保险投资组合' '0.28279' '000001' 'SZE' '' '000001.SZ' '证券品种' '10' '' '新华人寿保险股份有限公司-分红-个人分红-018L-FH002深' '2023-04-25' '0.282795'
1 '2023-03-31' '' '社保基金、社保机构' '0.299278' '000001' 'SZE' '' '000001.SZ' '证券品种' '9' '' '全国社保基金一零一组合' '2023-04-25' '0.299284'
... ...
[10 rows x 14 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="top10_currency_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```

### `同步-获取十大股东-top10_shareholder`
[获取获取十大股东示例](../example/pythonApiExample.md#同步-获取十大股东-top10-shareholder)
-   获取的为最近 1 年股东的数据。
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python      
datalist = smart.get_data_sync(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    queryCallback=queryTop10Shareholder_callback, # 回调函数
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'end_date', 'shareholder_type', 'shareholder_kind', 'hold_percent_total', 'instrument_id', 'exchange_id', 'share_pledge', 'code', 'shareholder_attr', 'rank', 'share_freeze', 'shareholder_name', 'info_date', 'hold_percent_float'
0 '2023-03-31' '其他股东' '保险投资组合' '0.28279' '000001' 'SZE' '' '000001.SZ' '证券品种' '10' '' '新华人寿保险股份有限公司-分红-个人分红-018L-FH002深' '2023-04-25' '0.282795'
1 '2023-03-31' '其他股东' '社保基金、社保机构' '0.299278' '000001' 'SZE' '' '000001.SZ' '证券品种' '9' '' '全国社保基金一零一组合' '2023-04-25' '0.299284'
... ...
[10 rows x 14 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
smart.get_data_sync(
    method="top10_shareholder", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "info_date": "2023-04-29",          #公告发布日
      "end_date": "2023-03-31",           #截止日期
      "instrument_id": "600000",          #证券代码
      "exchange_id": "SSE",               #交易所类型
      "code": "600000.SH"      #证券代码
      "shareholder_type": "",             #股东类别
      "shareholder_kind": "资产管理公司",  #股东性质
      "shareholder_attr": "企业",         #股东属性
      "shareholder_name": "中央汇金资产管理有限责任公司",  #股东名称
      "rank": "10",                       #股东排名
      "hold_percent_total": "1.319067",   #占股比例(%)
      "hold_percent_float": "1.319067"    #占流通 A 股比例（%）
      "share_pledge": "",                 #股权质押涉及股数
      "share_freeze": "",                 #股权冻结涉及股数
    },
    ...
]
```

### `同步-最新财务数据-finance_data`
[最新财务数据示例](../example/pythonApiExample.md#同步-最新财务数据-finance-data)
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
datalist = smart.get_data_sync(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
```
* 返回
```python
[
    {
      "code": "000001.SZ",                           #证券代码
      "exchange_id": "SZE",                                     #交易所类型
      "instrument_id": "000001",                                #证券代码
      "pe_ratio_1": "4.843378827868881",                        #市盈率(静态)
      "pe_ratio_ttm": "4.663857805053736",                      #市盈率TTM
      "total_assets": "5455897000000.0",                        #总资产
      "undistributed_profit_per_share": "10.245637334516399",   #每股未分配利润
      "a_share_market_val_in_circulation": "220447013352.0",    #流通 A 股市值
      "pb_ratio": "0.5850600999712846",                         #市净率
      "cash_flow_from_operating_activities": "109156000000.0",  #现金流量净额
      "operating_revenue": "45098000000.0",                     #主营业务收入
      "basic_earnings_per_share": "0.65",                       #基本每股收益
      "a_share_market_val": "220451230729.28",                  #A股市值
      "capital_reserve_per_share_ttm": "4.16372980528834",      #每股公积金
      "net_profit": "14602000000.0",                            #净利润
      "total_circulation": "19405918198.0",                     #总股本
      "total_circulation_a": "19405918198.0",                   #A股总股本
      "circulation_a": "19405546950.0",                         #流通A股
      "non_circulation_a": "371248.0"                           #非流通A股
      "free_circulation": "8160427512.0",                       #实际流通股本
    }
]
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
datalist = smart.get_data_sync(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
logger.debug("get_data_sync【OK】:%s",datalist.values)
logger.debug("get_data_sync【OK】:%s",datalist.index)
logger.debug("get_data_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
  'pe_ratio_1', 'total_assets', 'undistributed_profit_per_share', 'total_circulation_a', 'a_share_market_val_in_circulation', 'pe_ratio_ttm', 'pb_ratio', 'cash_flow_from_operating_activities', 'operating_revenue', 'basic_earnings_per_share', 'instrument_id', 'a_share_market_val', 'exchange_id', 'code', 'capital_reserve_per_share_ttm', 'free_circulation', 'net_profit', 'total_circulation', 'circulation_a', 'non_circulation_a'
0 '4.834851752467704' '5455897000000.0' '10.245637334516399' '19405918198.0' '220058902413.0' '4.6556467877913175' '0.5840300645840112' '109156000000.0' '45098000000.0' '0.65' '000001' '220063112365.32' 'SZE' '000001.SZ' '4.16372980528834' '8160427512.0' '14602000000.0' '19405918198.0' '19405546950.0' '371248.0'
[1 rows x 20 columns]
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
datalist = smart.get_data_sync(
    method="finance_data", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug(datalist)
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_sync【OK】:%d",len(datalist))
logger.debug("get_data_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_sync【OK】:%s",datalist.shape)
logger.debug("get_data_sync【OK】:%s",datalist.size)
logger.debug("get_data_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
[
    {
      "code": "000001.SZ",                           #证券代码
      "exchange_id": "SZE",                                     #交易所类型
      "instrument_id": "000001",                                #证券代码
      "pe_ratio_1": "4.843378827868881",                        #市盈率(静态)
      "pe_ratio_ttm": "4.663857805053736",                      #市盈率TTM
      "total_assets": "5455897000000.0",                        #总资产
      "undistributed_profit_per_share": "10.245637334516399",   #每股未分配利润
      "a_share_market_val_in_circulation": "220447013352.0",    #流通 A 股市值
      "pb_ratio": "0.5850600999712846",                         #市净率
      "cash_flow_from_operating_activities": "109156000000.0",  #现金流量净额
      "operating_revenue": "45098000000.0",                     #主营业务收入
      "basic_earnings_per_share": "0.65",                       #基本每股收益
      "a_share_market_val": "220451230729.28",                  #A股市值
      "capital_reserve_per_share_ttm": "4.16372980528834",      #每股公积金
      "net_profit": "14602000000.0",                            #净利润
      "total_circulation": "19405918198.0",                     #总股本
      "total_circulation_a": "19405918198.0",                   #A股总股本
      "circulation_a": "19405546950.0",                         #流通A股
      "non_circulation_a": "371248.0"                           #非流通A股
      "free_circulation": "8160427512.0",                       #实际流通股本
    }
]
```
## `get_data_page_sync-同步分页查询数据`
>分页查询数据，返回数据带分页信息
* `method` String(必填) - 方法
* `inParams` Object(必填) - 查询参数（该参数因method而变）
* `queryCallback` Function(必填) -  回调函数：返回查询结果(result,err)
* `outFormat` String(选填) -  查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray
```python
smart.get_data_page_sync(method=method, inParams=inParams,outFormat=outFormat)
```
### 历史行情-同步分页
### `同步分页-历史ticker行情his_ticker`
[历史ticker行情示例](../example/pythonApiExample.md#同步分页-历史ticker行情his-ticker)
-   获取一个时间范围内的 ticker 数据, 数据量较大, 请输入合适的开始结束日期
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
        "a1": "12.56",  #卖一档报盘价格
        "a2": "0.0",
        "a3": "0.0",
        "a4": "0.0",
        "a5": "0.0",
        "a1_v": "4200.0", #卖一档报盘量
        "a2_v": "0.0",
        "a3_v": "0.0",
        "a4_v": "0.0",
        "a5_v": "0.0",
        "b1": "12.56",  #买一档报盘
        "b2": "0.0",
        "b3": "0.0",
        "b4": "0.0",
        "b5": "0.0",
        "b1_v": "4200.0", #买一档报盘量
        "b2_v": "1900.0",
        "b3_v": "0.0",
        "b4_v": "0.0",
        "b5_v": "0.0",
        "open": "0.0",  #开盘价
        "high": "0.0",  #最高价
        "low": "0.0",   #最低价
        "last": "12.56", #最新价
        "limit_up": "13.82", #涨停价
        "limit_down": "11.3",#跌停价
        "datetime": "2023-04-14 09:15:00", #当前时间
        "volume": "0.0",  #成交量
        "prev_close": "12.56" #昨收价
        "total_turnover": "0.0", #成交额
        "change_rate": "0.0", #涨跌幅
        "code": "000001.SZ", #证券代码
        "instrument_id": "000001"   #证券代码
        "exchange_id": "SZE"        #市场类型
    },
    ...
  ],
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python   
result = smart.get_data_page_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'a2_v', 'a3_v', 'a4_v', 'a5_v', 'a1_v', 'total_turnover', 'b1', 'b2', 'limit_down', 'b3', 'datetime', 'high', 'b4', 'exchange_id', 'b5', 'code', 'low', 'trading_date', 'num_trades', 'last', 'b4_v', 'b3_v', 'b5_v', 'b2_v', 'b1_v', 'instrument_id', 'change_rate', 'volume', 'a1', 'a2', 'a3', 'a4', 'limit_up', 'a5', 'open', 'prev_close'
        0 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        1 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        2 0.0 0.0 0.0 0.0 ... 13.07 0.0 0.0 11.88
        ... ... ... ... ... ... ... ... ... ...
  ,
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python   
result = smart.get_data_page_sync(
    method="his_ticker", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2023-06-12", # 开始日期
        "end_date": "2023-06-12", # 结束日期
    },
    queryCallback=queryHisTicker_callback, # 回调函数
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_syncc【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
        "a1": "12.56",  #卖一档报盘价格
        "a2": "0.0",
        "a3": "0.0",
        "a4": "0.0",
        "a5": "0.0",
        "a1_v": "4200.0", #卖一档报盘量
        "a2_v": "0.0",
        "a3_v": "0.0",
        "a4_v": "0.0",
        "a5_v": "0.0",
        "b1": "12.56",  #买一档报盘
        "b2": "0.0",
        "b3": "0.0",
        "b4": "0.0",
        "b5": "0.0",
        "b1_v": "4200.0", #买一档报盘量
        "b2_v": "1900.0",
        "b3_v": "0.0",
        "b4_v": "0.0",
        "b5_v": "0.0",
        "open": "0.0",  #开盘价
        "high": "0.0",  #最高价
        "low": "0.0",   #最低价
        "last": "12.56", #最新价
        "limit_up": "13.82", #涨停价
        "limit_down": "11.3",#跌停价
        "datetime": "2023-04-14 09:15:00", #当前时间
        "volume": "0.0",  #成交量
        "prev_close": "12.56" #昨收价
        "total_turnover": "0.0", #成交额
        "change_rate": "0.0", #涨跌幅
        "code": "000001.SZ", #证券代码
        "instrument_id": "000001"   #证券代码
        "exchange_id": "SZE"        #市场类型
    },
    ...
  ],
  "totalCount": 4820, #总记录数
  "currentPage": 1, #当前页
  "pageSize": 4820, #每页记录数
  "totalPage": 1 #总页数
}
```

### `同步分页-历史bar数据his_bar`
[历史bar数据示例](../example/pythonApiExample.md#同步分页-历史bar数据his-bar)
-   获取一个时间范围内的 bar 数据, 数据量较大, 请输入合适的开始结束日期
-   返回数据默认为前复权
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
  ],
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'num_trades', 'instrument_id', 'total_turnover', 'volume', 'datetime', 'high', 'exchange_id', 'code', 'low', 'close', 'open'
        0 '14847.0' '000001' '717567546.58' ... '4.936' '4.9577' '5.06'
        1 '12904.0' '000001' '578450487.59' ... '4.9236' '5.0538' '4.9546'
        2 '13639.0' '000001' '501360093.66' ... '4.9174' '4.9608' '5.0538'
        .. ... ... ... ... ... ... ...,
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="his_bar", # String(必填) method方法：固定值
    inParams={
        "code": "000001.SZ", # String(必填) 证券代码  SZ:深证 SH:上海
        "start_date": "2013-01-04", # String(必填) 开始日期
        "end_date": "2014-01-04", # String(必填) 结束日期
        "frequency": "1d", # String(选填) 频次 仅支持1m 15m 30m 60m 1d 1w 默认1d
        "adjust_type": "pre" # String(选填) 复权方式 none:不复权 pre:前复权 post:后复权 默认前复权
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))

logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [{
      "open": "16.32",                  #开盘价
      "high": "16.36",                  #最高价
      "low": "16.1",                    #最低价
      "close": "16.34",                 #收盘价
      "volume": "3282498.0",            #成交量
      "total_turnover": "53469391.0",   #成交额
      "code": "000001.SZ",   #证券代码  SZ:深证 SH:上海
      "exchange_id": "SZE",             #交易所类型 SZE: 深证  SSE: 上海
      "instrument_id": "000001"         #证券代码
      "datetime": "2013-01-04 09:35:00",#发生日期
      "num_trades": "1339.0"            #成交笔数
    },
    ...
  ],
  "totalCount": 240,
  "currentPage": 1,
  "pageSize": 240,
  "totalPage": 1
}
```
### 技术指标-同步分页
### `同步分页-历史macd指标indicator_macd`
[历史macd指标示例](../example/pythonApiExample.md#同步分页-历史macd指标indicator-macd)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python       
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'dif', 'dea', 'hist'
        0 2021-01-04 08:00:00 NaN NaN NaN
        1 2021-01-05 08:00:00 NaN NaN NaN
        .. ... ... ... ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "dif": null, # 快线
      "dea": null, # 慢线
      "hist": null  # (DIF-DEA)*2
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `同步分页-历史ma指标indicator_ma`
[历史ma指标示例](../example/pythonApiExample.md#同步分页-历史ma指标indicator-ma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
    {
      "date": "2021-02-19 08:00:00",
      "MA": 9.0927066667
    },
    ...
],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'MA'
        0 2021-01-04 08:00:00 NaN
        1 2021-01-05 08:00:00 NaN
        2 2021-01-06 08:00:00 NaN
    ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python 
result = smart.get_data_page_sync(
    method="indicator_ma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "MA": null
    },
    ...
    {
      "date": "2021-02-19 08:00:00",
      "MA": 9.0927066667
    },
    ...
],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `同步分页-历史ema指标indicator_ema`
[历史ema指标示例](../example/pythonApiExample.md#同步分页-历史ema指标indicator-ema)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "EMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data":'date', 'EMA'
        0 2021-01-04 08:00:00 NaN
        1 2021-01-05 08:00:00 NaN
        2 2021-01-06 08:00:00 NaN
    .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="indicator_ema", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2021-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "EMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "EMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `同步分页-历史boll指标indicator_boll`
[历史boll指标示例](../example/pythonApiExample.md#同步分页-历史boll指标indicator-boll)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
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
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
    {
      "date": "2021-01-29 08:00:00",
      "upper": 9.1163876923,
      "middle": 8.867845,
      "lower": 8.6193023077
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
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
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'upper', 'middle', 'lower'
        0 2021-01-04 08:00:00 NaN NaN NaN
        1 2021-01-05 08:00:00 NaN NaN NaN
        2 2021-01-06 08:00:00 NaN NaN NaN
        .. ... ... ... ...,
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
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
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2021-01-04 08:00:00",
      "upper": null,
      "middle": null,
      "lower": null
    },
    ...
    {
      "date": "2021-01-29 08:00:00",
      "upper": 9.1163876923,
      "middle": 8.867845,
      "lower": 8.6193023077
    },
    ...
  ],
  "totalCount": 485,
  "currentPage": 1,
  "pageSize": 485,
  "totalPage": 1
}
```

### `同步分页-历史wma指标indicator_wma`
[历史wma指标示例](../example/pythonApiExample.md#同步分页-历史wma指标indicator-wma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "WMA": 8.1629105376
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'WMA'
        0 2022-12-26 08:00:00 12.638581
        1 2022-12-27 08:00:00 12.665317
        1 2022-12-28 08:00:00 12.691634,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="indicator_wma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "WMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "WMA": 8.1629105376
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `同步分页-历史sma指标indicator_sma`
[历史sma指标示例](../example/pythonApiExample.md#同步分页-历史sma指标indicator-sma)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'SMA'
        0 2022-12-26 08:00:00 12.378100
        1 2022-12-27 08:00:00 12.413880
        2 2022-12-28 08:00:00 12.456817
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="indicator_sma", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 30, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "SMA": null
    },
    ...
    {
      "date": "2022-02-21 08:00:00",
      "SMA": 8.1736
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `同步分页-历史cci指标indicator_cci`
[历史cci指标示例](../example/pythonApiExample.md#同步分页-历史cci指标indicator-cci)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
    {
      "date": "2022-01-21 08:00:00",
      "CCI": 105.1149959181
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())
```
* 返回
```python
{
  "data": 'date', 'CCI'
        0 2022-01-04 08:00:00 NaN
        1 2022-01-05 08:00:00 NaN
        2 2022-01-06 08:00:00 NaN
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="indicator_cci", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "CCI": null
    },
    ...
    {
      "date": "2022-01-21 08:00:00",
      "CCI": 105.1149959181
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```

### `同步分页-历史rsi指标indicator_rsi`
[历史rsi指标示例](../example/pythonApiExample.md#同步分页-历史rsi指标indicator-rsi)
-   后台实时计算得出
-   当前不支持分页, 数据均存储在第一页, 后面可能会根据情况修改成分页模式，请按照分页逻辑获取数据
>第一种入参
* 不传outFormat或outFormat=OutFormat.List时：
```python
result = smart.get_data_page_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.List #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
    {
      "date": "2022-01-24 08:00:00",
      "RSI": 56.97103583
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第二种入参
* outFormat=OutFormat.DataFrame时：
```python
result = smart.get_data_page_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.DataFrame #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
logger.debug("get_data_page_sync【OK】:%s",datalist.values)
logger.debug("get_data_page_sync【OK】:%s",datalist.index)
logger.debug("get_data_page_sync【OK】:%s",datalist.columns.tolist())

```
* 返回
```python
{
  "data": 'date', 'RSI'
        0 2022-01-04 08:00:00 NaN
        1 2022-01-05 08:00:00 NaN
        2 2022-01-06 08:00:00 NaN
        .. ... ...,
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```
>第三种入参
* outFormat=OutFormat.Ndarray时：
```python
result = smart.get_data_page_sync(
    method="indicator_rsi", # method方法：固定值
    inParams={
        "code": "000001.SZ", # 证券代码  SZ:深证 SH:上海
        "start_date": "2022-01-01", # 开始日期
        "end_date": "2023-01-01", # 结束日期
        "adjust_type": "pre", # none:不复权 pre:前复权 post后复权
        "timeperiod": 14, # 周期
    },
    outFormat=OutFormat.Ndarray #查询结果的转出类型：OutFormat.List(默认) 、OutFormat.DataFrame、OutFormat.Ndarray。选填，不填时默认为OutFormat.List
)
logger.debug("get_data_page_sync:当前页：%d,每页记录数：%d,总记录数：%d,总页数：%d"%(result.currentPage,result.pageSize,result.totalCount,result.totalPage))
datalist = result.data
for i in range(len(datalist)):
    if i < 5:   
        logger.debug("get_data_page_sync【OK】前5个:%s",smart.utils.toString(datalist[i]))
logger.debug("get_data_page_sync【OK】:%d",len(datalist))
logger.debug("get_data_page_sync【OK】:%s",datalist.ndim)
logger.debug("get_data_page_sync【OK】:%s",datalist.shape)
logger.debug("get_data_page_sync【OK】:%s",datalist.size)
logger.debug("get_data_page_sync【OK】:%s",datalist.dtype)
logger.debug("get_data_page_sync【OK】:%s",datalist.itemsize)
```
* 返回
```python
{
  "data": [
    {
      "date": "2022-01-04 08:00:00",
      "RSI": null
    },
    ...
    {
      "date": "2022-01-24 08:00:00",
      "RSI": 56.97103583
    },
    ...
  ],
  "totalCount": 242,
  "currentPage": 1,
  "pageSize": 242,
  "totalPage": 1
}
```