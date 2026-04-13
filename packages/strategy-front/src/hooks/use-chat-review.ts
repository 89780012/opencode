import { useCallback, useEffect, useMemo, useState } from "react"
import { chatApi } from "@/api/modules"
import { hydrateSessionDiff } from "@/store/chat-session-slice"
import { selectSessionDiffs, useAppDispatch, useAppSelector } from "@/store"

export type ReviewMode = "split" | "unified"

const modeKey = "strategy-front:review-mode:v1"

function readMode(): ReviewMode {
  if (typeof window === "undefined") {
    return "split"
  }

  const value = window.localStorage.getItem(modeKey)
  return value === "unified" ? "unified" : "split"
}

export function useChatReview(workspacePath?: string | null, sessionId?: string | null, active?: boolean) {
  const dispatch = useAppDispatch()
  const diffs = useAppSelector((state) => selectSessionDiffs(state, sessionId))
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
      console.error("failed to load session diff", error)
      setErr("Failed to load code changes")
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

    window.localStorage.setItem(modeKey, mode)
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

  const open = useCallback((path: string) => {
    setFile(path)
  }, [])

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
