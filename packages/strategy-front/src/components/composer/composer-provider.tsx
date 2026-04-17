import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { load, save } from "@/lib/store"
import type { ChatModelRef } from "@/types/chat"
import type { ComposerPrefs } from "@/types/composer"

type Ctx = {
  ready: boolean
  state: ComposerPrefs
  setAgent: (agent?: string) => void
  setModel: (model?: ChatModelRef) => void
  setVariant: (variant?: string | null) => void
  clear: () => void
}

const key = "strategy-front.composer.v1"
const Ctx = createContext<Ctx | null>(null)

function parse() {
  if (typeof window === "undefined") {
    return {} as ComposerPrefs
  }

  try {
    const raw = load(key)
    if (!raw) {
      return {} as ComposerPrefs
    }
    const data = JSON.parse(raw) as ComposerPrefs
    return typeof data === "object" && data ? data : ({} as ComposerPrefs)
  } catch {
    return {} as ComposerPrefs
  }
}

function write(state: ComposerPrefs) {
  if (typeof window === "undefined") {
    return
  }
  save(key, JSON.stringify(state))
}

export function ComposerProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<ComposerPrefs>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setState(parse())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) {
      return
    }
    write(state)
  }, [ready, state])

  const setAgent = useCallback((agent?: string) => {
    setState((prev) => ({
      ...prev,
      agent,
    }))
  }, [])

  const setModel = useCallback((model?: ChatModelRef) => {
    setState((prev) => ({
      ...prev,
      model,
    }))
  }, [])

  const setVariant = useCallback((variant?: string | null) => {
    setState((prev) => ({
      ...prev,
      variant,
    }))
  }, [])

  const clear = useCallback(() => {
    setState({})
  }, [])

  const value = useMemo(
    () => ({
      ready,
      state,
      setAgent,
      setModel,
      setVariant,
      clear,
    }),
    [clear, ready, setAgent, setModel, setVariant, state],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

export function useComposerPrefsValue() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("缺少 ComposerProvider 上下文")
  }
  return ctx
}
