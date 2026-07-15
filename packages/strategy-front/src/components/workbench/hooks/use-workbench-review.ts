import { useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { socket, type SocketEvent } from "@/lib/socket-bus"
import { useAppDispatch } from "@/store"
import {
  setReviewScope,
  setReviews,
  upsertReview,
  type WorkbenchReview,
  type WorkbenchReviewItem,
} from "@/store/workbench-slice"

let seq = 0

function key() {
  seq += 1
  return `review_${Date.now()}_${seq}`
}

function obj(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object"
}

function item(value: unknown): WorkbenchReviewItem | null {
  if (!obj(value)) return null
  if (typeof value.name !== "string" || !value.name.trim()) return null
  if (typeof value.detail !== "string" || !value.detail.trim()) return null
  if (
    value.status !== "passed" &&
    value.status !== "failed" &&
    value.status !== "warning" &&
    value.status !== "running" &&
    value.status !== "error"
  )
    return null
  return {
    name: value.name,
    status: value.status,
    detail: value.detail,
    suggestion: typeof value.suggestion === "string" ? value.suggestion : "",
  }
}

function aggregate(items: WorkbenchReviewItem[]): WorkbenchReview["state"] {
  if (!items.length) return "error"
  if (items.some((item) => item.status === "error")) return "error"
  if (items.some((item) => item.status === "failed" || item.status === "warning")) return "failed"
  if (items.some((item) => item.status === "running")) return "running"
  if (items.every((item) => item.status === "passed")) return "passed"
  return "error"
}

export function parse(value: unknown): WorkbenchReview | null {
  if (!obj(value)) return null
  if (typeof value.workspacePath !== "string") return null
  const rows = Array.isArray(value.items) ? value.items.map(item) : []
  if (rows.some((item) => !item)) return null
  const items = rows.filter((item): item is WorkbenchReviewItem => !!item)
  const expected = aggregate(items)
  const actual =
    value.state === "running" || value.state === "passed" || value.state === "failed" || value.state === "error"
      ? value.state
      : "error"
  const review = typeof value.reviewId === "string" ? value.reviewId.trim() : ""
  const session = typeof value.sessionId === "string" ? value.sessionId.trim() : ""
  const summary = typeof value.summary === "string" ? value.summary : ""
  return {
    id:
      typeof value.id === "string"
        ? value.id
        : `${value.workspacePath}-${review || (typeof value.updatedAt === "number" ? value.updatedAt : 0)}`,
    workspacePath: value.workspacePath,
    worktreePath: typeof value.worktreePath === "string" ? value.worktreePath : value.workspacePath,
    reviewId: review,
    sessionId: session,
    state: summary.trim() && actual === expected ? actual : "error",
    summary,
    items,
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
  const request = useRef("")

  useEffect(() => {
    request.current = ""
    dispatch(setReviewScope({ workspacePath: path }))
    const send = () => {
      if (!path) return
      const id = key()
      request.current = id
      socket.emit("review.get", { workspacePath: path, worktreePath: path }, id)
    }
    if (socket.ready()) {
      send()
    }
    return socket.on("socket.open", send)
  }, [dispatch, path])

  useEffect(() => {
    const got = (event: SocketEvent) => {
      if (!event.id || event.id !== request.current) return
      const list = Array.isArray(event.payload)
        ? event.payload.map(parse).filter((item): item is WorkbenchReview => !!item)
        : []
      request.current = ""
      dispatch(
        setReviews({
          workspacePath: path,
          reviews: list.filter((item) => item.workspacePath === path && item.worktreePath === path),
        }),
      )
    }
    const updated = (event: SocketEvent) => {
      const data = parse(event.payload)
      if (!data) return
      if (data.workspacePath !== path || data.worktreePath !== path) return
      dispatch(upsertReview({ workspacePath: data.workspacePath, review: data }))
    }
    const off = [socket.on("review.got", got), socket.on("review.updated", updated)]
    return () => off.forEach((item) => item())
  }, [dispatch, path])
}
