import { idle } from "@/lib/chat-event-reducer"
import type { RootState } from "@/store"
import type { ChatMessageInfo } from "@/types/chat"

const empty: never[] = []
const emptyMessages: ChatMessageInfo[] = []

export function selectWorkspaceSessions(state: RootState, workspace?: string | null) {
  if (!workspace) {
    return empty
  }
  return state.chatSession.sessions[workspace] ?? empty
}

export function selectWorkspaceSessionLoaded(state: RootState, workspace?: string | null) {
  return workspace ? (state.chatSession.loaded[workspace] ?? false) : false
}

export function selectWorkspaceSessionLoading(state: RootState, workspace?: string | null) {
  return workspace ? (state.chatSession.sessionLoading[workspace] ?? false) : false
}

export function selectWorkspaceSessionCreating(state: RootState, workspace?: string | null) {
  return workspace ? (state.chatSession.sessionCreating[workspace] ?? false) : false
}

export function selectSelectedSessionId(state: RootState, workspace?: string | null) {
  return workspace ? (state.chatSession.selected[workspace] ?? null) : null
}

export function selectSessionLoaded(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.hydrated[sessionId] ?? false) : false
}

export function selectSessionDetailLoading(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.detailLoading[sessionId] ?? false) : false
}

export function selectSessionMessages(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.messages[sessionId] ?? emptyMessages) : emptyMessages
}

export function selectSessionStatus(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.status[sessionId] ?? idle) : idle
}

export function selectSessionMessageError(state: RootState, sessionId?: string | null) {
  return sessionId ? state.chatSession.messageErrs[sessionId] : undefined
}

export function selectSessionEventError(state: RootState, sessionId?: string | null) {
  return sessionId ? state.chatSession.eventErrs[sessionId] : undefined
}
