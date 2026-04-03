import { useCallback, useEffect, useMemo } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { useAppSelector } from "@/hooks/useAppSelector"
import { hydrateSessionMessages, setSessionDetailLoading } from "@/store/chat-session-slice"
import {
  selectSessionDetailLoading,
  selectSessionEventError,
  selectSessionLoaded,
  selectSessionMessageError,
  selectSessionMessages,
  selectSessionStatus,
} from "@/store/chat-session-selectors"

export function useChatSessionDetail(workspacePath?: string | null, sessionId?: string | null) {
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
      if (!workspacePath || !id) {
        return
      }
      dispatch(setSessionDetailLoading({ sessionId: id, loading: true }))
      try {
        const data = await chatApi.getSessionMessages(workspacePath, id)
        dispatch(hydrateSessionMessages({ sessionId: id, records: data }))
      } finally {
        dispatch(setSessionDetailLoading({ sessionId: id, loading: false }))
      }
    },
    [dispatch, sessionId, workspacePath],
  )

  useEffect(() => {
    if (!workspacePath || !sessionId || loaded) {
      return
    }
    void refresh(sessionId)
  }, [loaded, refresh, sessionId, workspacePath])

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
