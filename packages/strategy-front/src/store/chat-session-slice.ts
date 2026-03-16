import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { ChatSessionSummary } from "@/types/chat";

interface ChatSessionState {
  sessions: ChatSessionSummary[];
  selectedSessionId: string | null;
  streamingSessionIds: string[];
}

const sortSessions = (sessions: ChatSessionSummary[]) =>
  [...sessions].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );

const initialState: ChatSessionState = {
  sessions: [],
  selectedSessionId: null,
  streamingSessionIds: [],
};

const chatSessionSlice = createSlice({
  name: "chatSession",
  initialState,
  reducers: {
    setChatSessions(state, action: PayloadAction<ChatSessionSummary[]>) {
      state.sessions = sortSessions(action.payload);
    },
    upsertChatSession(state, action: PayloadAction<ChatSessionSummary>) {
      const index = state.sessions.findIndex(
        (session) => session.id === action.payload.id,
      );
      if (index === -1) {
        state.sessions.unshift(action.payload);
      } else {
        state.sessions[index] = action.payload;
      }
      state.sessions = sortSessions(state.sessions);
    },
    setSelectedChatSession(state, action: PayloadAction<string | null>) {
      state.selectedSessionId = action.payload;
    },
    setChatSessionStreaming(
      state,
      action: PayloadAction<{ sessionId: string; isStreaming: boolean }>,
    ) {
      const { sessionId, isStreaming } = action.payload;

      if (isStreaming) {
        if (!state.streamingSessionIds.includes(sessionId)) {
          state.streamingSessionIds.push(sessionId);
        }
        return;
      }

      state.streamingSessionIds = state.streamingSessionIds.filter(
        (id) => id !== sessionId,
      );
    },
  },
});

export const {
  setChatSessions,
  upsertChatSession,
  setSelectedChatSession,
  setChatSessionStreaming,
} = chatSessionSlice.actions;
export const chatSessionReducer = chatSessionSlice.reducer;
