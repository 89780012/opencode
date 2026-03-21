import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { sameModel } from "@/lib/chat-composer"
import type { ChatModelRef } from "@/types/chat"
import type { ProjectComposerState } from "@/types/composer"

interface State {
  // 所有工作区共用的一份 composer 偏好。
  item: ProjectComposerState
  // 用来避免 localStorage 回填前，先把初始空状态写回去。
  ready: boolean
}

const initialState: State = {
  item: {},
  ready: false,
}

const max = 5

const slice = createSlice({
  name: "projectComposer",
  initialState,
  reducers: {
    // 首次进入页面时，用持久化存下来的配置整体回填当前 composer 状态。
    hydrateProjectComposer(state, action: PayloadAction<ProjectComposerState>) {
      state.item = action.payload
      state.ready = true
    },
    // 用户修改 agent、model、variant 时，只局部更新对应字段，其他字段保持不变。
    patchProjectComposer(state, action: PayloadAction<Partial<ProjectComposerState>>) {
      state.item = {
        ...state.item,
        ...action.payload,
      }
    },
    // 记录最近选过的模型，给后续回退逻辑使用。
    pushProjectModel(state, action: PayloadAction<ChatModelRef>) {
      // 按最近使用顺序记录模型，后续 resolveComposer 可以回退到最近仍然可用的模型。
      const recent = [action.payload, ...(state.item.recent ?? []).filter((item) => !sameModel(item, action.payload))]
        .slice(0, max)
      state.item = {
        ...state.item,
        recent,
      }
    },
  },
})

export const { hydrateProjectComposer, patchProjectComposer, pushProjectModel } = slice.actions
export const projectComposerReducer = slice.reducer
