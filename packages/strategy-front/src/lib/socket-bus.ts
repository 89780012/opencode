import { apiConfig } from "@/api/config"

export type SocketEvent = {
  id?: string
  type: string
  payload?: unknown
  ts?: number
}

type Fn = (event: SocketEvent) => void
type State = "idle" | "connecting" | "open" | "closed"

const handlers = new Map<string, Set<Fn>>()

let ws: WebSocket | undefined
let timer: number | undefined
let active = false
let tries = 0
let state: State = "idle"

function url() {
  const base = apiConfig.baseURL.endsWith("/") ? `${apiConfig.baseURL}events/ws` : `${apiConfig.baseURL}/events/ws`
  const next = new URL(base, window.location.origin)
  next.protocol = next.protocol === "https:" ? "wss:" : "ws:"
  return next
}

function valid(value: unknown): value is SocketEvent {
  if (!value || typeof value !== "object") return false
  const evt = value as Record<string, unknown>
  return typeof evt.type === "string" && evt.type.trim().length > 0
}

function dispatch(event: SocketEvent) {
  handlers.get(event.type)?.forEach((fn) => fn(event))
  handlers.get("*")?.forEach((fn) => fn(event))
}

function parse(data: string) {
  try {
    const event = JSON.parse(data) as unknown
    if (valid(event)) {
      dispatch(event)
    }
  } catch {
    return
  }
}

function delay() {
  const ms = Math.min(30000, 1000 * 2 ** tries)
  tries += 1
  return ms
}

function schedule() {
  if (!active || typeof window === "undefined") return
  window.clearTimeout(timer)
  timer = window.setTimeout(connect, delay())
}

function connect() {
  if (!active || typeof window === "undefined") return
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

  state = "connecting"
  ws = new WebSocket(url())
  ws.onopen = () => {
    tries = 0
    state = "open"
    dispatch({ type: "socket.open", ts: Date.now() })
  }
  ws.onmessage = (msg) => {
    if (typeof msg.data === "string") {
      parse(msg.data)
    }
  }
  ws.onclose = () => {
    state = active ? "connecting" : "closed"
    dispatch({ type: "socket.close", ts: Date.now() })
    ws = undefined
    schedule()
  }
  ws.onerror = () => {
    dispatch({ type: "socket.error", ts: Date.now() })
  }
}

export const socket = {
  connect() {
    active = true
    connect()
  },
  disconnect() {
    active = false
    window.clearTimeout(timer)
    timer = undefined
    state = "closed"
    ws?.close()
    ws = undefined
  },
  emit(type: string, payload?: unknown) {
    const event: SocketEvent = {
      type,
      payload,
      ts: Date.now(),
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify(event))
    return true
  },
  on(type: string, fn: Fn) {
    const set = handlers.get(type) ?? new Set<Fn>()
    set.add(fn)
    handlers.set(type, set)
    return () => {
      set.delete(fn)
      if (set.size === 0) {
        handlers.delete(type)
      }
    }
  },
  status() {
    return state
  },
}
