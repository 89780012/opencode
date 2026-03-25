import { tool } from "@opencode-ai/plugin"

const schema = tool.schema

export default tool({
  description: "Start a SmartX strategy extension through strategy-service",

  args: {
    name: schema.string().describe("Extension name. Defaults to package.json name or current directory name."),
  },

  async execute(args, context) {
    const name = args.name
    const url = "http://127.0.0.1:5000"
    const req = { name }
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
