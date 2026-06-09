import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import { setFlowchart, type WorkbenchFlowchart } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function parse(value: unknown): WorkbenchFlowchart | null {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string") return null
  const state =
    value.state === "generating" || value.state === "done" || value.state === "error" ? value.state : "done"
  return {
    workspacePath: value.workspacePath,
    worktreePath: typeof value.worktreePath === "string" ? value.worktreePath : value.workspacePath,
    state,
    code: typeof value.code === "string" ? value.code : "",
    err: typeof value.err === "string" ? value.err : "",
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

export function useWorkbenchFlowchartSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    dispatch(setFlowchart({ workspacePath: path, flowchart: null }))
    const send = () => {
      if (!path) return
      socket.emit("flowchart.get", { workspacePath: path, worktreePath: path })
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [dispatch, path])

  useEffect(() => {
    const fn = (event: SocketEvent) => {
      const data = parse(event.payload)
      if (!data) return
      if (data.workspacePath !== path) return
      dispatch(setFlowchart({ workspacePath: data.workspacePath, flowchart: data }))
    }
    const off = [socket.on("flowchart.got", fn), socket.on("flowchart.updated", fn)]
    return () => off.forEach((item) => item())
  }, [dispatch, path])
}
