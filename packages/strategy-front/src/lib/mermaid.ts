let boot = false
let seq = 0
const css = new WeakMap<object, string>()
const sheets = new WeakMap<object, CSSStyleSheet[]>()
const nodes = new WeakMap<object, HTMLStyleElement[]>()

class Sheet {
  replaceSync(value: string) {
    css.set(this, value)
  }

  replace(value: string) {
    this.replaceSync(value)
    return Promise.resolve(this as unknown as CSSStyleSheet)
  }

  insertRule(value: string, index?: number) {
    css.set(this, `${css.get(this) ?? ""}\n${value}`)
    return index ?? 0
  }

  deleteRule() {}

  get cssRules() {
    return [] as unknown as CSSRuleList
  }
}

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

function target(host: object) {
  if (typeof Document !== "undefined" && host instanceof Document) return host.head ?? host.documentElement
  if (typeof ShadowRoot !== "undefined" && host instanceof ShadowRoot) return host
  return null
}

function installAdopted(proto: object | undefined) {
  if (!proto) return
  const old = Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets")
  if (old && !old.configurable) return
  const get = function (this: object) {
    return sheets.get(this) ?? []
  }
  const set = function (this: object, value: CSSStyleSheet[]) {
    const root = target(this)
    const list = Array.isArray(value) ? value : []
    sheets.set(this, list)
    nodes.get(this)?.forEach((node) => node.parentNode?.removeChild(node))
    if (!root || typeof document === "undefined") {
      nodes.set(this, [])
      return
    }
    nodes.set(
      this,
      list
        .map((item) => css.get(item))
        .filter((item): item is string => !!item)
        .map((item) => {
          const node = document.createElement("style")
          node.textContent = item
          root.appendChild(node)
          return node
        }),
    )
  }
  Object.defineProperty(proto, "adoptedStyleSheets", { configurable: true, get, set })
}

function installCompat() {
  if (!Object.hasOwn) {
    Object.defineProperty(Object, "hasOwn", {
      configurable: true,
      value(obj: object, key: PropertyKey) {
        return Object.prototype.hasOwnProperty.call(obj, key)
      },
      writable: true,
    })
  }

  try {
    if (typeof CSSStyleSheet === "function") {
      new CSSStyleSheet()
      return
    }
  } catch {}

  Object.defineProperty(globalThis, "CSSStyleSheet", {
    configurable: true,
    value: Sheet,
    writable: true,
  })
  installAdopted(typeof Document === "undefined" ? undefined : Document.prototype)
  installAdopted(typeof ShadowRoot === "undefined" ? undefined : ShadowRoot.prototype)
}

export async function renderMermaid(value: string) {
  installCompat()
  const mod = await import("mermaid")
  const chart = mod.default
  if (!boot) {
    chart.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" })
    boot = true
  }
  return chart.render(`mermaid-${++seq}`, value)
}
