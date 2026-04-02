// 计算指标或因子特征，默认只返回原始 bar 数据占位。
function factors(bars, cfg) {
  return bars.map((item) => ({ ...item }))
}

module.exports = { factors }
