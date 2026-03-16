import { configureStore } from "@reduxjs/toolkit";
import { workspaceViewReducer } from "@/store/workspace-view-slice";

export const store = configureStore({
  reducer: {
    workspaceView: workspaceViewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
