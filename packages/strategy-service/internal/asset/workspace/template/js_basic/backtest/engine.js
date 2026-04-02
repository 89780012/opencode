// 回测引擎占位，只输出当前策略骨架收集到的模块结果。
function run(ctx, sizing) {
  return {
    bars: ctx.bars.length,
    factors: ctx.values.length,
    filter: ctx.filter.length,
    entry: ctx.entry.length,
    exit: ctx.exit.length,
    sizing: sizing(0),
    ready: false,
  }
}

module.exports = { run }
