const { bars, cfg } = require("./config")
const { run } = require("./backtest/engine")
const { factors } = require("./indicators/factors")
const { entry } = require("./signals/entry")
const { exit } = require("./signals/exit")
const { filter } = require("./signals/filter")
const { allow } = require("./risk/constraints")
const { size } = require("./risk/position")

// 组装策略上下文，给后续指标、信号和回测模块共用。
function build(bars, cfg) {
  return {
    bars,
    cfg,
    values: factors(bars, cfg),
    filter: [],
    entry: [],
    exit: [],
  }
}

// 入口函数：只负责串联流程，不预置具体量化逻辑。
function main() {
  const ctx = build(bars, cfg)
  const rows = filter(ctx)
  const open = entry({ ...ctx, filter: rows })
  const close = exit({ ...ctx, filter: rows, entry: open })
  const valid = open.filter((item) => allow(item, cfg))
  const out = run({ ...ctx, filter: rows, entry: valid, exit: close }, (price) => size(cfg, price))
  console.log("js quant strategy scaffold")
  console.log(out)
}

main()
