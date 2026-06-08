import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import { type Stage } from "@/components/workbench/data"

export type WorkbenchSession = {
  id: string
  title: string
  workspacePath: string
  session?: unknown
  analysis?: unknown
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

type State = {
  sessions: WorkbenchSession[]
  questions: WorkbenchQuestion[]
  questionPath: string
  requirements: string[]
  active: string
  stage: Stage
}

const initialState: State = {
  sessions: [],
  questions: [],
  questionPath: "",
  requirements: [],
  active: "",
  stage: "session",
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
    setQuestions(state, action: PayloadAction<{ workspacePath: string; questions: WorkbenchQuestion[] }>) {
      state.questionPath = action.payload.workspacePath
      state.questions = action.payload.questions
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
  setActive,
  setQuestions,
  setRequirements,
  setSessions,
  setStage,
  upsertSession,
} = slice.actions

export const workbenchReducer = slice.reducer
