import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import {
  applyChatEvent,
  hydrateChat,
  hydratePermissions,
  hydrateQuestions,
  removeSession,
  upsertSession,
  type ChatStateShape,
} from "@/lib/chat-event-reducer"
import type {
  ChatEvent,
  ChatFileDiff,
  ChatMessageRecord,
  ChatQuestionRequest,
  ChatSessionSummary,
  ChatTodo,
  PermissionRequest,
} from "@/types/chat"

type State = ChatStateShape

const initialState: State = {
  sessions: {},
  loaded: {},
  sessionLoading: {},
  sessionCreating: {},
  selected: {},
  hydrated: {},
  detailLoading: {},
  messages: {},
  parts: {},
  sessionDiffs: {},
  todos: {},
  permissions: {},
  permissionLoaded: false,
  questions: {},
  questionLoaded: false,
  status: {},
  messageErrs: {},
  eventErrs: {},
  questionRecordStamp: 0,
}

const slice = createSlice({
  name: "chatSession",
  initialState,
  reducers: {
    setWorkspaceSessions(state, action: PayloadAction<{ workspace: string; sessions: ChatSessionSummary[] }>) {
      state.sessions[action.payload.workspace] = [...action.payload.sessions].sort(
        (a, b) => b.time.updated - a.time.updated,
      )
      state.loaded[action.payload.workspace] = true
      const id = state.selected[action.payload.workspace]
      if (!id) {
        return
      }
      const ok = action.payload.sessions.some((item) => item.id === id)
      if (ok) {
        return
      }
      state.selected[action.payload.workspace] = null
    },
    setWorkspaceSessionLoading(state, action: PayloadAction<{ workspace: string; loading: boolean }>) {
      state.sessionLoading[action.payload.workspace] = action.payload.loading
    },
    setWorkspaceSessionCreating(state, action: PayloadAction<{ workspace: string; creating: boolean }>) {
      state.sessionCreating[action.payload.workspace] = action.payload.creating
    },
    upsertWorkspaceSession(state, action: PayloadAction<{ workspace: string; session: ChatSessionSummary }>) {
      upsertSession(state, action.payload.workspace, action.payload.session)
    },
    removeWorkspaceSession(state, action: PayloadAction<{ workspace: string; session: ChatSessionSummary }>) {
      removeSession(state, action.payload.workspace, action.payload.session)
    },
    setSelectedWorkspaceSession(state, action: PayloadAction<{ workspace: string; sessionId: string | null }>) {
      state.selected[action.payload.workspace] = action.payload.sessionId
      if (!action.payload.sessionId) {
        return
      }
      delete state.eventErrs[action.payload.sessionId]
    },
    hydrateSessionMessages(state, action: PayloadAction<{ sessionId: string; records: ChatMessageRecord[] }>) {
      hydrateChat(state, action.payload.sessionId, action.payload.records)
    },
    setSessionDetailLoading(state, action: PayloadAction<{ sessionId: string; loading: boolean }>) {
      state.detailLoading[action.payload.sessionId] = action.payload.loading
    },
    hydrateSessionDiff(state, action: PayloadAction<{ sessionId: string; diffs: ChatFileDiff[] }>) {
      state.sessionDiffs[action.payload.sessionId] = action.payload.diffs
    },
    setSessionTodos(state, action: PayloadAction<{ sessionId: string; todos: ChatTodo[] }>) {
      state.todos[action.payload.sessionId] = action.payload.todos
    },
    setPendingQuestions(state, action: PayloadAction<{ items: ChatQuestionRequest[] }>) {
      hydrateQuestions(state, action.payload.items)
    },
    setPendingPermissions(state, action: PayloadAction<{ items: PermissionRequest[] }>) {
      hydratePermissions(state, action.payload.items)
    },
    applyWorkspaceEvent(state, action: PayloadAction<{ workspace: string; event: ChatEvent }>) {
      applyChatEvent(state, action.payload.workspace, action.payload.event)
    },
    clearSessionEventError(state, action: PayloadAction<{ sessionId: string }>) {
      delete state.eventErrs[action.payload.sessionId]
    },
    bumpQuestionRecord(state) {
      state.questionRecordStamp++
    },
  },
})

export const {
  setWorkspaceSessions,
  setWorkspaceSessionLoading,
  setWorkspaceSessionCreating,
  upsertWorkspaceSession,
  removeWorkspaceSession,
  setSelectedWorkspaceSession,
  hydrateSessionMessages,
  setSessionDetailLoading,
  hydrateSessionDiff,
  setSessionTodos,
  setPendingQuestions,
  setPendingPermissions,
  applyWorkspaceEvent,
  clearSessionEventError,
  bumpQuestionRecord,
} = slice.actions

export const chatSessionReducer = slice.reducer
