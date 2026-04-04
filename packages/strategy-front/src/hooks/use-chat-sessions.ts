import { useCallback, useMemo } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { useAppSelector } from "@/hooks/useAppSelector"
import {
  setSelectedWorkspaceSession,
  setWorkspaceSessionCreating,
  setWorkspaceSessionLoading,
  setWorkspaceSessions,
  upsertWorkspaceSession,
} from "@/store/chat-session-slice"
import {
  selectSelectedSessionId,
  selectWorkspaceSessionCreating,
  selectWorkspaceSessionLoaded,
  selectWorkspaceSessionLoading,
  selectWorkspaceSessions,
} from "@/store/chat-session-selectors"

const loads = new Map<string, Promise<void>>()
const creates = new Map<string, Promise<string>>()

export function useChatSessions(workspacePath?: string | null) {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((state) => selectWorkspaceSessionLoaded(state, workspacePath))
  const sessions = useAppSelector((state) => selectWorkspaceSessions(state, workspacePath))
  const selectedSessionId = useAppSelector((state) => selectSelectedSessionId(state, workspacePath))
  const loading = useAppSelector((state) => selectWorkspaceSessionLoading(state, workspacePath))
  const creating = useAppSelector((state) => selectWorkspaceSessionCreating(state, workspacePath))

  const refreshSessions = useCallback(async () => {
    if (!workspacePath) {
      return
    }

    const cur = loads.get(workspacePath)
    if (cur) {
      return cur
    }

    dispatch(setWorkspaceSessionLoading({ workspace: workspacePath, loading: true }))
    const task = (async () => {
      try {
        const data = await chatApi.listSessions(workspacePath)
        dispatch(setWorkspaceSessions({ workspace: workspacePath, sessions: data }))
      } finally {
        dispatch(setWorkspaceSessionLoading({ workspace: workspacePath, loading: false }))
      }
    })()

    loads.set(workspacePath, task)

    try {
      await task
    } finally {
      if (loads.get(workspacePath) === task) {
        loads.delete(workspacePath)
      }
    }
  }, [dispatch, workspacePath])

  const ensureSessions = useCallback(async () => {
    if (!workspacePath || loaded) {
      return
    }
    await refreshSessions()
  }, [loaded, refreshSessions, workspacePath])

  const createSession = useCallback(async () => {
    if (!workspacePath) {
      throw new Error("需要工作区路径")
    }

    const cur = creates.get(workspacePath)
    if (cur) {
      return cur
    }

    dispatch(setWorkspaceSessionCreating({ workspace: workspacePath, creating: true }))
    const task = (async () => {
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
        dispatch(setWorkspaceSessionCreating({ workspace: workspacePath, creating: false }))
      }
    })()

    creates.set(workspacePath, task)

    try {
      return await task
    } finally {
      if (creates.get(workspacePath) === task) {
        creates.delete(workspacePath)
      }
    }
  }, [dispatch, workspacePath])

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
      ensureSessions,
      refreshSessions,
      createSession,
      selectSession,
    }),
    [createSession, creating, ensureSessions, loaded, loading, refreshSessions, selectSession, selectedSessionId, sessions],
  )
}
