export const mark = "[smartx-workflow:auto]"

export const step = ["discover", "plan", "implement", "verify", "handoff"] as const

export type Stage = (typeof step)[number]
export type Pending = "" | "discover" | "implement" | "verify" | "handoff"

type Seen = {
  state: boolean
  readme: boolean
  refs: boolean
  entry: boolean
  edit: boolean
  start: boolean
  logs: boolean
  handoff: boolean
}

type Verify = {
  ok: boolean
  at: string
  note: string
}

export type Flow = {
  v: 1
  agent: string
  session: string
  stage: Stage
  pending: Pending
  intent: string
  blocked: string
  auto: number
  seen: Seen
  verify: Verify
  updated_at: string
}

const edit = new Set(["write", "edit", "patch", "multiedit"])
const hold = [
  "unsupported platform",
  "not configured",
  "permission denied",
  "forbidden",
  "unauthorized",
  "timeout",
  "network",
  "unavailable",
]
const bad = ["traceback", "exception", "error", "failed", "panic", "denied"]

export function fresh(session: string, intent: string, now: string): Flow {
  return {
    v: 1,
    agent: "smartx-helper",
    session,
    stage: "discover",
    pending: "discover",
    intent: slim(intent, 280),
    blocked: "",
    auto: 0,
    seen: {
      state: false,
      readme: false,
      refs: false,
      entry: false,
      edit: false,
      start: false,
      logs: false,
      handoff: false,
    },
    verify: {
      ok: false,
      at: "",
      note: "",
    },
    updated_at: now,
  }
}

export function revive(raw: unknown): Flow | undefined {
  if (!raw || typeof raw !== "object") return
  const x = raw as Record<string, unknown>
  const seen = x.seen as Record<string, unknown> | undefined
  const verify = x.verify as Record<string, unknown> | undefined
  if (typeof x.session !== "string") return
  return {
    v: 1,
    agent: typeof x.agent === "string" ? x.agent : "smartx-helper",
    session: x.session,
    stage: pickStage(x.stage),
    pending: pickPending(x.pending),
    intent: typeof x.intent === "string" ? x.intent : "",
    blocked: typeof x.blocked === "string" ? x.blocked : "",
    auto: typeof x.auto === "number" ? x.auto : 0,
    seen: {
      state: Boolean(seen?.state),
      readme: Boolean(seen?.readme),
      refs: Boolean(seen?.refs),
      entry: Boolean(seen?.entry),
      edit: Boolean(seen?.edit),
      start: Boolean(seen?.start),
      logs: Boolean(seen?.logs),
      handoff: Boolean(seen?.handoff),
    },
    verify: {
      ok: Boolean(verify?.ok),
      at: typeof verify?.at === "string" ? verify.at : "",
      note: typeof verify?.note === "string" ? verify.note : "",
    },
    updated_at: typeof x.updated_at === "string" ? x.updated_at : "",
  }
}

export function auto(text: string) {
  return text.trimStart().startsWith(mark)
}

export function rules(flow: Flow) {
  const miss = [
    !flow.seen.state ? ".project-state" : "",
    !flow.seen.readme ? "README.md" : "",
    !flow.seen.refs ? "references" : "",
    !flow.seen.entry ? "start.py" : "",
  ].filter(Boolean)
  const head = [
    "SmartX strong workflow is active for this session.",
    `Current stage: ${flow.stage}.`,
    `Current pending action: ${flow.pending || "none"}.`,
    "Do not stop after analysis or code edits.",
    "Completion requires verification evidence or an explicit blocked handoff.",
    "Verification must use smartx_start followed by smartx_logs.",
    "If verification fails, fix the code and repeat verification.",
    "Before finishing, update .project-state files with progress and handoff notes.",
  ]
  if (miss.length) head.push(`Missing context reads: ${miss.join(", ")}.`)
  if (flow.blocked) head.push(`Known blocker: ${flow.blocked}.`)
  if (flow.verify.note) head.push(`Latest verification note: ${flow.verify.note}.`)
  return head.join("\n")
}

export function prompt(flow: Flow) {
  const body = flow.pending === "discover" ? discover(flow) : flow.pending === "verify" ? verify(flow) : flow.pending === "handoff" ? handoff(flow) : plan(flow)
  return `${mark}\n${body}`.trim()
}

export function before(flow: Flow, tool: string, args: unknown, now: string) {
  const next = clone(flow, now)
  scan(next, blob(args))
  if (tool === "smartx_start") next.seen.start = true
  if (tool === "smartx_logs") next.seen.logs = true
  if (edit.has(tool)) {
    next.seen.edit = true
    if (home(blob(args)) && (next.verify.ok || next.blocked)) next.seen.handoff = true
  }
  return sync(next)
}

export function after(flow: Flow, tool: string, args: unknown, out: unknown, now: string) {
  const next = before(flow, tool, args, now)
  const full = blob(out)
  const body = plain(out) || full
  scan(next, full)
  if (tool === "smartx_start") {
    next.seen.start = true
    if (!fail(out)) next.verify.note = slim(body, 240)
  }
  if (tool === "smartx_logs") {
    next.seen.logs = true
    if (block(body)) next.blocked = slim(body, 240)
    if (fail(out) || noisy(body)) {
      next.verify.ok = false
      next.verify.note = slim(body, 240)
      next.stage = "implement"
      next.pending = "verify"
      next.updated_at = now
      return next
    }
    next.verify.ok = true
    next.verify.at = now
    next.verify.note = slim(body, 240)
  }
  if (edit.has(tool) && home(body) && (next.verify.ok || next.blocked)) next.seen.handoff = true
  return sync(next)
}

