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
  ChatStatus,
  ChatTodo,
  PermissionRequest,
} from "@/types/chat"

type State = ChatStateShape

const initialState: State = {
  sessions: {},
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
  runErrs: {},
  eventErrs: {},
  questionRecordStamp: 0,
  sessionAbort: {},
}

const slice = createSlice({
  name: "chatSession",
  initialState,
  reducers: {
    setWorkspaceSessions(state, action: PayloadAction<{ workspace: string; sessions: ChatSessionSummary[] }>) {
      const sessions = action.payload.sessions.filter((item) => !item.parentID && item.title !== "__summary__")
      state.sessions[action.payload.workspace] = [...sessions].sort((a, b) => b.time.updated - a.time.updated)
      const id = state.selected[action.payload.workspace]
      if (!id) {
        return
      }
      const ok = sessions.some((item) => item.id === id)
      if (ok) {
        return
      }
      state.selected[action.payload.workspace] = null
    },
    setWorkspaceSessionCreating(state, action: PayloadAction<{ workspace: string; creating: boolean }>) {
      state.sessionCreating[action.payload.workspace] = action.payload.creating
    },
    upsertWorkspaceSession(state, action: PayloadAction<{ workspace: string; session: ChatSessionSummary }>) {
      if (action.payload.session.parentID || action.payload.session.title === "__summary__") return
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
    setSessionStatus(state, action: PayloadAction<{ sessions: string[]; status: Record<string, ChatStatus> }>) {
      action.payload.sessions.forEach((id) => {
        state.status[id] = action.payload.status[id] ?? { type: "idle" }
      })
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
    updateSessionAbortStatus(state, action: PayloadAction<{ sessionId: string; status: boolean }>) {
      state.sessionAbort[action.payload.sessionId] = action.payload.status
    },
  },
})

export const {
  setWorkspaceSessions,
  setWorkspaceSessionCreating,
  upsertWorkspaceSession,
  removeWorkspaceSession,
  setSelectedWorkspaceSession,
  hydrateSessionMessages,
  setSessionDetailLoading,
  setSessionStatus,
  hydrateSessionDiff,
  setSessionTodos,
  setPendingQuestions,
  setPendingPermissions,
  applyWorkspaceEvent,
  clearSessionEventError,
  bumpQuestionRecord,
  updateSessionAbortStatus,
} = slice.actions

export const chatSessionReducer = slice.reducer
