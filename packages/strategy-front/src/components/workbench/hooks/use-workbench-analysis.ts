import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import { setAnalysis, type WorkbenchAnalysis } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function clean(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/, "")
    .replace(/[`*_#>|[\]]/g, "")
    .trim()
}

function list(value: unknown, text: string) {
  const arr = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  if (arr.length) return arr.map(clean).filter(Boolean)
  const raw = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/g, "").trim()
  try {
    const data: unknown = JSON.parse(raw)
    if (Array.isArray(data)) return data.map((item) => (typeof item === "string" ? clean(item) : "")).filter(Boolean)
  } catch {
    return []
  }
  return []
}

function parse(value: unknown): WorkbenchAnalysis | null {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string") return null
  if (value.state !== "running" && value.state !== "done") return null
  const text = typeof value.text === "string" ? value.text : ""
  return {
    workspacePath: value.workspacePath,
    worktreePath: typeof value.worktreePath === "string" ? value.worktreePath : value.workspacePath,
    state: value.state,
    items: list(value.items, text),
    text,
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

export function useWorkbenchAnalysisSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    dispatch(setAnalysis({ workspacePath: path, analysis: null }))
    const send = () => {
      if (!path) return
      socket.emit("analysis.get", { workspacePath: path, worktreePath: path })
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
      dispatch(setAnalysis({ workspacePath: data.workspacePath, analysis: data }))
    }
    const off = [socket.on("analysis.got", fn), socket.on("analysis.updated", fn)]
    return () => off.forEach((item) => item())
  }, [dispatch, path])
}
