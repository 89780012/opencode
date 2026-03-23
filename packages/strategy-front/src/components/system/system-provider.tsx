import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { systemApi } from "@/api/modules"
import { applyAccent } from "@/lib/system-theme"
import { systemDefault, type SystemConfig } from "@/types/system"

type State = {
  cfg: SystemConfig
  load: boolean
  err: string
  reload: () => Promise<void>
  save: (cfg: SystemConfig) => Promise<SystemConfig>
}

const Ctx = createContext<State | null>(null)

export function SystemProvider(props: { children: ReactNode }) {
  const { setTheme } = useTheme()
  const [cfg, setCfg] = useState<SystemConfig>(systemDefault)
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const seq = useRef(0)

  useEffect(() => {
    setTheme(cfg.theme.mode)
    applyAccent(cfg.theme.accent)
  }, [cfg.theme.accent, cfg.theme.mode, setTheme])

  const reload = useCallback(async () => {
    const id = ++seq.current
    setErr("")
    try {
      const next = await systemApi.config()
      if (id !== seq.current) {
        return
      }
      setCfg(next)
    } catch (err) {
      if (id !== seq.current) {
        return
      }
      if (err instanceof Error) {
        setErr(err.message)
      }
      setCfg(systemDefault)
    } finally {
      if (id === seq.current) {
        setLoad(false)
      }
    }
  }, [])

  const save = useCallback(async (next: SystemConfig) => {
    const prev = cfg
    const id = ++seq.current
    setCfg(next)
    setErr("")

    try {
      const out = await systemApi.saveConfig(next)
      if (id === seq.current) {
        setCfg(out)
      }
      return out
    } catch (err) {
      if (id === seq.current) {
        setCfg(prev)
      }
      if (err instanceof Error) {
        setErr(err.message)
      }
      throw err
    }
  }, [cfg])

  useEffect(() => {
    void reload()
  }, [reload])

  return <Ctx.Provider value={{ cfg, load, err, reload, save }}>{props.children}</Ctx.Provider>
}

export function useSystem() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("SystemProvider is missing")
  }
  return ctx
}
