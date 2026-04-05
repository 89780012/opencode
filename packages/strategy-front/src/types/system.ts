export type ThemeMode = "system" | "light" | "dark"

export type ThemeAccent = "ocean" | "forest" | "ember" | "rose" | "graphite"

export interface StartupTool {
  id: "git" | "opencode"
  label: string
  installed: boolean
  status: "installed" | "missing" | "failed"
  version?: string
  path?: string
  source?: "config" | "builtin" | "system"
  message?: string
  updated_at: string
}

export interface StartupState {
  ready: boolean
  summary: string
  opencode: StartupTool
  git: StartupTool
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

export interface LogSource {
  id: string
  label: string
  type: "managed" | "child"
  format: "json" | "text"
  path: string
  watchable: boolean
  rotated: boolean
  updated_at?: string
  size?: number
}

export interface LogTail {
  source: LogSource
  path: string
  lines: string[]
}

export interface LogSources {
  sources: LogSource[]
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
