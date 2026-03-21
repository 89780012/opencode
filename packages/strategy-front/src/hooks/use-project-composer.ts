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

const key = "strategy-front.project-composer.v2"

function parse() {
  if (typeof window === "undefined") return {}

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}
    return JSON.parse(raw) as ProjectComposerState
  } catch {
    return {}
  }
}

function write(item: ProjectComposerState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(item))
}

export function useProjectComposer() {
  const dispatch = useAppDispatch()
  const cur = useAppSelector((state) => state.projectComposer.item)
  const ready = useAppSelector((state) => state.projectComposer.ready)

  useEffect(() => {
    if (ready) return
    // 客户端首次进入时，先从 localStorage 回填一次。
    dispatch(hydrateProjectComposer(parse()))
  }, [dispatch, ready])

  useEffect(() => {
    if (!ready) return
    // 只有回填完成后才写回，避免初始空 store 覆盖掉已保存的偏好。
    write(cur)
  }, [cur, ready])

  const patch = useCallback(
    (item: Partial<ProjectComposerState>) => {
      dispatch(patchProjectComposer(item))
    },
    [dispatch],
  )

  const push = useCallback(
    (model: ChatModelRef) => {
      dispatch(pushProjectModel(model))
    },
    [dispatch],
  )

  return useMemo(
    () => ({
      ready,
      state: cur,
      setAgent(agent?: string) {
        patch({ agent })
      },
      setModel(model?: ChatModelRef) {
        patch({ model })
        // 用户显式选过的模型要单独记到 recent 里，给后续回退排序使用。
        if (!model) return
        push(model)
      },
      setVariant(variant?: string | null) {
        patch({ variant })
      },
    }),
    [cur, patch, push, ready],
  )
}
