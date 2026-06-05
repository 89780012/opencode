import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import {
  deleteSession,
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
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

function parseSessionList(value: unknown) {
  if (!obj(value) || !Array.isArray(value.sessions)) return null
  return {
    workspacePath: typeof value.workspacePath === "string" ? value.workspacePath : "",
    sessions: value.sessions.map(parseSession).filter((session): session is WorkbenchSession => !!session),
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
      dispatch(setSessions({ sessions: data.sessions }))
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
      const id = parseID(event.payload)
      if (!id) return
      dispatch(deleteSession({ id }))
    }
    return socket.on("session.deleted", fn)
  }, [dispatch])

  useEffect(() => {
    const fn = () => {
      if (!path) return
      socket.emit("session.list", { workspacePath: path })
    }
    return socket.on("session.created", fn)
  }, [path])
}
