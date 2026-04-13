/**
 * 约束全局名称只能使用小写字母、数字、下划线和中划线。
 */
export const rule = /^[a-z0-9][a-z0-9_-]*$/

/**
 * 识别纯数字名称，避免和普通标识混淆。
 */
export const digit = /^\d+$/

/**
 * 将时间字符串格式化为本地可读时间。
 */
export function stamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

/**
 * 简单等待一段时间，用于轮询刷新状态。
 */
export function wait(ms: number) {
  return new Promise((done) => window.setTimeout(done, ms))
}
