let boot = false
let seq = 0

export function mermaidText(value: string) {
  const text = value.replace(/^\uFEFF/, "").trim()
  const match = /^```(?:mermaid)?\s*\r?\n([\s\S]*?)\r?\n```$/i.exec(text)
  return (match?.[1] ?? text).replace(/\r\n?/g, "\n").trim()
}

export function flowText(value: string) {
  const text = mermaidText(value)
  const flow = text.search(/\b(?:flowchart|graph)\b/i)
  if (flow <= 0) return text
  return text.slice(flow).trim()
}

export function mermaidError(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === "string") return error
  return "流程图渲染失败"
}

export async function renderMermaid(value: string) {
  if (!Object.hasOwn) {
    Object.defineProperty(Object, "hasOwn", {
      configurable: true,
      value(obj: object, key: PropertyKey) {
        return Object.prototype.hasOwnProperty.call(obj, key)
      },
      writable: true,
    })
  }

  const mod = await import("mermaid")
  const chart = mod.default
  if (!boot) {
    chart.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" })
    boot = true
  }
  return chart.render(`mermaid-${++seq}`, value)
}
