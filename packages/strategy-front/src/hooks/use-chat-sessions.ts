import { useCallback, useMemo, useState } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { useAppSelector } from "@/hooks/useAppSelector"
import { setSelectedWorkspaceSession, setWorkspaceSessions, upsertWorkspaceSession } from "@/store/chat-session-slice"

export function useChatSessions(workspacePath?: string | null) {
  const dispatch = useAppDispatch()
  const key = workspacePath ?? ""
  const loaded = useAppSelector((state) => (key ? (state.chatSession.loaded[key] ?? false) : false))
  const sessions = useAppSelector((state) => (key ? (state.chatSession.sessions[key] ?? []) : []))
  const selectedSessionId = useAppSelector((state) => (key ? (state.chatSession.selected[key] ?? null) : null))
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  // 刷新session
  const refreshSessions = useCallback(async () => {
    if (!workspacePath) {
      return
    }
    setLoading(true)
    try {
      const data = await chatApi.listSessions(workspacePath)
      dispatch(setWorkspaceSessions({ workspace: workspacePath, sessions: data }))
    } finally {
      setLoading(false)
    }
  }, [dispatch, workspacePath])

  // 创建session
  const createSession = useCallback(async () => {
    if (!workspacePath) {
      throw new Error("需要工作空间")
    }
    setCreating(true)
    try {
      const session = await chatApi.createSession(workspacePath)
      dispatch(upsertWorkspaceSession({ workspace: workspacePath, session }))
      dispatch(
        setSelectedWorkspaceSession({
          workspace: workspacePath,
          sessionId: session.id,
        }),
      )
      return session.id
    } finally {
      setCreating(false)
    }
  }, [dispatch, workspacePath])

  // 选择session
  const selectSession = useCallback(
    (sessionId: string | null) => {
      if (!workspacePath) {
        return
      }
      dispatch(
        setSelectedWorkspaceSession({
          workspace: workspacePath,
          sessionId,
        }),
      )
    },
    [dispatch, workspacePath],
  )

  return useMemo(
    () => ({
      loaded,
      sessions,
      selectedSessionId,
      loading,
      creating,
      refreshSessions,
      createSession,
      selectSession,
    }),
    [createSession, creating, loaded, loading, refreshSessions, selectSession, selectedSessionId, sessions],
  )
}
