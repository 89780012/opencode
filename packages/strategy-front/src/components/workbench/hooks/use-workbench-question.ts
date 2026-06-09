import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { selectWorkbenchQuestions, useAppDispatch, useAppSelector } from "@/store"
import { deleteQuestion, setActive, setQuestions, type WorkbenchQuestion } from "@/store/workbench-slice"

export type { WorkbenchQuestion } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function parseQuestion(value: unknown): WorkbenchQuestion | null {
  if (!obj(value)) return null
  if (typeof value.id !== "string") return null
  if (typeof value.workspacePath !== "string") return null
  if (typeof value.sessionId !== "string") return null
  if (typeof value.body !== "string") return null
  return {
    id: value.id,
    workspacePath: value.workspacePath,
    sessionId: value.sessionId,
    messageId: typeof value.messageId === "string" ? value.messageId : "",
    body: value.body,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    name: typeof value.name === "string" ? value.name : undefined,
  }
}

function parseList(value: unknown) {
  if (!obj(value) || !Array.isArray(value.questions)) return null
  return {
    workspacePath: typeof value.workspacePath === "string" ? value.workspacePath : "",
    questions: value.questions.map(parseQuestion).filter((question): question is WorkbenchQuestion => !!question),
  }
}

function parseDelete(value: unknown) {
  if (!obj(value)) return null
  if (typeof value.id !== "string") return null
  if (typeof value.sessionId !== "string") return null
  return {
    id: value.id,
    sessionId: value.sessionId,
  }
}

export function useWorkbenchQuestionSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    const send = () => {
      if (!path) return
      socket.emit("question.list", { workspacePath: path })
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseList(event.payload)
      if (!data) return
      if (data.workspacePath && data.workspacePath !== path) return
      dispatch(setQuestions({ workspacePath: data.workspacePath || path, questions: data.questions }))
    }
    return socket.on("question.listed", fn)
  }, [dispatch, path])

  useEffect(() => {
    const refresh = () => {
      if (!path) return
      socket.emit("question.list", { workspacePath: path })
    }
    const off = [socket.on("question.appended", refresh), socket.on("session.updated", refresh)]
    return () => off.forEach((fn) => fn())
  }, [path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseDelete(event.payload)
      if (!data) return
      dispatch(deleteQuestion(data))
    }
    return socket.on("question.deleted", fn)
  }, [dispatch])
}

export function useWorkbenchQuestion() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""
  const questions = useAppSelector((state) => selectWorkbenchQuestions(state, path))

  return {
    questions,
    select: (id: string) => dispatch(setActive(id)),
    remove: (question: WorkbenchQuestion) =>
      socket.emit("question.delete", {
        id: question.id,
        sessionId: question.sessionId,
      }),
  }
}
