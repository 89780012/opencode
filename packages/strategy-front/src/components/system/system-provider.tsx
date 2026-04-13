import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import { systemApi } from "@/api/modules"
import { applyAccent } from "@/lib/system-theme"
import { systemDefault, systemVersionDefault, type SystemConfig, type SystemVersion } from "@/types/system"

type State = {
  cfg: SystemConfig
  load: boolean
  err: string
  ver: SystemVersion
  vload: boolean
  verr: string
  reload: () => Promise<void>
  reloadVersion: () => Promise<void>
  save: (cfg: SystemConfig) => Promise<SystemConfig>
}

const Ctx = createContext<State | null>(null)

export function SystemProvider(props: { children: ReactNode }) {
  const { setTheme } = useTheme()
  const [cfg, setCfg] = useState<SystemConfig>(systemDefault)
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const [ver, setVer] = useState<SystemVersion>(systemVersionDefault)
  const [vload, setVload] = useState(true)
  const [verr, setVerr] = useState("")
  const seq = useRef(0)
  const vseq = useRef(0)

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

  const reloadVersion = useCallback(async () => {
    const id = ++vseq.current
    setVerr("")
    try {
      const next = await systemApi.version()
      if (id !== vseq.current) {
        return
      }
      setVer(next)
    } catch (err) {
      if (id !== vseq.current) {
        return
      }
      if (err instanceof Error) {
        setVerr(err.message)
      }
      setVer(systemVersionDefault)
    } finally {
      if (id === vseq.current) {
        setVload(false)
      }
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    void reloadVersion()
  }, [reloadVersion])

  return (
    <Ctx.Provider value={{ cfg, load, err, ver, vload, verr, reload, reloadVersion, save }}>
      {props.children}
    </Ctx.Provider>
  )
}

export function useSystem() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("缺少 SystemProvider 上下文")
  }
  return ctx
}
