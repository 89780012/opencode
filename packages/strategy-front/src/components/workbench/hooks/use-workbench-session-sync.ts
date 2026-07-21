import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { chatApi } from "@/api/modules"
import { ownsSession } from "@/lib/session-create"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import { setSelectedWorkspaceSession, setSessionStatus } from "@/store/chat-session-slice"
import {
  deleteSession,
  setActive,
  setRequirements,
  setSessions,
  upsertSession,
  type WorkbenchSession,
} from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function parseSession(value: unknown): WorkbenchSession | null {
  if (!obj(value)) return null
  if (typeof value.id !== "string") return null
  if (typeof value.title !== "string") return null
  if (typeof value.workspacePath !== "string") return null
  return {
    id: value.id,
    title: value.title,
    workspacePath: value.workspacePath,
    session: value.session,
    analysis: value.analysis,
    requirements: Array.isArray(value.requirements)
      ? value.requirements.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

function parseSessionList(value: unknown) {
  if (!obj(value)) return null
  if (value.sessions !== null && !Array.isArray(value.sessions)) return null
  return {
    workspacePath: typeof value.workspacePath === "string" ? value.workspacePath : "",
    sessions: (value.sessions ?? []).map(parseSession).filter((session): session is WorkbenchSession => !!session),
  }
}

function parseSessionResult(value: unknown) {
  if (!obj(value)) return null
  return parseSession(value.session)
}

function parseID(value: unknown) {
  if (!obj(value)) return ""
  return typeof value.id === "string" ? value.id : ""
}

function parseCreated(value: unknown) {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string") return null
  if (!obj(value.session)) return null
  if (typeof value.session.id !== "string") return null
  return {
    workspacePath: value.workspacePath,
    id: value.session.id,
  }
}

export function parseRequirements(value: unknown) {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string" || typeof value.sessionId !== "string") return null
  if (!Array.isArray(value.requirements)) return null
  if (!value.requirements.every((item) => typeof item === "string")) return null
  return {
    workspacePath: value.workspacePath,
    sessionId: value.sessionId,
    requirements: value.requirements as string[],
  }
}

export function useWorkbenchSessionSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    const send = () => {
      if (!path) return
      socket.emit("session.list", { workspacePath: path })
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseSessionList(event.payload)
      if (!data) return
      if (data.workspacePath && data.workspacePath !== path) return
      dispatch(
        setSessions({
          sessions: data.sessions,
          workspacePath: data.workspacePath || path,
        }),
      )
      const dir = data.workspacePath || path
      if (!dir) return
      void chatApi.getSessionStatus(dir).then((status) => {
        dispatch(setSessionStatus({ sessions: data.sessions.map((item) => item.id), status }))
      })
    }
    return socket.on("session.listed", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const session = parseSessionResult(event.payload)
      if (!session) return
      if (session.workspacePath !== path) return
      dispatch(upsertSession({ session }))
    }
    return socket.on("session.updated", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseRequirements(event.payload)
      if (!data || data.workspacePath !== path) return
      dispatch(setRequirements(data))
      socket.emit("session.list", { workspacePath: path })
    }
    return socket.on("requirements.updated", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const id = parseID(event.payload)
      if (!id) return
      dispatch(deleteSession({ id }))
      // 刷新列表
      socket.emit("session.list", { workspacePath: path })
    }
    return socket.on("session.deleted", fn)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      if (!path) return
      const data = parseCreated(event.payload)
      if (data && data.workspacePath === path && ownsSession(event.id, path)) {
        dispatch(setActive(data.id))
        dispatch(setSelectedWorkspaceSession({ workspace: path, sessionId: data.id }))
      }
      socket.emit("session.list", { workspacePath: path })
    }
    return socket.on("session.created", fn)
  }, [dispatch, path])
}
