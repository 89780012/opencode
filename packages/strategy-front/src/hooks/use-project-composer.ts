import { useCallback, useEffect, useMemo } from "react"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { useAppSelector } from "@/hooks/useAppSelector"
import {
  hydrateProjectComposer,
  patchProjectComposer,
  pushProjectModel,
} from "@/store/project-composer-slice"
import type { ChatModelRef } from "@/types/chat"
import type { ProjectComposerState } from "@/types/composer"

const key = "strategy-front.project-composer.v1"

function parse() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ProjectComposerState>
  } catch {
    return {}
  }
}

function write(all: Record<string, ProjectComposerState>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(all))
}

export function useProjectComposer(workspacePath?: string | null) {
  const dispatch = useAppDispatch()
  const cur = useAppSelector((state) =>
    workspacePath ? (state.projectComposer.items[workspacePath] ?? {}) : {},
  )
  const ready = useAppSelector((state) =>
    workspacePath ? !!state.projectComposer.ready[workspacePath] : false,
  )
  const all = useAppSelector((state) => state.projectComposer.items)

  useEffect(() => {
    if (!workspacePath || ready) return
    dispatch(
      hydrateProjectComposer({
        workspace: workspacePath,
        item: parse()[workspacePath] ?? {},
      }),
    )
  }, [dispatch, ready, workspacePath])

  useEffect(() => {
    if (!workspacePath || !ready) return
    const next = parse()
    next[workspacePath] = cur
    write(next)
  }, [cur, ready, workspacePath])

  const patch = useCallback(
    (item: Partial<ProjectComposerState>) => {
      if (!workspacePath) return
      dispatch(
        patchProjectComposer({
          workspace: workspacePath,
          item,
        }),
      )
    },
    [dispatch, workspacePath],
  )

  const push = useCallback(
    (model: ChatModelRef) => {
      if (!workspacePath) return
      dispatch(
        pushProjectModel({
          workspace: workspacePath,
          model,
        }),
      )
    },
    [dispatch, workspacePath],
  )

  return useMemo(
    () => ({
      ready,
      state: cur,
      all,
      setAgent(agent?: string) {
        patch({ agent })
      },
      setModel(model?: ChatModelRef) {
        patch({ model })
        if (!model) return
        push(model)
      },
      setVariant(variant?: string | null) {
        patch({ variant })
      },
    }),
    [all, cur, patch, push, ready],
  )
}
