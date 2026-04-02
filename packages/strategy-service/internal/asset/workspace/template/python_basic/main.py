from backtest.engine import run
from config import bars, cfg
from indicators.factors import factors
from risk.constraints import allow
from risk.position import size
from signals.entry import entry
from signals.exit import exit
from signals.filter import filter


def build(bars, cfg):
    """组装策略上下文，给后续指标、信号和回测模块共用。"""

    return {
        "bars": bars,
        "cfg": cfg,
        "values": factors(bars, cfg),
        "filter": [],
        "entry": [],
        "exit": [],
    }


def main():
    """入口函数：只负责串联流程，不预置具体量化逻辑。"""

    ctx = build(bars, cfg)
    rows = filter(ctx)
    open_rows = entry({**ctx, "filter": rows})
    close_rows = exit({**ctx, "filter": rows, "entry": open_rows})
    valid = [item for item in open_rows if allow(item, cfg)]
    out = run({**ctx, "filter": rows, "entry": valid, "exit": close_rows}, lambda price: size(cfg, price))
    print("python quant strategy scaffold")
    print(out)


if __name__ == "__main__":
    main()
