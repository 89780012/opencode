import type { Hooks } from "@opencode-ai/plugin"
import { fresh, note, seen, touch, type Flow } from "./state.js"

type System = NonNullable<Hooks["experimental.chat.system.transform"]>
type After = NonNullable<Hooks["tool.execute.after"]>
type Log = (message: string, extra?: Record<string, unknown>) => Promise<void>

type Opt = {
  sessionFlows: Map<string, Flow>
  write: Log
}

/** 管理 session 级别的顺序约束提示，不和 workspace 状态混在一起。 */
export function createPairing(opt: Opt) {
  return {
    /** 在系统提示阶段注入尚未完成的配对动作提醒。 */
    transform: async (input: Parameters<System>[0], output: Parameters<System>[1]) => {
      if (!input.sessionID) return false
      const flow = opt.sessionFlows.get(input.sessionID)
      if (!flow || (flow.pendingLogCount < 1 && flow.pendingDebugCount < 1)) return false
      await opt.write("session pairing reminder injected", {
        sessionID: input.sessionID,
        pending_logs: flow.pendingLogCount,
        pending_debug: flow.pendingDebugCount,
      })
      output.system.push(note(flow))
      return true
    },
    /** 在工具执行后更新 smartx_start/logs 与 develop/debug 的配对计数。 */
    after: async (input: Parameters<After>[0]) => {
      if (!input.sessionID) return false
      if (!seen(input)) return false
      const prevFlow = opt.sessionFlows.get(input.sessionID) ?? fresh(input.sessionID)
      const nextFlow = touch(prevFlow, input)
      opt.sessionFlows.set(input.sessionID, nextFlow)
      await opt.write("session pairing state updated", {
        sessionID: input.sessionID,
        tool: input.tool,
        name: typeof input.args?.name === "string" ? input.args.name.trim() : undefined,
        pending_logs_before: prevFlow.pendingLogCount,
        pending_logs_after: nextFlow.pendingLogCount,
        pending_debug_before: prevFlow.pendingDebugCount,
        pending_debug_after: nextFlow.pendingDebugCount,
      })
      return true
    },
  }
}
