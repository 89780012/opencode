import { opencode } from "@/api/opencode"
import type { McpCfg, McpDoc, McpMap, McpStatus } from "@/types/mcp"

export const mcpApi = {
  status() {
    return opencode.get<McpMap>("/mcp")
  },

  add(name: string, cfg: McpCfg) {
    return opencode.post<McpMap, { name: string; config: McpCfg }>(
      "/mcp",
      {
        name,
        config: cfg,
      },
    )
  },

  connect(name: string) {
    return opencode.post<boolean>(`/mcp/${encodeURIComponent(name)}/connect`)
  },

  disconnect(name: string) {
    return opencode.post<boolean>(`/mcp/${encodeURIComponent(name)}/disconnect`)
  },

  authStart(name: string) {
    return opencode.post<{ authorizationUrl: string }>(`/mcp/${encodeURIComponent(name)}/auth`)
  },

  authCallback(name: string, code: string) {
    return opencode.post<McpStatus, { code: string }>(`/mcp/${encodeURIComponent(name)}/auth/callback`, {
      code,
    })
  },

  authenticate(name: string) {
    return opencode.post<McpStatus>(`/mcp/${encodeURIComponent(name)}/auth/authenticate`)
  },

  authRemove(name: string) {
    return opencode.delete<{ success: true }>(`/mcp/${encodeURIComponent(name)}/auth`)
  },

  config() {
    return opencode.get<McpDoc>("/global/config")
  },

  update(doc: McpDoc) {
    return opencode.patch<McpDoc, McpDoc>("/global/config", doc)
  },
}
