import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import {
  createBacktest,
  createSessions,
  type ReviewStatus,
  type SessionItem,
  type Stage,
  type Step,
} from "@/components/workbench/data"

type Create = {
  id: string
  title: string
  reqs: string[]
}

export type WorkbenchSession = {
  id: string
  title: string
  workspacePath: string
  session?: unknown
  createdAt: number
  updatedAt: number
}

type State = {
  demo: SessionItem[]
  sessions: WorkbenchSession[]
  active: string
  stage: Stage
}

const initialState: State = {
  demo: createSessions(),
  sessions: [],
  active: "sess-1",
  stage: "session",
}

function find(state: State, id: string) {
  return state.demo.find((item) => item.id === id) ?? state.demo[0]
}

const slice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    setSessions(state, action: PayloadAction<{ sessions: WorkbenchSession[] }>) {
      state.sessions = action.payload.sessions
      if (state.sessions.some((item) => item.id === state.active)) return
      state.active = state.sessions[0]?.id ?? ""
    },
    upsertSession(state, action: PayloadAction<{ session: WorkbenchSession }>) {
      const idx = state.sessions.findIndex((item) => item.id === action.payload.session.id)
      if (idx >= 0) {
        state.sessions[idx] = action.payload.session
        return
      }
      state.sessions.unshift(action.payload.session)
      if (!state.active) {
        state.active = action.payload.session.id
      }
    },
    deleteSession(state, action: PayloadAction<{ id: string }>) {
      state.sessions = state.sessions.filter((item) => item.id !== action.payload.id)
      if (state.active !== action.payload.id) return
      state.active = state.sessions[0]?.id ?? ""
    },
    setStage(state, action: PayloadAction<Stage>) {
      state.stage = action.payload
    },
    setActive(state, action: PayloadAction<string>) {
      state.active = action.payload
    },
    send(state, action: PayloadAction<{ body: string; start: boolean }>) {
      const item = find(state, state.active)
      if (!item) return

      item.messages.push(
        { role: "user", body: action.payload.body },
        {
          role: "ai",
          body: action.payload.start
            ? `已记录审查意见：“${action.payload.body}”。下一轮审查会重点关注这个问题。`
            : `已收到修改意见：“${action.payload.body}”。我会同步更新策略代码与说明。`,
        },
      )
      item.codeContent = `${item.codeContent}\n\n# ${action.payload.body}`
    },
    reviewStart(state, action: PayloadAction<{ id: string; round: number; steps: Step[] }>) {
      const item = find(state, action.payload.id)
      if (!item) return

      item.reviewStatus = "running"
      item.reviewView = "current"
      item.reviewRound = action.payload.round
      item.reviewProgress = action.payload.steps
    },
    reviewStep(state, action: PayloadAction<{ id: string; idx: number; status: Step["status"] }>) {
      const item = find(state, action.payload.id)
      const step = item?.reviewProgress?.[action.payload.idx]
      if (!step) return

      step.status = action.payload.status
    },
    reviewFinish(state, action: PayloadAction<{ id: string; round: number; time: string }>) {
      const item = find(state, action.payload.id)
      if (!item) return

      const steps = item.reviewProgress ?? []
      const status: ReviewStatus = steps.some((entry) => entry.status === "error") ? "failed" : "passed"
      item.reviewStatus = status
      item.reviewView = "current"
      item.reviewProgress = null
      item.reviewHistory.push({
        round: action.payload.round,
        status,
        time: action.payload.time,
        steps,
        suggestions: status === "failed" ? ["优先检查空仓保护", "补充最大回撤保护", "修复边界条件分支"] : [],
      })
    },
    backtestStart(state, action: PayloadAction<string>) {
      const item = find(state, action.payload)
      if (!item) return

      state.stage = "backtest"
      item.backtestStatus = "running"
    },
    backtestFinish(state, action: PayloadAction<{ id: string; time: string }>) {
      const item = find(state, action.payload.id)
      if (!item) return

      const result = createBacktest()
      item.backtestStatus = "done"
      item.backtestResults = result
      item.backtestHistory.unshift({
        time: action.payload.time,
        results: result,
      })
    },
    showBacktest(state, action: PayloadAction<{ id: string; idx: number }>) {
      const item = find(state, action.payload.id)
      const record = item?.backtestHistory[action.payload.idx]
      if (!item || !record) return

      item.backtestResults = record.results
      item.backtestStatus = "done"
      state.stage = "backtest"
    },
    create(state, action: PayloadAction<Create>) {
      const name = action.payload.title.trim() || "新建策略会话"
      const reqs = action.payload.reqs.map((item) => item.trim()).filter(Boolean)
      const item: SessionItem = {
        ...createSessions()[0],
        id: action.payload.id,
        name,
        currentRequirement: reqs[0] ?? "请描述你的策略需求",
        analyzedRequirements: reqs.length ? reqs : ["请描述你的策略需求"],
        messages: [
          {
            role: "ai",
            body: `会话《${name}》已创建。你可以继续补充需求，或直接发起审查。`,
          },
        ],
        reviewStatus: "idle",
        reviewRound: 0,
        reviewView: "current",
        reviewHistory: [],
        reviewProgress: null,
      }

      state.demo.unshift(item)
      state.active = item.id
      state.stage = "session"
    },
    rename(state, action: PayloadAction<{ id: string; name: string }>) {
      const item = find(state, action.payload.id)
      if (!item) return

      item.name = action.payload.name
    },
    remove(state, action: PayloadAction<string>) {
      if (state.demo.length === 1) return

      state.demo = state.demo.filter((item) => item.id !== action.payload)
      if (state.active !== action.payload) return

      state.active = state.demo[0]?.id ?? ""
    },
    view(state) {
      const item = find(state, state.active)
      if (!item) return

      item.reviewView = item.reviewView === "current" ? "history" : "current"
    },
  },
})

export const {
  backtestFinish,
  backtestStart,
  create,
  deleteSession,
  remove,
  rename,
  reviewFinish,
  reviewStart,
  reviewStep,
  send,
  setActive,
  setSessions,
  setStage,
  showBacktest,
  upsertSession,
  view,
} = slice.actions

export const workbenchReducer = slice.reducer
