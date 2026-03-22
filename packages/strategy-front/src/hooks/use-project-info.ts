import { useCallback, useEffect, useMemo, useState } from "react"
import { projectApi } from "@/api/modules/project"
import type { ProjectInfo } from "@/types/project"

export function useProjectInfo(workspacePath?: string | null, active?: boolean) {
  const [data, setData] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [initing, setIniting] = useState(false)

  const refresh = useCallback(async () => {
    if (!workspacePath) {
      setData(null)
      setErr(null)
      return
    }

    setLoading(true)
    setErr(null)
    try {
      setData(await projectApi.current(workspacePath))
    } catch (error) {
      console.error("failed to load project info", error)
      setErr("Failed to load project status")
    } finally {
      setLoading(false)
    }
  }, [workspacePath])

  const init = useCallback(async () => {
    if (!workspacePath) {
      return null
    }

    setIniting(true)
    setErr(null)
    try {
      const next = await projectApi.initGit(workspacePath)
      setData(next)
      return next
    } catch (error) {
      console.error("failed to init git", error)
      setErr("Failed to initialize Git")
      throw error
    } finally {
      setIniting(false)
    }
  }, [workspacePath])

  useEffect(() => {
    if (!active) {
      return
    }
    void refresh()
  }, [active, refresh])

  return useMemo(
    () => ({
      data,
      loading,
      err,
      initing,
      refresh,
      init,
    }),
    [data, err, init, initing, loading, refresh],
  )
}
