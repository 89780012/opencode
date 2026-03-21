import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { sameModel } from "@/lib/chat-composer"
import type { ChatModelRef } from "@/types/chat"
import type { ProjectComposerState } from "@/types/composer"

interface State {
  items: Record<string, ProjectComposerState>
  ready: Record<string, boolean>
}

const initialState: State = {
  items: {},
  ready: {},
}

const max = 5

const slice = createSlice({
  name: "projectComposer",
  initialState,
  reducers: {
    hydrateProjectComposer(
      state,
      action: PayloadAction<{ workspace: string; item: ProjectComposerState }>,
    ) {
      state.items[action.payload.workspace] = action.payload.item
      state.ready[action.payload.workspace] = true
    },
    patchProjectComposer(
      state,
      action: PayloadAction<{ workspace: string; item: Partial<ProjectComposerState> }>,
    ) {
      const cur = state.items[action.payload.workspace] ?? {}
      state.items[action.payload.workspace] = {
        ...cur,
        ...action.payload.item,
      }
    },
    pushProjectModel(
      state,
      action: PayloadAction<{ workspace: string; model: ChatModelRef }>,
    ) {
      const cur = state.items[action.payload.workspace] ?? {}
      const recent = [action.payload.model, ...(cur.recent ?? []).filter((item) => !sameModel(item, action.payload.model))]
        .slice(0, max)
      state.items[action.payload.workspace] = {
        ...cur,
        recent,
      }
    },
  },
})

export const { hydrateProjectComposer, patchProjectComposer, pushProjectModel } = slice.actions
export const projectComposerReducer = slice.reducer
