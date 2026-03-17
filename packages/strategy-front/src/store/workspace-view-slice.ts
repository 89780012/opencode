import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LocalWorkspace } from "@/types/workspace";

interface WorkspaceViewState {
  selectedWorkspace: LocalWorkspace | null;
  version: number;
}

const initialState: WorkspaceViewState = {
  selectedWorkspace: null,
  version: 0,
};

const workspaceViewSlice = createSlice({
  name: "workspaceView",
  initialState,
  reducers: {
    setSelectedWorkspace(state, action: PayloadAction<LocalWorkspace>) {
      state.selectedWorkspace = action.payload;
      state.version += 1;
    },
    clearSelectedWorkspace(state) {
      state.selectedWorkspace = null;
      state.version += 1;
    },
    refreshSelectedWorkspace(state) {
      state.version += 1;
    },
  },
});

export const { setSelectedWorkspace, clearSelectedWorkspace, refreshSelectedWorkspace } =
  workspaceViewSlice.actions;
export const workspaceViewReducer = workspaceViewSlice.reducer;
