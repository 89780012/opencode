from smart import *
import time
from datetime import datetime
import logging
from smart.type import AccountType
logger = logging.getLogger()

def init():
    #接收委托推送 
    def callback1(order):
        logger.debug("get on_order: %s",smart.utils.toString(order))
    smart.current_account.on_order(callback1)

    def callback2(order):
        logger.debug("get on_trade: %s",smart.utils.toString(order))
    smart.current_account.on_trade(callback2)

    def callback3(assets):
        logger.debug("get on_assets: %s",smart.utils.toString(assets))
    smart.current_account.on_assets(callback3)

    def callback4(position):
        logger.debug("get on_position: %s",smart.utils.toString(position))
    smart.current_account.on_position(callback4)

    account_id = None
    side = smart.Type.Side.Buy

    #下委托单
    def insert_callback(order,err):
        logger.debug("get insert_order: %s",smart.utils.toString(order))
        
    #instrument_id和exchange_id参数下单
    smart.insert_order(instrument_id = "300001",exchange_id = smart.Type.Exchange.SZE,limit_price = 18.24,volume = 200,side=side,callback = insert_callback)
    #code参数下单
    smart.insert_order(code="600918.SH",limit_price = 7.03,volume = 200,side=side,callback = insert_callback)
    
    #固定参数位置订阅股票
    smart.subscribe(account_id,['000722'], smart.Type.Exchange.SZE)
    #指定参数名称订阅股票
    smart.subscribe(instruments= ["600918"], exchange_id=smart.Type.Exchange.SSE)
    #混合批量订阅股票
    smart.subscribe(codes= ["600000.SH","000001.SZ"])

    def callback(quote):
        logger.debug("subscribeTest【OK】:%s",smart.utils.toString(quote))
    smart.on(smart.Event.ON_QUOTE,callback)
    

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