function clone(flow: Flow, now: string): Flow {
  return {
    ...flow,
    seen: { ...flow.seen },
    verify: { ...flow.verify },
    updated_at: now,
  }
}

function sync(flow: Flow) {
  if (flow.blocked) {
    flow.stage = "handoff"
    flow.pending = "handoff"
    return flow
  }
  if (!flow.seen.state || !flow.seen.readme || !flow.seen.refs || !flow.seen.entry) {
    flow.stage = "discover"
    flow.pending = "discover"
    return flow
  }
  if (!flow.seen.edit) {
    flow.stage = "plan"
    flow.pending = "implement"
    return flow
  }
  if (!flow.verify.ok) {
    flow.stage = "verify"
    flow.pending = "verify"
    return flow
  }
  if (!flow.seen.handoff) {
    flow.stage = "handoff"
    flow.pending = "handoff"
    return flow
  }
  flow.stage = "handoff"
  flow.pending = ""
  return flow
}

function scan(flow: Flow, body: string) {
  const low = body.toLowerCase()
  if (home(low)) flow.seen.state = true
  if (low.includes("readme.md")) flow.seen.readme = true
  if (
    low.includes("references/") ||
    low.includes("references\\") ||
    low.includes("pythonapi.md") ||
    low.includes("pythongetdtaapi.md")
  ) {
    flow.seen.refs = true
  }
  if (low.includes("start.py")) flow.seen.entry = true
}

function home(text: string) {
  const low = text.toLowerCase()
  return low.includes(".project-state/") || low.includes(".project-state\\") || low.includes("workflow.json")
}

function noisy(text: string) {
  const low = text.toLowerCase()
  return bad.some((item) => low.includes(item))
}

function block(text: string) {
  const low = text.toLowerCase()
  const hit = hold.find((item) => low.includes(item))
  return hit ? hit : ""
}

function fail(out: unknown) {
  if (!out || typeof out !== "object") return false
  return Boolean((out as Record<string, unknown>).isError)
}

function plain(out: unknown): string {
  if (typeof out === "string") return out
  if (!out || typeof out !== "object") return ""
  const obj = out as Record<string, unknown>
  const txt = typeof obj.output === "string" ? obj.output : ""
  if (txt) return txt
  const list = Array.isArray(obj.content) ? obj.content : []
  return list
    .flatMap((item) => {
      if (!item || typeof item !== "object") return []
      const row = item as Record<string, unknown>
      if (row.type === "text" && typeof row.text === "string") return [row.text]
      return []
    })
    .join("\n")
}

function blob(input: unknown): string {
  if (typeof input === "string") return input
  if (input === undefined) return ""
  return JSON.stringify(input, null, 2)
}

function slim(text: string, n: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, n)
}

function pickStage(input: unknown): Stage {
  return typeof input === "string" && step.includes(input as Stage) ? (input as Stage) : "discover"
}

function pickPending(input: unknown): Pending {
  return typeof input === "string" && ["", "discover", "implement", "verify", "handoff"].includes(input)
    ? (input as Pending)
    : "discover"
}

function discover(flow: Flow) {
  return [
    "Continue the SmartX workflow.",
    "Required now:",
    "1. Read .project-state/workflow.json, progress.md, feature-list.json, and session-log.md.",
    "2. Read README.md, SmartX references, and start.py.",
    "3. Write a short implementation plan.",
    "4. Continue into implementation in the same turn.",
    flow.intent ? `Task intent: ${flow.intent}` : "",
    "Do not stop after analysis.",
  ]
    .filter(Boolean)
    .join("\n")
}

function plan(flow: Flow) {
  return [
    "Continue the SmartX workflow.",
    "The session stopped before implementation was complete.",
    "Required now:",
    "1. Use the restored context and keep the plan short.",
    "2. Implement the requested change.",
    "3. Do not end after code edits.",
    "4. Continue into SmartX verification in the same turn if possible.",
    flow.intent ? `Task intent: ${flow.intent}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function verify(flow: Flow) {
  return [
    "Continue the SmartX workflow.",
    "Implementation happened, but verification evidence is still missing.",
    "Required now:",
    "1. Run smartx_start for the current strategy or extension.",
    "2. Run smartx_logs immediately after start.",
    "3. If logs show a problem, fix the code and repeat start + logs.",
    "4. Only claim success with concrete startup or log evidence.",
    "5. If blocked by external conditions, record the blocker in .project-state and say blocked clearly.",
    flow.verify.note ? `Latest note: ${flow.verify.note}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function handoff(flow: Flow) {
  return [
    "Finish the SmartX workflow.",
    "Required now:",
    "1. Update .project-state/workflow.json.",
    "2. Update .project-state/progress.md and session-log.md.",
    "3. Update feature-list.json if task status changed.",
    "4. Respond with a concise handoff that includes outcome, evidence, blockers, and next step.",
    flow.blocked ? `Blocked reason: ${flow.blocked}` : "",
    flow.verify.note ? `Verification note: ${flow.verify.note}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}
