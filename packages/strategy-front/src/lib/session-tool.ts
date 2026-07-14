import type { ChatToolPart } from "@/types/chat"

const ansi = new RegExp(String.fromCharCode(27) + "(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])", "g")

function text(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(ansi, "").trim()
}

function json(value: unknown) {
  if (value === undefined) return ""
  return JSON.stringify(value, null, 2) ?? ""
}

function meta(input: Record<string, unknown>) {
  const pairs = Object.entries(input).filter(([key, value]) => {
    if (key === "code" || key === "description" || value === undefined) return false
    return !Array.isArray(value) || value.length > 0
  })
  return pairs.length ? json(Object.fromEntries(pairs)) : ""
}

export function output(part: ChatToolPart) {
  if (part.state.status === "running") return text(part.state.metadata?.output)
  if ("output" in part.state) return text(part.state.output)
  if ("error" in part.state) return text(part.state.error)
  return ""
}

export function payload(part: ChatToolPart): { lang: string; value: string; meta?: string } {
  const code = part.tool === "smartx_python" && typeof part.state.input.code === "string" ? part.state.input.code : ""
  if (code) {
    return {
      lang: "python",
      value: code,
      meta: meta(part.state.input),
    }
  }

  const cmd = text(part.state.input.command)
  if (cmd && Object.keys(part.state.input).length === 1) {
    return {
      lang: "shell",
      value: `$ ${cmd}`,
    }
  }
  return {
    lang: "json",
    value: json(part.state.input),
  }
}

export function ext(lang: string) {
  const key = lang.toLowerCase()
  if (key === "shell" || key === "bash" || key === "sh") return "sh"
  if (key === "python" || key === "py") return "py"
  if (key === "javascript" || key === "js") return "js"
  if (key === "typescript" || key === "ts") return "ts"
  if (key === "json") return "json"
  if (key === "markdown" || key === "md") return "md"
  if (key === "html") return "html"
  if (key === "css") return "css"
  return "txt"
}
