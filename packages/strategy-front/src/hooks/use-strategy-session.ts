import { useCallback, useEffect, useMemo } from "react"
import { chatApi } from "@/api/modules"
import { useChatSessionDetail } from "@/hooks/use-chat-session-detail"
import { useChatSessions } from "@/hooks/use-chat-sessions"
import { useWorkspaceChatState } from "@/hooks/use-workspace-chat-state"
import { busy as workflowBusy } from "@/lib/workspace-chat"

export function useStrategySession(path?: string | null) {
  const chat = useChatSessions(path)
  const room = useWorkspaceChatState(path)
  const detail = useChatSessionDetail(path, chat.selectedSessionId)
  const busy = workflowBusy(room.box, chat.selectedSessionId) || (!!chat.selectedSessionId && detail.status.type !== "idle")

  useEffect(() => {
    void chat.ensureSessions()
  }, [chat.ensureSessions])

  useEffect(() => {
    if (!room.state?.session_id) return
    if (chat.selectedSessionId === room.state.session_id) return
    chat.selectSession(room.state.session_id)
  }, [chat.selectSession, chat.selectedSessionId, room.state?.session_id])

  useEffect(() => {
    if (chat.selectedSessionId || room.state?.session_id || chat.sessions.length === 0) {
      return
    }
    chat.selectSession(chat.sessions[0].id)
  }, [chat.selectSession, chat.selectedSessionId, chat.sessions, room.state?.session_id])

  const abortSession = useCallback(async () => {
    if (!path || !chat.selectedSessionId || !busy) {
      return
    }
    if (workflowBusy(room.box, chat.selectedSessionId)) {
      await room.interrupt()
      return
    }
    await chatApi.abortSession(path, chat.selectedSessionId)
  }, [busy, chat.selectedSessionId, path, room.box, room.interrupt])

  return useMemo(
    () => ({
      ...chat,
      ...detail,
      state: room.state,
      phase: room.phase,
      load: room.load,
      workflowErr: room.err,
      busy,
      abortSession,
      detailLoading: detail.loading,
      sessionLoading: chat.loading,
      ensure: chat.ensureSessions,
      reloadSessions: chat.refreshSessions,
    }),
    [abortSession, busy, chat, detail, room.err, room.load, room.phase, room.state],
  )
}
