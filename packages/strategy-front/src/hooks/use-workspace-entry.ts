import { useCallback, useEffect, useState } from "react"
import { workspaceApi } from "@/api/modules"
import type { AttachWorkspaceGitState, LocalWorkspace } from "@/types/workspace"

function msg(err: unknown, text: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return text
}

export function useWorkspaceEntry(path?: string | null) {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null)
  const [git, setGit] = useState<AttachWorkspaceGitState | null>(null)
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState("")
  const [phase, setPhase] = useState<"" | "check" | "init">("")

  const refresh = useCallback(async () => {
    const dir = path?.trim() ?? ""
    if (!dir) {
      setWorkspace(null)
      setGit(null)
      setErr("")
      setPhase("")
      return
    }

    setLoad(true)
    setErr("")
    setPhase("check")
    try {
      const data = await workspaceApi.attachWorkspace(dir, "smartx", false)
      if (!data.git.repo) {
        setPhase("init")
        const next = await workspaceApi.attachWorkspace(dir, "smartx", true)
        setWorkspace(next.workspace)
        setGit(next.git)
        return
      }
      setWorkspace(data.workspace)
      setGit(data.git)
    } catch (err) {
      setWorkspace(null)
      setGit(null)
      setErr(msg(err, "工作区初始化失败"))
    } finally {
      setPhase("")
      setLoad(false)
    }
  }, [path])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    workspace,
    git,
    load,
    phase,
    err,
    ready: !!workspace && !load && !err,
    refresh,
  }
}
