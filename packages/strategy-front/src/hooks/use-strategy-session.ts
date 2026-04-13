import { useCallback, useEffect, useMemo } from "react"
import { chatApi } from "@/api/modules"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"

export function useStrategySession(path?: string | null) {
  const chat = useChatSessions(path)
  const detail = useChatSessionDetail(path, chat.selectedSessionId)
  const busy = !!chat.selectedSessionId && detail.status.type !== "idle"

  useEffect(() => {
    void chat.ensureSessions()
  }, [chat.ensureSessions])

  useEffect(() => {
    if (chat.selectedSessionId || chat.sessions.length === 0) {
      return
    }
    chat.selectSession(chat.sessions[0].id)
  }, [chat.selectSession, chat.selectedSessionId, chat.sessions])

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
