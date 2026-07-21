export type ThemeMode = "system" | "light" | "dark"

export type ThemeAccent = "ocean" | "forest" | "ember" | "rose" | "graphite"

export interface SystemConfig {
  theme: {
    mode: ThemeMode
    accent: ThemeAccent
  }
  logs: {
    tail: number
  }
  workflow: {
    baseline: boolean
    review: boolean
    debug: boolean
    backtest: boolean
  }
  workbench: {
    intake: boolean
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
    mode: "dark",
    accent: "graphite",
  },
  logs: {
    tail: 200,
  },
  workflow: {
    baseline: false,
    review: false,
    debug: false,
    backtest: false,
  },
  workbench: {
    intake: false,
  },
}
