import { useCallback, useEffect, useMemo, useState } from "react"
import { workspaceChatApi } from "@/api/modules"
import { note, phase } from "@/lib/workspace-chat"
import type { WorkspaceSnapshot } from "@/types/workspace-chat"

export function useWorkspaceChatState(path?: string | null) {
  const [box, setBox] = useState<WorkspaceSnapshot | null>(null)
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cur = phase(box)

  const put = useCallback((next: WorkspaceSnapshot | null) => {
    setBox(next)
    if (next) setErr(null)
  }, [])

  const refresh = useCallback(
    async (soft?: boolean) => {
      if (!path) return
      if (!soft) setLoad(true)

      try {
        const next = await workspaceChatApi.getState(path)
        put(next)
        return next
      } catch (err) {
        const txt = note(err, "加载工作流状态失败")
        setErr(txt)
        throw err
      } finally {
        if (!soft) setLoad(false)
      }
    },
    [path, put],
  )

  useEffect(() => {
    void refresh().catch(() => undefined)
  }, [refresh])

  useEffect(() => {
    if (cur !== "running" && cur !== "waiting") return
    const timer = window.setInterval(() => {
      void refresh(true).catch(() => undefined)
    }, 3000)
    return () => {
      window.clearInterval(timer)
    }
  }, [cur, refresh])

  const interrupt = useCallback(async () => {
    if (!path) return
    const next = await workspaceChatApi.interrupt({
      workspace_path: path,
    })
    put(next)
    return next
  }, [path, put])

  return useMemo(
    () => ({
      box,
      state: box?.state ?? null,
      run: box?.run ?? null,
      phase: cur,
      load,
      err,
      put,
      refresh,
      interrupt,
    }),
    [box, cur, err, interrupt, load, put, refresh],
  )
}
