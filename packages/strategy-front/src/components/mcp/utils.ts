import type { McpCfg, McpKind, McpRemote, McpRow, McpStored, McpView } from "@/types/mcp"

export function text(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = err.message
    if (typeof msg === "string" && msg) {
      return msg
    }
  }

  if (err && typeof err === "object" && "error" in err) {
    const msg = err.error
    if (typeof msg === "string" && msg) {
      return msg
    }
  }

  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
}

export function isCfg(cfg?: McpStored): cfg is McpCfg {
  return !!cfg && typeof cfg === "object" && "type" in cfg
}

export function isRemote(cfg?: McpStored): cfg is McpRemote {
  return isCfg(cfg) && cfg.type === "remote"
}

export function kind(cfg?: McpStored): McpKind {
  if (!cfg) {
    return "unknown"
  }
  if (isCfg(cfg)) {
    return cfg.type
  }
  return "unknown"
}

export function enabled(cfg?: McpStored) {
  if (cfg && "enabled" in cfg && cfg.enabled === false) {
    return false
  }
  return true
}

export function oauth(cfg?: McpStored) {
  return isRemote(cfg) && cfg.oauth !== false
}

export function summary(cfg?: McpStored) {
  if (!cfg) {
    return "仅运行时条目"
  }

  if (isRemote(cfg)) {
    return cfg.url
  }

  if (isCfg(cfg)) {
    return cfg.command.join(" ")
  }

  return "仅保留启用状态"
}

export function view(item: McpRow): McpView {
  if (!item.enabled) {
    return "disabled"
  }

  if (item.status?.status === "connected") {
    return "connected"
  }

  if (item.status?.status === "needs_auth") {
    return "auth"
  }

  if (
    item.status?.status === "failed" ||
    item.status?.status === "needs_client_registration"
  ) {
    return "issue"
  }

  return "disconnected"
}

export function tone(item: McpRow) {
  const current = view(item)

  if (current === "connected") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      text: "已连接",
    }
  }

  if (current === "auth") {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      text: "待授权",
    }
  }

  if (current === "issue") {
    return {
      tone: "border-red-200 bg-red-50 text-red-700",
      text: "需处理",
    }
  }

  if (current === "disconnected") {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      text: "已断开",
    }
  }

  return {
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    text: "已禁用",
  }
}

function rank(item: McpRow) {
  const current = view(item)

  if (current === "connected") {
    return 0
  }

  if (current === "disconnected") {
    return 1
  }

  if (current === "auth") {
    return 2
  }

  if (current === "issue") {
    return 3
  }

  if (current === "disabled") {
    return 4
  }

  return 5
}

export function sort(items: McpRow[]) {
  return [...items].sort((a, b) => {
    const diff = rank(a) - rank(b)
    if (diff !== 0) {
      return diff
    }
    return a.name.localeCompare(b.name)
  })
}
