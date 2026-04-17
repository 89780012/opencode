import { useCallback, useEffect, useMemo } from "react"
import { chatApi } from "@/api/modules"
import {
  selectSelectedSessionId,
  selectSessionDetailLoading,
  selectSessionEventError,
  selectSessionLoaded,
  selectSessionMessageError,
  selectSessionMessages,
  selectSessionStatus,
  selectWorkspaceSessionCreating,
  selectWorkspaceSessionLoaded,
  selectWorkspaceSessionLoading,
  selectWorkspaceSessions,
  useAppDispatch,
  useAppSelector,
} from "@/store"
import {
  setSelectedWorkspaceSession,
  setSessionDetailLoading,
  setWorkspaceSessionCreating,
  setWorkspaceSessionLoading,
  setWorkspaceSessions,
  upsertWorkspaceSession,
  hydrateSessionMessages,
} from "@/store/chat-session-slice"

// 本质上效果是去重,防止误点击等操作
const loads = new Map<string, Promise<void>>()
const creates = new Map<string, Promise<string>>()
const details = new Map<string, Promise<void>>()

export function useChatSessions(path?: string | null) {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((state) => selectWorkspaceSessionLoaded(state, path))
  const sessions = useAppSelector((state) => selectWorkspaceSessions(state, path))
  const selectedSessionId = useAppSelector((state) => selectSelectedSessionId(state, path))
  const loading = useAppSelector((state) => selectWorkspaceSessionLoading(state, path))
  const creating = useAppSelector((state) => selectWorkspaceSessionCreating(state, path))

  // 获取会话列表
  const refreshSessions = useCallback(async () => {
    if (!path) {
      return
    }

    const cur = loads.get(path)
    if (cur) {
      return cur
    }

    dispatch(setWorkspaceSessionLoading({ workspace: path, loading: true }))
    const task = (async () => {
      try {
        const sessions = await chatApi.listSessions(path)
        dispatch(setWorkspaceSessions({ workspace: path, sessions }))
      } finally {
        dispatch(setWorkspaceSessionLoading({ workspace: path, loading: false }))
      }
    })()

    loads.set(path, task)

    try {
      await task
    } finally {
      if (loads.get(path) === task) {
        loads.delete(path)
      }
    }
  }, [dispatch, path])

  const ensureSessions = useCallback(async () => {
    if (!path || loaded) {
      return
    }
    await refreshSessions()
  }, [loaded, path, refreshSessions])

  // 创建会话
  const createSession = useCallback(async () => {
    if (!path) {
      throw new Error("需要工作区路径")
    }

    const cur = creates.get(path)
    if (cur) {
      return cur
    }

    dispatch(setWorkspaceSessionCreating({ workspace: path, creating: true }))
    const task = (async () => {
      try {
        const session = await chatApi.createSession(path)
        dispatch(upsertWorkspaceSession({ workspace: path, session }))
        dispatch(setSelectedWorkspaceSession({ workspace: path, sessionId: session.id }))
        return session.id
      } finally {
        dispatch(setWorkspaceSessionCreating({ workspace: path, creating: false }))
      }
    })()

    creates.set(path, task)

    try {
      return await task
    } finally {
      if (creates.get(path) === task) {
        creates.delete(path)
      }
    }
  }, [dispatch, path])

  const selectSession = useCallback(
    (sessionId: string | null) => {
      if (!path) {
        return
      }
      dispatch(setSelectedWorkspaceSession({ workspace: path, sessionId }))
    },
    [dispatch, path],
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
    [
      createSession,
      creating,
      ensureSessions,
      loaded,
      loading,
      refreshSessions,
      selectSession,
      selectedSessionId,
      sessions,
    ],
  )
}

export function useChatSessionDetail(path?: string | null, sessionId?: string | null) {
  const dispatch = useAppDispatch()
  const loaded = useAppSelector((state) => selectSessionLoaded(state, sessionId))
  const messages = useAppSelector((state) => selectSessionMessages(state, sessionId))
  const status = useAppSelector((state) => selectSessionStatus(state, sessionId))
  const messageErr = useAppSelector((state) => selectSessionMessageError(state, sessionId))
  const rawEventErr = useAppSelector((state) => selectSessionEventError(state, sessionId))
  const loading = useAppSelector((state) => selectSessionDetailLoading(state, sessionId))

  const refresh = useCallback(
    async (target?: string | null) => {
      const id = target ?? sessionId
      if (!path || !id) {
        return
      }

      const cur = details.get(id)
      if (cur) {
        return cur
      }

      dispatch(setSessionDetailLoading({ sessionId: id, loading: true }))
      const task = (async () => {
        try {
          const records = await chatApi.getSessionMessages(path, id)
          dispatch(hydrateSessionMessages({ sessionId: id, records }))
        } finally {
          dispatch(setSessionDetailLoading({ sessionId: id, loading: false }))
        }
      })()

      details.set(id, task)

      try {
        await task
      } finally {
        if (details.get(id) === task) {
          details.delete(id)
        }
      }
    },
    [dispatch, path, sessionId],
  )

  useEffect(() => {
    if (!path || !sessionId || loaded) {
      return
    }
    void refresh(sessionId)
  }, [loaded, path, refresh, sessionId])

  const eventErr = messageErr ? undefined : rawEventErr

  return useMemo(
    () => ({
      loaded,
      messages,
      status,
      err: eventErr ?? messageErr,
      eventErr,
      messageErr,
      loading,
      refresh,
    }),
    [eventErr, loaded, loading, messageErr, messages, refresh, status],
  )
}

export function useStrategySession(path?: string | null) {
  const chat = useChatSessions(path)
  const detail = useChatSessionDetail(path, chat.selectedSessionId)
  const busy = !!chat.selectedSessionId && detail.status.type !== "idle"

  useEffect(() => {
    void chat.ensureSessions()
  }, [chat])

  useEffect(() => {
    if (!chat.loaded || chat.selectedSessionId || chat.sessions.length === 0) {
      return
    }
    chat.selectSession(chat.sessions[0].id)
  }, [chat])

  const abortSession = useCallback(async () => {
    if (!path || !chat.selectedSessionId || !busy) {
      return
    }
    await chatApi.abortSession(path, chat.selectedSessionId)
  }, [busy, chat.selectedSessionId, path])

  return useMemo(
    () => ({
      ...chat,
      ...detail,
      busy,
      abortSession,
      detailLoading: detail.loading,
      sessionLoading: chat.loading,
      ensure: chat.ensureSessions,
      reloadSessions: chat.refreshSessions,
    }),
    [abortSession, busy, chat, detail],
  )
}
