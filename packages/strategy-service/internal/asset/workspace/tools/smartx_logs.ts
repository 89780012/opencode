import { tool } from "@opencode-ai/plugin"

const schema = tool.schema

export default tool({
  description: "Watch SmartX strategy logs for a short period through strategy-service",

  args: {
    name: schema.string().describe("Extension or strategy name used to prioritize matching log files."),
    seconds: schema.number().optional().describe("How long to watch logs. Defaults to 10 seconds."),
    tail: schema.number().optional().describe("Maximum number of lines to keep per file. Defaults to 200."),
    limit: schema.number().optional().describe("Maximum number of files to inspect. Defaults to 3."),
  },

  async execute(args, context) {
    const url = "http://127.0.0.1:5000"
    const query = new URLSearchParams()
    if (clean(args.name)) query.set("name", args.name.trim())
    if (typeof args.seconds === "number") query.set("seconds", String(args.seconds))
    if (typeof args.tail === "number") query.set("tail", String(args.tail))
    if (typeof args.limit === "number") query.set("limit", String(args.limit))

    const res = await fetch(url + "/api/system/smartx/logs/watch?" + query.toString(), {
      method: "GET",
      signal: context.abort,
    })
    const raw = await res.text()
    return raw
  },
})

function clean(text?: string) {
  const value = text?.trim()
  if (!value) return undefined
  return value
}

function base(text?: string) {
  return (clean(text) || clean(process.env.STRATEGY_SERVICE_URL) || "http://127.0.0.1:5000").replace(/\/+$/, "")
}

function parse(text: string) {
  if (!clean(text)) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function fail(code: number, data: unknown, raw: string) {
  if (data && typeof data === "object" && "msg" in data && typeof data.msg === "string" && clean(data.msg)) {
    return data.msg
  }
  return clean(raw) || `request failed: ${code}`
}
