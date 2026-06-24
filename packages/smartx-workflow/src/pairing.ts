import type { Hooks } from "@opencode-ai/plugin"
import { fresh, note, seen, touch, type Flow } from "./state.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Opt = {
  mem: Map<string, Flow>
  write: Log
}

/** 管理 session 级别的顺序约束提示，不和 workspace 状态混在一起。 */
export function createPairing(opt: Opt) {
  return {
    /** 在系统提示阶段注入尚未完成的配对动作提醒。 */
    transform: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!input.sessionID) return false
      const flow = opt.mem.get(input.sessionID)
      if (!flow || (flow.logs < 1 && flow.debug < 1)) return false
      await opt.write("session pairing reminder injected", {
        sessionID: input.sessionID,
        logs: flow.logs,
        debug: flow.debug,
      })
      output.system.push(note(flow))
      return true
    },
    /** 在工具执行后更新 smartx_start/logs 与 develop/debug 的配对计数。 */
    after: async (input: Parameters<After>[0]) => {
      if (!input.sessionID) return false
      if (!seen(input)) return false
      const prev = opt.mem.get(input.sessionID) ?? fresh(input.sessionID)
      const next = touch(prev, input)
      opt.mem.set(input.sessionID, next)
      await opt.write("session pairing state updated", {
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
