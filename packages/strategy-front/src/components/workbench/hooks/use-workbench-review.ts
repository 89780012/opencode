import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import { setReview, type WorkbenchReview, type WorkbenchReviewItem } from "@/store/workbench-slice"

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function item(value: unknown): WorkbenchReviewItem | null {
  if (!obj(value)) return null
  if (typeof value.name !== "string") return null
  if (typeof value.detail !== "string") return null
  const status =
    value.status === "passed" ||
    value.status === "failed" ||
    value.status === "warning" ||
    value.status === "running" ||
    value.status === "error"
      ? value.status
      : "passed"
  return {
    name: value.name,
    status,
    detail: value.detail,
    suggestion: typeof value.suggestion === "string" ? value.suggestion : "",
  }
}

function parse(value: unknown): WorkbenchReview | null {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string") return null
  const state =
    value.state === "running" ||
    value.state === "passed" ||
    value.state === "failed" ||
    value.state === "error"
      ? value.state
      : "idle"
  return {
    workspacePath: value.workspacePath,
    worktreePath: typeof value.worktreePath === "string" ? value.worktreePath : value.workspacePath,
    state,
    summary: typeof value.summary === "string" ? value.summary : "",
    items: Array.isArray(value.items) ? value.items.map(item).filter((row): row is WorkbenchReviewItem => !!row) : [],
    suggestions: Array.isArray(value.suggestions)
      ? value.suggestions.filter((row): row is string => typeof row === "string")
      : [],
    updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
  }
}

export function useWorkbenchReviewSync() {
  const dispatch = useAppDispatch()
  const [search] = useSearchParams()
  const path = search.get("path")?.trim() ?? ""

  useEffect(() => {
    dispatch(setReview({ workspacePath: path, review: null }))
    const send = () => {
      if (!path) return
      socket.emit("review.get", { workspacePath: path, worktreePath: path })
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
      dispatch(setReview({ workspacePath: data.workspacePath, review: data }))
    }
    const off = [socket.on("review.got", fn), socket.on("review.updated", fn)]
    return () => off.forEach((item) => item())
  }, [dispatch, path])
}
