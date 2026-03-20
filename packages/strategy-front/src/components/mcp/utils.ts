import type { McpCfg, McpKind, McpRemote, McpRow, McpStatus, McpStored } from "@/types/mcp"

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

export function enabled(cfg?: McpStored, status?: McpStatus) {
  if (cfg && "enabled" in cfg && cfg.enabled === false) {
    return false
  }
  return status?.status !== "disabled"
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

  return "仅包含启用状态"
}

export function tone(status?: McpStatus) {
  if (!status) {
    return {
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      text: "未知",
    }
  }

  if (status.status === "connected") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      text: "已连接",
    }
  }

  if (status.status === "disabled") {
    return {
      tone: "border-slate-200 bg-slate-50 text-slate-700",
      text: "已禁用",
    }
  }

  if (status.status === "needs_auth") {
    return {
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      text: "需授权",
    }
  }

  if (status.status === "needs_client_registration") {
    return {
      tone: "border-red-200 bg-red-50 text-red-700",
      text: "需配置客户端 ID",
    }
  }

  return {
    tone: "border-red-200 bg-red-50 text-red-700",
    text: "失败",
  }
}

function rank(status?: McpStatus) {
  if (!status) {
    return 5
  }
  if (status.status === "connected") {
    return 0
  }
  if (status.status === "needs_auth") {
    return 1
  }
  if (status.status === "needs_client_registration") {
    return 2
  }
  if (status.status === "failed") {
    return 3
  }
  if (status.status === "disabled") {
    return 4
  }
  return 5
}

export function sort(items: McpRow[]) {
  return [...items].sort((a, b) => {
    const diff = rank(a.status) - rank(b.status)
    if (diff !== 0) {
      return diff
    }
    return a.name.localeCompare(b.name)
  })
}
