import type { WorkspaceSnapshot, WorkspaceStatus } from "@/types/workspace-chat"

export function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message
  if (typeof err === "string" && err) return err
  return fallback
}

export function phase(box?: WorkspaceSnapshot | null): WorkspaceStatus {
  return box?.state.status || "idle"
}

export function busy(box?: WorkspaceSnapshot | null, sid?: string | null) {
  if (!sid) return false
  if (box?.state.session_id !== sid) return false
  const cur = phase(box)
  return cur === "running" || cur === "waiting"
}
