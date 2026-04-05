import { request } from "@/api/client"
import type {
  LogSources,
  LogTail,
  OpencodeState,
  StartupState,
  SystemConfig,
  SystemVersion,
} from "@/types/system"

export const systemApi = {
  startup() {
    return request.get<StartupState>("/system/startup")
  },

  startupPrepare() {
    return request.post<StartupState>("/system/startup/prepare")
  },

  config() {
    return request.get<SystemConfig>("/system/config")
  },

  version() {
    return request.get<SystemVersion>("/system/version")
  },

  saveConfig(cfg: SystemConfig) {
    return request.put<SystemConfig, SystemConfig>("/system/config", cfg)
  },

  logSources(limit?: number) {
    const query = new URLSearchParams()
    if (limit) {
      query.set("limit", `${limit}`)
    }
    const tail = query.toString()
    return request.get<LogSources>(tail ? `/logs/sources?${tail}` : "/logs/sources")
  },

  logTail(source: string, tail?: number) {
    const query = new URLSearchParams({ source })
    if (tail) {
      query.set("tail", `${tail}`)
    }
    return request.get<LogTail>(`/logs/tail?${query.toString()}`)
  },

  opencodeStatus() {
    return request.get<OpencodeState>("/system/opencode/status")
  },

  opencodeStart() {
    return request.post<OpencodeState>("/system/opencode/start", undefined, {
      timeout: 45000,
    })
  },

  opencodeRestart() {
    return request.post<OpencodeState>("/system/opencode/restart", undefined, {
      timeout: 45000,
    })
  },

  opencodeStop() {
    return request.post<OpencodeState>("/system/opencode/stop", undefined, {
      timeout: 45000,
    })
  },
}
