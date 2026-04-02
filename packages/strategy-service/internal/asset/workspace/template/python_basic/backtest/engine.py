def run(ctx, sizing):
    """回测引擎占位，只输出当前策略骨架收集到的模块结果。"""

    return {
        "bars": len(ctx["bars"]),
        "factors": len(ctx["values"]),
        "filter": len(ctx["filter"]),
        "entry": len(ctx["entry"]),
        "exit": len(ctx["exit"]),
        "sizing": sizing(0),
        "ready": False,
    }
