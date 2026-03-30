export type ToolID = "git" | "node" | "npm" | "opencode"
export type ToolAction = "install" | "uninstall" | "reinstall"

export type ToolStatus = "installed" | "missing" | "installing" | "failed"

export type TaskStatus = "pending" | "running" | "success" | "failed"

export type ThemeMode = "system" | "light" | "dark"

export type ThemeAccent = "ocean" | "forest" | "ember" | "rose" | "graphite"

export interface ToolState {
  id: ToolID
  label: string
  installed: boolean
  version?: string
  path?: string
  status: ToolStatus
  message?: string
  task_id?: string
  updated_at: string
}

export interface InstallTask {
  id: string
  tool: ToolID
  status: TaskStatus
  step: number
  total: number
  title?: string
  started_at: string
  finished_at?: string
  exit_code?: number
  error?: string
  output?: string
  log?: string[]
}

export interface SystemConfig {
  theme: {
    mode: ThemeMode
    accent: ThemeAccent
  }
  logs: {
    tail: number
  }
}

export interface SystemLog {
  kind: "service" | "opencode"
  path: string
  lines: string[]
}

export interface OpencodeState {
  enabled: boolean
  startup: string
  bin: string
  url: string
  cwd?: string
  status: string
  ready: boolean
  running: boolean
  owned: boolean
  pid?: number
  message?: string
  started_at?: string
  log?: string[]
}

export interface OpencodeLog {
  log: string[]
}

export interface SystemVersionCurrent {
  version: string
  channel: "dev" | "stable"
  env: "development" | "production"
  commit?: string
  dirty: boolean
  built_at?: string
}

export interface SystemVersion {
  current: SystemVersionCurrent
}

export const systemDefault: SystemConfig = {
  theme: {
    mode: "system",
    accent: "ocean",
  },
  logs: {
    tail: 200,
  },
}

export const systemVersionDefault: SystemVersion = {
  current: {
    version: "dev",
    channel: "dev",
    env: "development",
    dirty: false,
  },
}
