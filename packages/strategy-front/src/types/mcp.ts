export type McpLocal = {
  type: "local"
  command: string[]
  environment?: Record<string, string>
  enabled?: boolean
  timeout?: number
}

export type McpOAuth = {
  clientId?: string
  clientSecret?: string
  scope?: string
}

export type McpRemote = {
  type: "remote"
  url: string
  enabled?: boolean
  headers?: Record<string, string>
  oauth?: McpOAuth | false
  timeout?: number
}

export type McpCfg = McpLocal | McpRemote

export type McpStub = {
  enabled: boolean
}

export type McpStored = McpCfg | McpStub

export type McpStatus =
  | {
      status: "connected"
    }
  | {
      status: "disabled"
    }
  | {
      status: "failed"
      error: string
    }
  | {
      status: "needs_auth"
    }
  | {
      status: "needs_client_registration"
      error: string
    }

export type McpMap = Record<string, McpStatus>

export type McpDoc = {
  mcp?: Record<string, McpStored>
  [key: string]: unknown
}

export type McpKind = "local" | "remote" | "unknown"

export type McpView = "connected" | "auth" | "issue" | "disconnected" | "disabled"

export type McpRow = {
  name: string
  cfg?: McpStored
  status?: McpStatus
  kind: McpKind
  enabled: boolean
  oauth: boolean
  summary: string
}
