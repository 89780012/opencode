import { useEffect } from "react"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import { setProgress, upsertProgress, type WorkbenchProgressEvent } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function parseEvent(value: unknown): WorkbenchProgressEvent | null {
  if (!obj(value)) return null
  if (typeof value.id !== "string") return null
  if (typeof value.workspacePath !== "string") return null
  if (typeof value.sessionId !== "string") return null
  if (typeof value.kind !== "string") return null
  return {
    id: value.id,
    workspacePath: value.workspacePath,
    sessionId: value.sessionId,
    kind: value.kind,
    state: value.state === "running" || value.state === "error" ? value.state : "done",
    title: typeof value.title === "string" ? value.title : value.kind,
    detail: typeof value.detail === "string" ? value.detail : "",
    source: typeof value.source === "string" ? value.source : "service",
    payload: value.payload,
    createdAt: typeof value.createdAt === "number" ? value.createdAt : 0,
  }
}

function parseList(value: unknown) {
  if (!obj(value)) return null
  if (!Array.isArray(value.events)) return null
  return {
    workspacePath: typeof value.workspacePath === "string" ? value.workspacePath : "",
    sessionId: typeof value.sessionId === "string" ? value.sessionId : "",
    events: value.events.map(parseEvent).filter((item): item is WorkbenchProgressEvent => !!item),
  }
}

export function useWorkbenchProgressSync(path: string, session: string) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const send = () => {
      if (!path || !session) return
      socket.emit("progress.get", { workspacePath: path, sessionId: session })
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [path, session])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseList(event.payload)
      if (!data) return
      if (data.workspacePath && data.workspacePath !== path) return
      if (data.sessionId && data.sessionId !== session) return
      dispatch(
        setProgress({
          workspacePath: data.workspacePath || path,
          sessionId: data.sessionId,
          events: data.events,
        }),
      )
    }
    const off = [socket.on("progress.got", fn), socket.on("progress.listed", fn)]
    return () => off.forEach((item) => item())
  }, [dispatch, path, session])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parseEvent(event.payload)
      if (!data) return
      if (data.workspacePath !== path) return
      if (session && data.sessionId !== session) return
      dispatch(upsertProgress({ workspacePath: data.workspacePath, event: data }))
    }
    return socket.on("progress.updated", fn)
  }, [dispatch, path, session])
}
