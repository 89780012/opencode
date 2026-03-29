import { useCallback, useEffect, useMemo, useState } from "react"
import { chatApi } from "@/api/modules"
import { useAppDispatch } from "@/hooks/useAppDispatch"
import { useAppSelector } from "@/hooks/useAppSelector"
import { idle } from "@/lib/chat-event-reducer"
import { hydrateSessionMessages } from "@/store/chat-session-slice"
import type { ChatMessageInfo } from "@/types/chat"

const empty: ChatMessageInfo[] = []

export function useChatSessionDetail(workspacePath?: string | null, sessionId?: string | null) {
  const dispatch = useAppDispatch()
  const messages = useAppSelector((state) =>
    sessionId ? (state.chatSession.messages[sessionId] ?? empty) : empty,
  )
  const status = useAppSelector((state) => (sessionId ? (state.chatSession.status[sessionId] ?? idle) : idle))
  const messageErr = useAppSelector((state) => (sessionId ? state.chatSession.messageErrs[sessionId] : undefined))
  const rawEventErr = useAppSelector((state) => (sessionId ? state.chatSession.eventErrs[sessionId] : undefined))
  const [loading, setLoading] = useState(false)

  const hasCache = messages.length > 0

  const refresh = useCallback(
    async (target?: string | null) => {
      const id = target ?? sessionId
      if (!workspacePath || !id) {
        return
      }
      try {
        const data = await chatApi.getSessionMessages(workspacePath, id)
        dispatch(hydrateSessionMessages({ sessionId: id, records: data }))
      } finally {
        setLoading(false)
      }
    },
    [dispatch, sessionId, workspacePath],
  )

  useEffect(() => {
    if (!workspacePath || !sessionId) {
      return
    }
    if (!hasCache) {
      setLoading(true)
    }
    void refresh(sessionId)
  }, [hasCache, refresh, sessionId, workspacePath])

  const eventErr = messageErr ? undefined : rawEventErr

  return useMemo(
    () => ({
      messages,
      status,
      err: eventErr ?? messageErr,
      eventErr,
      messageErr,
      loading,
      refresh,
    }),
    [eventErr, loading, messageErr, messages, refresh, status],
  )
}
