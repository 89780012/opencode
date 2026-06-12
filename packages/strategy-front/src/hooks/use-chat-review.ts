import { useCallback, useEffect, useMemo, useState } from "react"
import { chatApi } from "@/api/modules"
import { log } from "@/lib/error"
import { load, save } from "@/lib/store"
import { relative } from "@/lib/workspace-path"
import { hydrateSessionDiff } from "@/store/chat-session-slice"
import { selectSessionDiffs, useAppDispatch, useAppSelector } from "@/store"

export type ReviewMode = "split" | "unified"

const modeKey = "strategy-front:review-mode:v1"

function readMode(): ReviewMode {
  if (typeof window === "undefined") {
    return "split"
  }

  const value = load(modeKey)
  return value === "unified" ? "unified" : "split"
}

// active 是否刷新
export function useChatReview(workspacePath?: string | null, sessionId?: string | null, active?: boolean) {
  const dispatch = useAppDispatch()
  const raw = useAppSelector((state) => selectSessionDiffs(state, sessionId))
  const diffs = useMemo(
    () =>
      raw.map((item) => {
        const file = relative(workspacePath, item.file) ?? item.file
        if (file === item.file) return item
        return { ...item, file }
      }),
    [raw, workspacePath],
  )
  const [mode, setModeState] = useState<ReviewMode>(readMode)
  const [file, setFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const key = workspacePath && sessionId ? `${workspacePath}\n${sessionId}` : ""

  const refresh = useCallback(async () => {
    if (!sessionId) {
      return
    }

    setLoading(true)
    setErr(null)

    try {
      const data = await chatApi.getSessionDiff(sessionId)
      dispatch(hydrateSessionDiff({ sessionId, diffs: data }))
    } catch (error) {
      log("加载会话代码变更失败", error)
      setErr("加载代码变更失败")
    } finally {
      setLoading(false)
    }
  }, [dispatch, sessionId])

  useEffect(() => {
    if (!active || !workspacePath || !sessionId) {
      return
    }
    void refresh()
  }, [active, key, refresh, sessionId, workspacePath])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    save(modeKey, mode)
  }, [mode])

  useEffect(() => {
    if (!sessionId) {
      setFile(null)
      setErr(null)
      setLoading(false)
      return
    }

    if (diffs.length === 0) {
      setFile(null)
      return
    }

    if (file && diffs.some((item) => item.file === file)) {
      return
    }

    setFile(diffs[0]?.file ?? null)
  }, [diffs, file, sessionId])

  const open = useCallback(
    (path: string) => {
      setFile(relative(workspacePath, path) ?? path)
    },
    [workspacePath],
  )

  const setMode = useCallback((value: ReviewMode) => {
    setModeState(value)
  }, [])

  const diff = useMemo(() => diffs.find((item) => item.file === file) ?? null, [diffs, file])

  return useMemo(
    () => ({
      diffs,
      diff,
      file,
      mode,
      loading,
      err,
      open,
      refresh,
      setMode,
    }),
    [diffs, diff, err, file, loading, mode, open, refresh, setMode],
  )
}
