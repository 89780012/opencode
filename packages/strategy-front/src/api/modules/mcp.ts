import { opencode } from "@/api/opencode"
import type { McpCfg, McpDoc, McpMap, McpStatus } from "@/types/mcp"

function opts(dir?: string | null) {
  return dir ? { params: { directory: dir } } : undefined
}

export const mcpApi = {
  status(dir?: string | null) {
    return opencode.get<McpMap>("/mcp", opts(dir))
  },

  add(name: string, cfg: McpCfg, dir?: string | null) {
    return opencode.post<McpMap, { name: string; config: McpCfg }>(
      "/mcp",
      {
        name,
        config: cfg,
      },
      opts(dir),
    )
  },

  connect(name: string, dir?: string | null) {
    return opencode.post<boolean>(
      `/mcp/${encodeURIComponent(name)}/connect`,
      undefined,
      opts(dir),
    )
  },

  disconnect(name: string, dir?: string | null) {
    return opencode.post<boolean>(
      `/mcp/${encodeURIComponent(name)}/disconnect`,
      undefined,
      opts(dir),
    )
  },

  authStart(name: string, dir?: string | null) {
    return opencode.post<{ authorizationUrl: string }>(
      `/mcp/${encodeURIComponent(name)}/auth`,
      undefined,
      opts(dir),
    )
  },

  authCallback(name: string, code: string, dir?: string | null) {
    return opencode.post<McpStatus, { code: string }>(
      `/mcp/${encodeURIComponent(name)}/auth/callback`,
      { code },
      opts(dir),
    )
  },

  authenticate(name: string, dir?: string | null) {
    return opencode.post<McpStatus>(
      `/mcp/${encodeURIComponent(name)}/auth/authenticate`,
      undefined,
      opts(dir),
    )
  },

  authRemove(name: string, dir?: string | null) {
    return opencode.delete<{ success: true }>(
      `/mcp/${encodeURIComponent(name)}/auth`,
      opts(dir),
    )
  },

  config(dir?: string | null) {
    const url = dir ? "/config" : "/global/config"
    return opencode.get<McpDoc>(url, opts(dir))
  },

  update(doc: McpDoc, dir?: string | null) {
    const url = dir ? "/config" : "/global/config"
    return opencode.patch<McpDoc, McpDoc>(url, doc, opts(dir))
  },
}
