import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { sameModel } from "@/lib/chat-composer"
import type { ChatModelRef } from "@/types/chat"
import type { ProjectComposerState } from "@/types/composer"

type Ctx = {
  ready: boolean
  pick: (scope?: string) => ProjectComposerState
  setAgent: (scope: string | undefined, agent?: string) => void
  setModel: (scope: string | undefined, model?: ChatModelRef) => void
  setVariant: (scope: string | undefined, variant?: string | null) => void
}

const key = "strategy-front.project-composer.v2"
const max = 5
const Ctx = createContext<Ctx | null>(null)
const root = "default"

type Store = {
  map?: Record<string, ProjectComposerState>
  agent?: string
  model?: ChatModelRef
  variant?: string | null
  recent?: ChatModelRef[]
}

function bucket(scope?: string) {
  return scope?.trim() || root
}

function parse() {
  if (typeof window === "undefined") {
    return {} as Record<string, ProjectComposerState>
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return {} as Record<string, ProjectComposerState>
    }
    const data = JSON.parse(raw) as Store
    if (data.map && typeof data.map === "object") {
      return data.map
    }
    return {
      [root]: {
        agent: data.agent,
        model: data.model,
        variant: data.variant,
        recent: data.recent,
      },
    }
  } catch {
    return {} as Record<string, ProjectComposerState>
  }
}

function write(state: Record<string, ProjectComposerState>) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem(key, JSON.stringify({ map: state }))
}

export function ProjectComposerProvider(props: { children: ReactNode }) {
  const [state, setState] = useState<Record<string, ProjectComposerState>>({})
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

  const pick = useCallback((scope?: string) => state[bucket(scope)] ?? {}, [state])

  const setAgent = useCallback((scope: string | undefined, agent?: string) => {
    setState((prev) => ({
      ...prev,
      [bucket(scope)]: {
        ...(prev[bucket(scope)] ?? {}),
        agent,
      },
    }))
  }, [])

  const setModel = useCallback((scope: string | undefined, model?: ChatModelRef) => {
    setState((prev) => ({
      ...prev,
      [bucket(scope)]: {
        ...(prev[bucket(scope)] ?? {}),
        model,
        recent: !model
          ? prev[bucket(scope)]?.recent
          : [model, ...((prev[bucket(scope)]?.recent ?? []).filter((item) => !sameModel(item, model)))].slice(0, max),
      },
    }))
  }, [])

  const setVariant = useCallback((scope: string | undefined, variant?: string | null) => {
    setState((prev) => ({
      ...prev,
      [bucket(scope)]: {
        ...(prev[bucket(scope)] ?? {}),
        variant,
      },
    }))
  }, [])

  const value = useMemo(
    () => ({
      ready,
      pick,
      setAgent,
      setModel,
      setVariant,
    }),
    [pick, ready, setAgent, setModel, setVariant],
  )

  return <Ctx.Provider value={value}>{props.children}</Ctx.Provider>
}

export function useProjectComposerValue(scope?: string) {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error("缺少 ProjectComposerProvider 上下文")
  }
  return {
    ready: ctx.ready,
    state: ctx.pick(scope),
    setAgent: (agent?: string) => ctx.setAgent(scope, agent),
    setModel: (model?: ChatModelRef) => ctx.setModel(scope, model),
    setVariant: (variant?: string | null) => ctx.setVariant(scope, variant),
  }
}
