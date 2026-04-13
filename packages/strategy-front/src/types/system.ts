export type ThemeMode = "system" | "light" | "dark"

export type ThemeAccent = "ocean" | "forest" | "ember" | "rose" | "graphite"

export interface StartupTool {
  id: "git" | "opencode"
  label: string
  installed: boolean
  status: "installed" | "missing" | "failed"
  path?: string
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

export const systemDefault: SystemConfig = {
  theme: {
    mode: "system",
    accent: "ocean",
  },
  logs: {
    tail: 200,
  },
}
