import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import {
  type BacktestResult,
  createBacktest,
  type ReviewRecord,
  type ReviewStatus,
  type Stage,
  type Step,
  type TimelineEvent,
} from "@/components/workbench/data"

export type WorkbenchSession = {
  id: string
  title: string
  workspacePath: string
  session?: unknown
  analysis?: unknown
  createdAt: number
  updatedAt: number
}

export type WorkbenchUI = {
  messages: { role: "ai" | "user"; body: string }[]
  reviewStatus: ReviewStatus
  reviewRound: number
  reviewView: "current" | "history"
  reviewHistory: ReviewRecord[]
  reviewProgress: Step[] | null
  flowchartStatus: "idle" | "generating" | "done"
  flowchartCode: string
  backtestStatus: "idle" | "running" | "done"
  backtestResults: BacktestResult | null
  backtestHistory: { time: string; results: BacktestResult }[]
  timelineEvents: TimelineEvent[]
}

type State = {
  sessions: WorkbenchSession[]
  requirements: string[]
  active: string
  stage: Stage
  ui: Record<string, WorkbenchUI | undefined>
}

const initialState: State = {
  sessions: [],
  requirements: [],
  active: "",
  stage: "session",
  ui: {},
}

function fresh(title = ""): WorkbenchUI {
  return {
    messages: title ? [{ role: "ai", body: `Session "${title}" is ready.` }] : [],
    reviewStatus: "idle",
    reviewRound: 0,
    reviewView: "current",
    reviewHistory: [],
    reviewProgress: null,
    flowchartStatus: "idle",
    flowchartCode: "",
    backtestStatus: "idle",
    backtestResults: null,
    backtestHistory: [],
    timelineEvents: [],
  }
}

function view(state: State, id: string) {
  state.ui[id] ??= fresh(state.sessions.find((item) => item.id === id)?.title)
  return state.ui[id]
}

const slice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    setSessions(state, action: PayloadAction<{ sessions: WorkbenchSession[]; requirements?: string[] }>) {
      state.sessions = action.payload.sessions
      if (action.payload.requirements) {
        state.requirements = action.payload.requirements
      }
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
    setRequirements(state, action: PayloadAction<{ requirements: string[] }>) {
      state.requirements = action.payload.requirements
    },
    deleteSession(state, action: PayloadAction<{ id: string }>) {
      state.sessions = state.sessions.filter((item) => item.id !== action.payload.id)
      delete state.ui[action.payload.id]
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
      const item = view(state, state.active)
      if (!item) return
      item.messages.push(
        { role: "user", body: action.payload.body },
        {
          role: "ai",
          body: action.payload.start
            ? `Review note recorded: ${action.payload.body}`
            : `Change note recorded: ${action.payload.body}`,
        },
      )
    },
    reviewStart(state, action: PayloadAction<{ id: string; round: number; steps: Step[] }>) {
      const item = view(state, action.payload.id)
      if (!item) return
      item.reviewStatus = "running"
      item.reviewView = "current"
      item.reviewRound = action.payload.round
      item.reviewProgress = action.payload.steps
    },
    reviewStep(state, action: PayloadAction<{ id: string; idx: number; status: Step["status"] }>) {
      const step = view(state, action.payload.id)?.reviewProgress?.[action.payload.idx]
      if (!step) return
      step.status = action.payload.status
    },
    reviewFinish(state, action: PayloadAction<{ id: string; round: number; time: string }>) {
      const item = view(state, action.payload.id)
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
        suggestions: status === "failed" ? ["Check empty positions", "Add max drawdown guard", "Fix edge cases"] : [],
      })
    },
    backtestStart(state, action: PayloadAction<string>) {
      const item = view(state, action.payload)
      if (!item) return
      state.stage = "backtest"
      item.backtestStatus = "running"
    },
    backtestFinish(state, action: PayloadAction<{ id: string; time: string }>) {
      const item = view(state, action.payload.id)
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
      const item = view(state, action.payload.id)
      const record = item?.backtestHistory[action.payload.idx]
      if (!item || !record) return
      item.backtestResults = record.results
      item.backtestStatus = "done"
      state.stage = "backtest"
    },
    flipView(state) {
      const item = view(state, state.active)
      if (!item) return
      item.reviewView = item.reviewView === "current" ? "history" : "current"
    },
  },
})

export const {
  backtestFinish,
  backtestStart,
  deleteSession,
  flipView,
  reviewFinish,
  reviewStart,
  reviewStep,
  send,
  setActive,
  setRequirements,
  setSessions,
  setStage,
  showBacktest,
  upsertSession,
} = slice.actions

export const workbenchReducer = slice.reducer
