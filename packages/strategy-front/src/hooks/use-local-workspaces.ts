import { useCallback, useEffect, useState } from "react"
import { workspaceApi } from "@/api/modules/workspace"
import type { LocalWorkspace } from "@/types/workspace"

interface UseLocalWorkspacesResult {
  loading: boolean
  loaded: boolean
  error: string | null
  basePath: string
  workspaces: LocalWorkspace[]
  refresh: () => Promise<void>
}

export function useLocalWorkspaces(): UseLocalWorkspacesResult {
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basePath, setBasePath] = useState("")
  const [workspaces, setWorkspaces] = useState<LocalWorkspace[]>([])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await workspaceApi.getLocalWorkspaces()
      setBasePath(data.base_path)
      setWorkspaces(
        (data.workspaces ?? []).map((item) => ({
          ...item,
          keywords: item.keywords ?? [],
        })),
      )
    } catch (err) {
      console.error("failed to load local workspaces", err)
      setError("失败加载工作空间")
    } finally {
      setLoaded(true)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    loading,
    loaded,
    error,
    basePath,
    workspaces,
    refresh,
  }
}
