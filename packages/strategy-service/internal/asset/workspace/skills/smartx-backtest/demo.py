from datetime import datetime
import multiprocessing

from smart import *
import logging
from smart.type import *
logger = logging.getLogger()


def methodOne():

    def show():
        logger.debug("methodOne show---------------------------------------")

    def hide():
        logger.debug("methodOne hide--------------------------------------")

    def close():
        logger.debug("methodOne close--------------------------------------")
    

    smart.on_show(show)
    smart.on_hide(hide)
    smart.on_close(close)
    

    codes = ['000001.SZ']
    codes = ["000852.SH"]
    codes = ["000852.SH", "000001.SH"]
    period = "1m"  # 分钟线1m  日线 1d
    #方式一：订阅
    failList = smart.subscribe_bar(codes, period)
    if failList:
        logger.debug("存在订阅bar行情失败的code:%s",failList)
        # 可以重新发起订阅
    else:
        logger.debug("订阅bar行情全部成功")

    bar_callback_times = 0

    def on_bar_callback(bar):
        nonlocal bar_callback_times
        bar_callback_times += 1

        logger.debug("bar行情:%s", smart.utils.toString(bar))
        return

        if bar_callback_times % 100 == 0 :

            logger.debug("bar行情:%s", smart.utils.toString(bar))
            smart.insert_order(None, None, None, bar.instrument_id, bar.exchange_id, bar.close, 1000, smart.Type.PriceType.Any, smart.Type.Side.Buy, smart.Type.Offset.Init, None, None, smart.Type.BusinessType.CASH, None)
            # {"type": "bar_1min", "code": "600000.SH", "instrument_id": "600000", "exchange_id": "SSE", "trading_day": "2024-01-19", "source_id": "xtp", "start_time": "2024-01-19 13:25:00", "end_time": "2024-01-19 13:26:00", "time_interval": 1, "period": "1m", "high": 6.56, "low": 6.55, "open": 6.55, "close": 6.56, "volume": 51700, "start_volume": 39126164, "turnover": 339138, "start_turnover": 256328611}

        
    #监听行情
    smart.on(smart.Event.ON_BAR, on_bar_callback)



def init():

    logger.info("enter init --- " * 2)

    def trade_callback(trade):
        logger.debug("get on_trade:%s",smart.utils.toString(trade))

    smart.current_account.on_trade(trade_callback)

    def order_callback(order):
        logger.debug("get on_order:%s",smart.utils.toString(order))

    smart.current_account.on_order(order_callback)

    methodOne()
    


def show():
    logger.debug("show---------------------------------------")

def hide():
    logger.debug("hide--------------------------------------")

def close():
    logger.debug("close--------------------------------------")

smart.on_init(init)
smart.on_show(show)
smart.on_hide(hide)
smart.on_close(close)