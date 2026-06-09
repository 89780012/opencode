import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { type Stage } from "@/components/workbench/data"

export type WorkbenchSession = {
  id: string
  title: string
  workspacePath: string
  session?: unknown
  analysis?: unknown
  requirements: string[]
  createdAt: number
  updatedAt: number
}

export type WorkbenchQuestion = {
  id: string
  workspacePath: string
  sessionId: string
  messageId: string
  body: string
  createdAt: number
  name?: string
}

export type WorkbenchAnalysis = {
  workspacePath: string
  worktreePath: string
  state: "idle" | "running" | "done"
  items: string[]
  text: string
  updatedAt: number
}

export type WorkbenchFlowchart = {
  workspacePath: string
  worktreePath: string
  state: "idle" | "generating" | "done" | "error"
  code: string
  err: string
  updatedAt: number
}

type State = {
  sessions: WorkbenchSession[]
  sessionPath: string
  questions: WorkbenchQuestion[]
  questionPath: string
  analysis: WorkbenchAnalysis | null
  analysisPath: string
  flowchart: WorkbenchFlowchart | null
  flowchartPath: string
  active: string
  stage: Stage
}

const initialState: State = {
  sessions: [],
  sessionPath: "",
  questions: [],
  questionPath: "",
  analysis: null,
  analysisPath: "",
  flowchart: null,
  flowchartPath: "",
  active: "",
  stage: "session",
}

const slice = createSlice({
  name: "workbench",
  initialState,
  reducers: {
    setSessions(state, action: PayloadAction<{ sessions: WorkbenchSession[]; workspacePath: string }>) {
      state.sessions = action.payload.sessions
      state.sessionPath = action.payload.workspacePath
      if (state.sessions.some((item) => item.id === state.active)) return
      state.active = state.sessions[0]?.id ?? ""
    },
    setQuestions(state, action: PayloadAction<{ workspacePath: string; questions: WorkbenchQuestion[] }>) {
      state.questionPath = action.payload.workspacePath
      state.questions = action.payload.questions
    },
    setAnalysis(state, action: PayloadAction<{ workspacePath: string; analysis: WorkbenchAnalysis | null }>) {
      state.analysisPath = action.payload.workspacePath
      state.analysis = action.payload.analysis
    },
    setFlowchart(state, action: PayloadAction<{ workspacePath: string; flowchart: WorkbenchFlowchart | null }>) {
      state.flowchartPath = action.payload.workspacePath
      state.flowchart = action.payload.flowchart
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
    deleteQuestion(state, action: PayloadAction<{ id: string; sessionId: string }>) {
      state.questions = state.questions.filter(
        (item) => item.id !== action.payload.id || item.sessionId !== action.payload.sessionId,
      )
    },
    setStage(state, action: PayloadAction<Stage>) {
      state.stage = action.payload
    },
    setActive(state, action: PayloadAction<string>) {
      state.active = action.payload
    },
  },
})

export const {
  deleteQuestion,
  deleteSession,
  setAnalysis,
  setActive,
  setFlowchart,
  setQuestions,
  setSessions,
  setStage,
  upsertSession,
} = slice.actions

export const workbenchReducer = slice.reducer
