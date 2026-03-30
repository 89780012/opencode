import { request } from "@/api/client"
import type {
  InstallTask,
  OpencodeLog,
  OpencodeState,
  SystemConfig,
  SystemLog,
  SystemVersion,
  ToolAction,
  ToolID,
  ToolState,
} from "@/types/system"

export const systemApi = {
  list() {
    return request.get<ToolState[]>("/system/tools")
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

  install(id: ToolID) {
    return request.post<InstallTask>(`/system/tools/${encodeURIComponent(id)}/install`)
  },

  action(id: ToolID, action: ToolAction) {
    return request.post<InstallTask>(`/system/tools/${encodeURIComponent(id)}/${encodeURIComponent(action)}`)
  },

  uninstall(id: ToolID) {
    return systemApi.action(id, "uninstall")
  },

  reinstall(id: ToolID) {
    return systemApi.action(id, "reinstall")
  },

  task(id: string) {
    return request.get<InstallTask>(`/system/tasks/${encodeURIComponent(id)}`)
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
