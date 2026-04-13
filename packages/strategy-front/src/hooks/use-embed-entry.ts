import { useCallback, useEffect, useState } from "react"
import { workspaceApi } from "@/api/modules"
import type { AttachWorkspaceGitState, LocalWorkspace } from "@/types/workspace"

function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return text
}

export function useEmbedEntry(path?: string | null) {
  const [workspace, setWorkspace] = useState<LocalWorkspace | null>(null)
  const [git, setGit] = useState<AttachWorkspaceGitState | null>(null)
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState("")

  const refresh = useCallback(async () => {
    const dir = path?.trim() ?? ""
    if (!dir) {
      setWorkspace(null)
      setGit(null)
      setErr("")
      return
    }

    setLoad(true)
    setErr("")
    try {
      const data = await workspaceApi.attachWorkspace(dir, "smartx")
      setWorkspace(data.workspace)
      setGit(data.git)
    } catch (err) {
      setWorkspace(null)
      setGit(null)
      setErr(note(err, "工作区初始化失败"))
    } finally {
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
    err,
    ready: !!workspace && !load && !err,
    refresh,
  }
}
