import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { fresh, note, seen, touch, type Flow } from "./state.js"

type Dep = {
  mem?: Map<string, Flow>
}

export function build(_ctx: PluginInput, dep: Dep = {}): Hooks {
  const mem = dep.mem ?? new Map<string, Flow>()

  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return
      const flow = mem.get(input.sessionID)
      if (!flow || (flow.logs < 1 && flow.debug < 1)) return
      output.system.push(note(flow))
    },
    "tool.execute.after": async (input) => {
      if (!seen(input)) return
      mem.set(input.sessionID, touch(mem.get(input.sessionID) ?? fresh(input.sessionID), input))
    },
  }
}
