import type { WorkflowRun } from "@/types/workflow"

export type WorkspaceStatus = "idle" | "running" | "blocked" | "done" | "failed" | "interrupted"

export type WorkspaceState = {
  workspace_path: string
  status: WorkspaceStatus
  session_id?: string
  workflow_id?: string
  model_provider_id?: string
  model_id?: string
  variant?: string
  run_id?: string
  updated_at: number
}

export type WorkspaceSnapshot = {
  state: WorkspaceState
  run?: WorkflowRun
}

export type WorkspaceBindInput = {
  workspace_path: string
  workflow_id: string
  model_provider_id?: string
  model_id?: string
  variant?: string
}

export type WorkspaceDispatchInput = {
  workspace_path: string
  input: string
}

export type WorkspaceContinueInput = {
  workspace_path: string
}

export type WorkspaceInterruptInput = {
  workspace_path: string
}
