import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { fresh, note, seen, touch, type Flow } from "./state.js"

type Dep = {
  mem?: Map<string, Flow>
}

export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const mem = dep.mem ?? new Map<string, Flow>()
  const write = async (message: string, extra?: Record<string, unknown>) => {
    await ctx.client.app
      .log({
        body: {
          service: "smartx-workflow",
          level: "info",
          message,
          extra,
        },
      })
      .catch(() => {})
  }
  void write("插件已加载", {
    directory: ctx.directory,
    worktree: ctx.worktree,
  })

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return
      const flow = mem.get(input.sessionID)
      if (!flow || (flow.logs < 1 && flow.debug < 1)) return
      await write("注入顺序约束提示", {
        sessionID: input.sessionID,
        logs: flow.logs,
        debug: flow.debug,
      })
      output.system.push(note(flow))
    },
    "tool.execute.after": async (input) => {
      if (!seen(input)) return
      const prev = mem.get(input.sessionID) ?? fresh(input.sessionID)
      const next = touch(prev, input)
      mem.set(input.sessionID, next)
      await write("命中关键工具并更新状态", {
        sessionID: input.sessionID,
        tool: input.tool,
        name: typeof input.args?.name === "string" ? input.args.name.trim() : undefined,
        logs_before: prev.logs,
        logs_after: next.logs,
        debug_before: prev.debug,
        debug_after: next.debug,
      })
    },
  }
}
