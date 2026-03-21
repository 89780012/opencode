import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { applyChatEvent, hydrateChat, hydratePermissions, hydrateQuestions, removeSession, upsertSession, type ChatStateShape } from "@/lib/chat-event-reducer";
import type { ChatEvent, ChatMessageRecord, ChatQuestionRequest, ChatSessionSummary, ChatStatus, ChatTodo, PermissionRequest } from "@/types/chat";

type State = ChatStateShape;

const initialState: State = {
  sessions: {},
  selected: {},
  messages: {},
  parts: {},
  todos: {},
  permissions: {},
  questions: {},
  status: {},
  messageErrs: {},
  eventErrs: {},
};

const slice = createSlice({
  name: "chatSession",
  initialState,
  reducers: {
    setWorkspaceSessions(
      state,
      action: PayloadAction<{ workspace: string; sessions: ChatSessionSummary[] }>,
    ) {
      state.sessions[action.payload.workspace] = [...action.payload.sessions].sort(
        (a, b) => b.time.updated - a.time.updated,
      );
      const id = state.selected[action.payload.workspace];
      if (!id) {
        return;
      }
      const ok = action.payload.sessions.some((item) => item.id === id);
      if (ok) {
        return;
      }
      state.selected[action.payload.workspace] = null;
    },
    upsertWorkspaceSession(
      state,
      action: PayloadAction<{ workspace: string; session: ChatSessionSummary }>,
    ) {
      upsertSession(state, action.payload.workspace, action.payload.session);
    },
    removeWorkspaceSession(
      state,
      action: PayloadAction<{ workspace: string; session: ChatSessionSummary }>,
    ) {
      removeSession(state, action.payload.workspace, action.payload.session);
    },
    setSelectedWorkspaceSession(
      state,
      action: PayloadAction<{ workspace: string; sessionId: string | null }>,
    ) {
      state.selected[action.payload.workspace] = action.payload.sessionId;
      if (!action.payload.sessionId) {
        return;
      }
      delete state.eventErrs[action.payload.sessionId];
    },
    hydrateSessionMessages(
      state,
      action: PayloadAction<{ sessionId: string; records: ChatMessageRecord[] }>,
    ) {
      hydrateChat(state, action.payload.sessionId, action.payload.records);
    },
    setSessionTodos(
      state,
      action: PayloadAction<{ sessionId: string; todos: ChatTodo[] }>,
    ) {
      state.todos[action.payload.sessionId] = action.payload.todos;
    },
    setPendingQuestions(
      state,
      action: PayloadAction<{ items: ChatQuestionRequest[] }>,
    ) {
      hydrateQuestions(state, action.payload.items);
    },
    setPendingPermissions(
      state,
      action: PayloadAction<{ items: PermissionRequest[] }>,
    ) {
      hydratePermissions(state, action.payload.items);
    },
    applyWorkspaceEvent(
      state,
      action: PayloadAction<{ workspace: string; event: ChatEvent }>,
    ) {
      applyChatEvent(state, action.payload.workspace, action.payload.event);
    },
    setSessionStatus(
      state,
      action: PayloadAction<{ sessionId: string; status: ChatStatus }>,
    ) {
      state.status[action.payload.sessionId] = action.payload.status;
    },
    clearSessionEventError(
      state,
      action: PayloadAction<{ sessionId: string }>,
    ) {
      delete state.eventErrs[action.payload.sessionId];
    },
  },
});

export const {
  setWorkspaceSessions,
  upsertWorkspaceSession,
  removeWorkspaceSession,
  setSelectedWorkspaceSession,
  hydrateSessionMessages,
  setSessionTodos,
  setPendingQuestions,
  setPendingPermissions,
  applyWorkspaceEvent,
  setSessionStatus,
  clearSessionEventError,
} = slice.actions;

export const chatSessionReducer = slice.reducer;
