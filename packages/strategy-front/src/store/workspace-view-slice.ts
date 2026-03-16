import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LocalWorkspace } from "@/types/workspace";

interface WorkspaceViewState {
  selectedWorkspace: LocalWorkspace | null;
}

const initialState: WorkspaceViewState = {
  selectedWorkspace: null,
};

const workspaceViewSlice = createSlice({
  name: "workspaceView",
  initialState,
  reducers: {
    setSelectedWorkspace(state, action: PayloadAction<LocalWorkspace>) {
      state.selectedWorkspace = action.payload;
    },
    clearSelectedWorkspace(state) {
      state.selectedWorkspace = null;
    },
  },
});

export const { setSelectedWorkspace, clearSelectedWorkspace } =
  workspaceViewSlice.actions;
export const workspaceViewReducer = workspaceViewSlice.reducer;
