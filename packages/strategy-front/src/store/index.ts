import { configureStore } from "@reduxjs/toolkit";
import { chatSessionReducer } from "@/store/chat-session-slice";

export const store = configureStore({
  reducer: {
    chatSession: chatSessionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
