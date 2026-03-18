import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LocalWorkspace } from "@/types/workspace";

interface WorkspaceViewState {
  selectedWorkspace: LocalWorkspace | null;
}

const initialState: WorkspaceViewState = {
  selectedWorkspace: null,
};

const same = (a: LocalWorkspace | null, b: LocalWorkspace) => {
  if (!a) {
    return false
  }
  if (a.path !== b.path || a.name !== b.name) {
    return false
  }
  if (a.keywords.length !== b.keywords.length) {
    return false
  }
  return a.keywords.every((item, i) => item === b.keywords[i])
}

const workspaceViewSlice = createSlice({
  name: "workspaceView",
  initialState,
  reducers: {
    setSelectedWorkspace(state, action: PayloadAction<LocalWorkspace>) {
      if (same(state.selectedWorkspace, action.payload)) {
        return
      }
      state.selectedWorkspace = action.payload;
    },
    clearSelectedWorkspace(state) {
      if (!state.selectedWorkspace) {
        return
      }
      state.selectedWorkspace = null;
    },
  },
});

export const { setSelectedWorkspace, clearSelectedWorkspace } = workspaceViewSlice.actions;
export const workspaceViewReducer = workspaceViewSlice.reducer;
