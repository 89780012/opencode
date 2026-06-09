import { configureStore } from "@reduxjs/toolkit"
import { useDispatch, useSelector } from "react-redux"
import { idle } from "@/lib/chat-event-reducer"
import { sessionPermissionRequest, sessionQuestionRequest } from "@/lib/session-request-tree"
import { chatSessionReducer } from "@/store/chat-session-slice"
import { workbenchReducer } from "@/store/workbench-slice"
import type {
  ChatFileDiff,
  ChatMessageInfo,
  ChatPart,
  ChatQuestionRequest,
  ChatTodo,
  PermissionRequest,
} from "@/types/chat"

export const store = configureStore({
  reducer: {
    chatSession: chatSessionReducer,
    workbench: workbenchReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

const empty: never[] = []
const emptyMessages: ChatMessageInfo[] = []
const emptyParts: ChatPart[] = []
const emptyDiffs: ChatFileDiff[] = []
const emptyTodos: ChatTodo[] = []
const emptyPermissions: Record<string, PermissionRequest[] | undefined> = {}
const emptyQuestions: Record<string, ChatQuestionRequest[] | undefined> = {}

export function selectWorkspaceSessions(state: RootState, workspace?: string | null) {
  if (!workspace) {
    return empty
  }
  return state.chatSession.sessions[workspace]?.filter((session) => session.title != "__summary__") ?? empty
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

export function selectSessionParts(state: RootState, messageId?: string | null) {
  return messageId ? (state.chatSession.parts[messageId] ?? emptyParts) : emptyParts
}

export function selectSessionStatus(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.status[sessionId] ?? idle) : idle
}

export function selectSessionAbort(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.sessionAbort[sessionId] ?? false) : false
}

export function selectSessionIssue(state: RootState, sessionId?: string | null) {
  if (!sessionId) return
  if (state.chatSession.sessionAbort[sessionId]) return "Aborted"
  return state.chatSession.messageErrs[sessionId] ?? state.chatSession.eventErrs[sessionId]
}

export function selectSessionMessageError(state: RootState, sessionId?: string | null) {
  return sessionId ? state.chatSession.messageErrs[sessionId] : undefined
}

export function selectMessageRunError(state: RootState, messageId?: string | null) {
  return messageId ? state.chatSession.runErrs[messageId] : undefined
}

export function selectSessionEventError(state: RootState, sessionId?: string | null) {
  return sessionId ? state.chatSession.eventErrs[sessionId] : undefined
}

export function selectSessionDiffs(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.sessionDiffs[sessionId] ?? emptyDiffs) : emptyDiffs
}

export function selectSessionTodos(state: RootState, sessionId?: string | null) {
  return sessionId ? (state.chatSession.todos[sessionId] ?? emptyTodos) : emptyTodos
}

export function selectSessionTodoData(state: RootState, sessionId?: string | null) {
  return sessionId ? state.chatSession.todos[sessionId] : undefined
}

export function selectPermissionLoaded(state: RootState) {
  return state.chatSession.permissionLoaded
}

export function selectQuestionLoaded(state: RootState) {
  return state.chatSession.questionLoaded
}

export function selectPermissionRequests(state: RootState) {
  return state.chatSession.permissions ?? emptyPermissions
}

export function selectQuestionRequests(state: RootState) {
  return state.chatSession.questions ?? emptyQuestions
}

export function selectSessionPermissionRequest(state: RootState, workspace?: string | null, sessionId?: string | null) {
  if (!workspace) {
    return
  }
  return sessionPermissionRequest(selectWorkspaceSessions(state, workspace), selectPermissionRequests(state), sessionId)
}

export function selectSessionQuestionRequest(state: RootState, workspace?: string | null, sessionId?: string | null) {
  if (!workspace) {
    return
  }
  return sessionQuestionRequest(selectWorkspaceSessions(state, workspace), selectQuestionRequests(state), sessionId)
}

export function selectQuestionRecordStamp(state: RootState) {
  return state.chatSession.questionRecordStamp
}

export function selectWorkbench(state: RootState) {
  return state.workbench
}

export function selectWorkbenchQuestions(state: RootState, path?: string | null) {
  if (!path) return empty
  if (state.workbench.questionPath !== path) return empty
  return state.workbench.questions
}

export function selectWorkbenchAnalysis(state: RootState, path?: string | null) {
  if (!path) return null
  if (state.workbench.analysisPath !== path) return null
  return state.workbench.analysis
}
