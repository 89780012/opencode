import { configureStore } from "@reduxjs/toolkit";
import { chatSessionReducer } from "@/store/chat-session-slice";
import { workspaceViewReducer } from "@/store/workspace-view-slice";

export const store = configureStore({
  reducer: {
    chatSession: chatSessionReducer,
    workspaceView: workspaceViewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
