// 在交易前执行风险检查，默认全部放行。
function allow(item, cfg) {
  return true
}

module.exports = { allow }
