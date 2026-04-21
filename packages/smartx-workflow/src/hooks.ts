import path from "node:path"
import { mkdir } from "node:fs/promises"
import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import type { Event, Part } from "@opencode-ai/sdk"
import { after, auto, before, fresh, mark, prompt, revive, rules, type Flow } from "./state.js"

type IO = {
  load: (session: string) => Promise<Flow | undefined>
  save: (flow: Flow) => Promise<void>
}

type Dep = {
  io?: IO
  now?: () => string
}

export function build(ctx: PluginInput, dep: Dep = {}): Hooks {
  const now = dep.now ?? (() => new Date().toISOString())
  const io = dep.io ?? file(path.join(ctx.worktree, ".project-state", "workflow.json"))
  const mem = new Map<string, Flow>()
  const fly = new Set<string>()

  const pull = async (session: string) => {
    const hit = mem.get(session)
    if (hit) return hit
    const raw = await io.load(session)
    if (raw) mem.set(session, raw)
    return raw
  }

  const push = async (flow: Flow) => {
    mem.set(flow.session, flow)
    await io.save(flow)
  }

  return {
    "chat.message": async (input, output) => {
      if (input.agent !== "smartx-helper") {
        const flow = await pull(input.sessionID)
        if (!flow || flow.agent !== "smartx-helper") return
      }
      const text = grab(output.parts)
      const own = auto(text)
      let flow = await pull(input.sessionID)
      if (!flow || (!own && done(flow))) flow = fresh(input.sessionID, text, now())
      if (!own && text.trim()) {
        flow = done(flow) ? fresh(input.sessionID, text, now()) : { ...flow, intent: text.trim().slice(0, 280), auto: 0 }
      }
      await push(flow)
    },
    "experimental.chat.system.transform": async (input, output) => {
      if (!input.sessionID) return
      const flow = await pull(input.sessionID)
      if (!flow || flow.agent !== "smartx-helper") return
      output.system.push(rules(flow))
    },
    "tool.execute.before": async (input, output) => {
      const flow = await pull(input.sessionID)
      if (!flow || flow.agent !== "smartx-helper") return
      await push(before(flow, input.tool, output.args, now()))
    },
    "tool.execute.after": async (input, output) => {
      const flow = await pull(input.sessionID)
      if (!flow || flow.agent !== "smartx-helper") return
      await push(after(flow, input.tool, input.args, output, now()))
    },
    event: async (input) => {
      if (input.event.type !== "session.idle") return
      const session = input.event.properties.sessionID
      const flow = await pull(session)
      if (!flow || flow.agent !== "smartx-helper" || !flow.pending || fly.has(session)) return
      if (flow.auto >= 6) {
        flow.blocked = flow.blocked || "automatic SmartX workflow follow-up limit reached"
        await push(flow)
        return
      }
      fly.add(session)
      const next = { ...flow, auto: flow.auto + 1 }
      await push(next)
      const res = await ctx.client.session
        .promptAsync({
          path: { id: session },
          body: {
            agent: "smartx-helper",
            parts: [{ type: "text", text: prompt(next) }],
          },
        })
        .catch((err) => err)
      if (res instanceof Error) {
        await push({ ...next, blocked: next.blocked || `auto follow-up failed: ${res.message}` })
      }
      fly.delete(session)
    },
  }
}

function done(flow: Flow) {
  return flow.pending === "" && flow.seen.handoff
}

function grab(parts: Part[]) {
  const hit = parts.find((part) => part.type === "text")
  return hit && "text" in hit ? hit.text : ""
}

function file(target: string): IO {
  return {
    load: async (session) => {
      const text = await Bun.file(target)
        .text()
        .catch(() => "")
      if (!text.trim()) return
      const flow = revive(JSON.parse(text))
      if (!flow || (flow.session && flow.session !== session)) return
      return flow
    },
    save: async (flow) => {
      await mkdir(path.dirname(target), { recursive: true })
      await Bun.write(target, JSON.stringify({ ...flow, agent: "smartx-helper", session: flow.session || "" }, null, 2) + "\n")
    },
  }
}

export function watch(flow: Flow) {
  return prompt(flow).startsWith(mark)
}

export function live(event: Event) {
  return event.type === "session.idle" ? event.properties.sessionID : ""
}
