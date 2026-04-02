// 根据信号过滤条件筛选可交易数据，默认原样返回。
function filter(ctx) {
  return ctx.values
}

module.exports = { filter }
