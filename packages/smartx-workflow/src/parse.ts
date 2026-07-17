import type { ReviewItem, ReviewResult } from "./types.js"

/** 提取 task_result 包裹的主体内容；没有包裹时直接返回原文。 */
export function result(text: string) {
  const match = text.match(/<task_result>\s*([\s\S]*?)\s*<\/task_result>/)
  return (match?.[1] ?? text).trim()
}

/** 去掉常见 fenced code block 包装。 */
function fence(text: string) {
  return text.replace(/^```(?:json|markdown|md|text)?\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim()
}

/** 清洗列表项里的 markdown 噪音，保留可读文本。 */
function tidy(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/, "")
    .replace(/[`*_#>|[\]]/g, "")
    .trim()
}

/** 尝试把文本解析成字符串数组；失败时返回空数组。 */
function parse(text: string) {
  try {
    const data: unknown = JSON.parse(text)
    if (!Array.isArray(data)) return []
    return data.map((item) => (typeof item === "string" ? tidy(item) : "")).filter(Boolean)
  } catch {
    return []
  }
}

/** 解析 workspace-analyzer 产出的 JSON 数组结果。 */
export function items(text: string) {
  return parse(fence(result(text)))
}

/** 把列表重新序列化成稳定 JSON，便于持久化和比较。 */
export function serial(list: string[]) {
  return JSON.stringify(list.map(tidy).filter(Boolean), null, 2)
}

/** 从任意输出里抽取合法的 Mermaid flowchart。 */
export function mermaid(text: string) {
  let out = result(text).trim()
  out = out.replace(/^```mermaid\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim()
  const idx = out.indexOf("flowchart")
  if (idx > 0) out = out.slice(idx).trim()
  if (!out.startsWith("flowchart")) return ""
  return out
}

/** 识别用户是否在请求代码审查，而不是在陈述审查结果。 */
export function wantsReview(text: string) {
  const out = text.trim().toLowerCase()
  if (!out) return false
  if (/(不要|不用|无需|取消|停止|跳过)\s*(做|进行|提交)?\s*(代码)?\s*(审查|review|code\s+review)/i.test(out)) return false
  if (/(审查\s*(结论|结果)|review\s*(result|conclusion))/i.test(out)) return false
  return /((代码|提交)?\s*审查|code\s+review|\breview\b)/i.test(out)
}

/** 识别用户是否在请求最终收口，而不是要求继续做事。 */
export function wantsFinal(text: string) {
  const out = text.trim().toLowerCase()
  if (!out) return false
  if (/(不要|不用|无需|取消|停止|跳过)\s*(最终总结|总结|收尾|结束|finish|final\s+summary|wrap\s*up)/i.test(out)) return false
  if (/(继续|接着|下一步|先别结束|不要结束)/i.test(out)) return false
  return /(最终总结|最终结论|最后总结|收尾|结束吧|完成了|可以结束|finish\b|final\s+summary|wrap\s*up)/i.test(out)
}

/** 提取审查报告正文，供保存和状态判断复用。 */
export function reviewText(text: string) {
  return fence(result(text))
}

/** 根据审查报告文本推导 passed / failed / error 三态。 */
export function reviewState(text: string) {
  const out = reviewText(text).trim()
  if (!out) return "error" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：-]?\s*(无法完成|无法审查|未能完成|error)/i.test(out)) return "error" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：-]?\s*(未通过|不通过|失败|failed)/i.test(out)) return "failed" as const
  if (/((审查)?(结论|结果)|review\s*(result|conclusion))\s*[:：-]?\s*(通过|passed)/i.test(out)) return "passed" as const
  if (/(无法完成|无法审查|未能完成|error)/i.test(out)) return "error" as const
  if (/(未通过|不通过|失败|风险|问题|failed)/i.test(out)) return "failed" as const
  return "error" as const
}

/** 严格解析 reviewer 的内部 JSON 契约；非法、空项或状态不一致时失败关闭。 */
export function reviewResult(text: string): ReviewResult | undefined {
  try {
    const value: unknown = JSON.parse(fence(result(text)))
    if (!value || typeof value !== "object" || Array.isArray(value)) return
    const row = value as Record<string, unknown>
    if (typeof row.summary !== "string" || !row.summary.trim() || !Array.isArray(row.items) || !row.items.length)
      return
    const list = row.items.map((item): ReviewItem | undefined => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return
      const data = item as Record<string, unknown>
      if (typeof data.name !== "string" || !data.name.trim()) return
      if (typeof data.detail !== "string" || !data.detail.trim()) return
      if (typeof data.status !== "string" || !["passed", "warning", "failed", "error"].includes(data.status))
        return
      if (data.suggestion !== undefined && typeof data.suggestion !== "string") return
      return {
        name: data.name.trim(),
        status: data.status as ReviewItem["status"],
        detail: data.detail.trim(),
        suggestion: typeof data.suggestion === "string" ? data.suggestion.trim() : "",
      }
    })
    if (list.some((item) => !item)) return
    const items = list.filter((item): item is ReviewItem => !!item)
    const state = items.some((item) => item.status === "error")
      ? "error"
      : items.some((item) => item.status === "warning" || item.status === "failed")
        ? "failed"
        : "passed"
    const declared = row.state === "warning" ? "failed" : row.state
    if (declared !== state) return
    if (row.suggestions !== undefined && !Array.isArray(row.suggestions)) return
    const suggestions = (row.suggestions ?? []).map((item) => (typeof item === "string" ? item.trim() : ""))
    if (suggestions.some((item) => !item)) return
    return { state, summary: row.summary.trim(), items, suggestions }
  } catch {
    return
  }
}
