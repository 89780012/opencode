import { request } from "@/api/client"
import type {
  OpencodeLog,
  OpencodeState,
  StartupState,
  SystemConfig,
  SystemLog,
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

  logs(kind: SystemLog["kind"], tail?: number) {
    const query = new URLSearchParams({ kind })
    if (tail) {
      query.set("tail", `${tail}`)
    }
    return request.get<SystemLog>(`/system/logs?${query.toString()}`)
  },

  opencodeStatus() {
    return request.get<OpencodeState>("/system/opencode/status")
  },

  opencodeLogs() {
    return request.get<OpencodeLog>("/system/opencode/logs")
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
