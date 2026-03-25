import path from "path"

import { tool } from "@opencode-ai/plugin"

const schema = tool.schema

export default tool({
  description: "Start a SmartX strategy extension through strategy-service",

  args: {
    name: schema.string().describe("Extension name. Defaults to package.json name or current directory name."),
  },

  async execute(args, context) {
    const dir = context.directory || context.worktree || process.cwd()
    const pkg = await load(path.join(dir, "package.json"))
    const req = {
      name: clean(args.name) || clean(pkg?.name) || path.basename(dir),
    }
    const url = "http://127.0.0.1:5000"
    const res = await fetch(url + "/api/system/smartx/startExtension", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(req),
      signal: context.abort,
    })
    const raw = await res.text()
    return raw
  },
})

async function load(file: string) {
  const src = Bun.file(file)
  if (!(await src.exists())) return null

  try {
    return await src.json()
  } catch {
    return null
  }
}

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
