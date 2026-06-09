import type { Hooks } from "@opencode-ai/plugin"
import { fresh, note, seen, touch, type Flow } from "./state.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Opt = {
  mem: Map<string, Flow>
  write: Log
}

export function createPairing(opt: Opt) {
  return {
    transform: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!input.sessionID) return false
      // session 配对只约束当前会话，不和工作区分析/流程图状态混在一起。
      const flow = opt.mem.get(input.sessionID)
      if (!flow || (flow.logs < 1 && flow.debug < 1)) return false
      await opt.write("注入顺序约束提示", {
        sessionID: input.sessionID,
        logs: flow.logs,
        debug: flow.debug,
      })
      output.system.push(note(flow))
      return true
    },
    after: async (input: Parameters<After>[0]) => {
      if (!input.sessionID) return false
      if (!seen(input)) return false
      const prev = opt.mem.get(input.sessionID) ?? fresh(input.sessionID)
      const next = touch(prev, input)
      opt.mem.set(input.sessionID, next)
      await opt.write("命中关键工具并更新状态", {
        sessionID: input.sessionID,
        tool: input.tool,
        name: typeof input.args?.name === "string" ? input.args.name.trim() : undefined,
        logs_before: prev.logs,
        logs_after: next.logs,
        debug_before: prev.debug,
        debug_after: next.debug,
      })
      return true
    },
  }
}
