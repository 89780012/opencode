import logging

from smart import *

logger = logging.getLogger()

CODES = ["600000.SH", "000001.SZ"]
PERIOD = "1m"
STEP = 100
VOLUME = 1000
counts = {}
sent = set()


def order(row):
    logger.debug(
        "委托回报 code=%s status=%s volume=%s traded=%s",
        row.code,
        row.status_name,
        row.volume,
        row.volume_traded,
    )


def trade(row):
    logger.debug("成交回报 code=%s price=%s volume=%s", row.code, row.price, row.volume)


def bar(row):
    code = row.code
    counts[code] = counts.get(code, 0) + 1

    # 仅用于演示回测下单链路，实际策略必须替换为明确的信号与风控。
    if counts[code] != STEP or code in sent:
        return
    sent.add(code)
    logger.info("触发演示买单:%s", code)
    smart.insert_order(
        instrument_id=row.instrument_id,
        exchange_id=row.exchange_id,
        limit_price=row.close,
        volume=VOLUME,
        price_type=smart.Type.PriceType.Any,
        side=smart.Type.Side.Buy,
        offset=smart.Type.Offset.Init,
        business_type=smart.Type.BusinessType.CASH,
    )


def init():
    logger.info("初始化回测示例")
    counts.clear()
    sent.clear()
    smart.current_account.on_order(order)
    smart.current_account.on_trade(trade)

    failed = smart.subscribe_bar(CODES, PERIOD, bar)
    if failed:
        logger.warning("订阅 Bar 行情失败:%s", failed)
        return
    logger.info("订阅 Bar 行情成功:%s", CODES)


def close():
    failed = smart.unsubscribe_bar(CODES, PERIOD)
    if failed:
        logger.warning("取消订阅 Bar 行情失败:%s", failed)


smart.on_init(init)
smart.on_close(close)
