import { socket } from "./socket-bus"

let seq = 0
const requests = new Map<string, string>()

export function createSession(path: string, payload: Record<string, unknown>) {
  const id = `session_${Date.now()}_${++seq}`
  if (!socket.emit("session.create", payload, id)) return ""
  requests.set(id, path)
  globalThis.setTimeout(() => requests.delete(id), 5 * 60 * 1000)
  return id
}

export function ownsSession(id: string | undefined, path: string) {
  return !!id && requests.get(id) === path
}

export function clearSession(id: string | undefined) {
  if (id) requests.delete(id)
}
