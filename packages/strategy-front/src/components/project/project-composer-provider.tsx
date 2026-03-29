import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { sameModel } from "@/lib/chat-composer"
import type { ChatModelRef } from "@/types/chat"
import type { ProjectComposerState } from "@/types/composer"

type Ctx = {
  ready: boolean
  state: ProjectComposerState
  setAgent: (agent?: string) => void
  setModel: (model?: ChatModelRef) => void
  setVariant: (variant?: string | null) => void
}

const key = "strategy-front.project-composer.v2"
const max = 5
const Ctx = createContext<Ctx | null>(null)

function parse() {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return {}
    }
    return JSON.parse(raw) as ProjectComposerState
  } catch {
    return {}
  }
}

function write(state: ProjectComposerState) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(state))
}

export function ProjectComposerProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<ProjectComposerState>({})
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
      recent: !model
        ? prev.recent
        : [model, ...(prev.recent ?? []).filter((item) => !sameModel(item, model))].slice(0, max),
    }))
  }, [])

  const setVariant = useCallback((variant?: string | null) => {
    setState((prev) => ({
      ...prev,
      variant,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ready,
      setAgent,
      setModel,
      setVariant,
      state,
    }),
    [ready, setAgent, setModel, setVariant, state],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

export function useProjectComposerValue() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("ProjectComposerProvider is missing")
  }
  return ctx
}
