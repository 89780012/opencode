import type { WorkflowRun } from "@/types/workflow"

export type WorkspaceStatus = "idle" | "running" | "waiting" | "done" | "failed" | "interrupted"

export type WorkspaceState = {
  workspace_path: string
  status: WorkspaceStatus
  session_id?: string
  workflow_id?: string
  default_model_provider_id?: string
  default_model_id?: string
  default_variant?: string
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
  default_model_provider_id?: string
  default_model_id?: string
  default_variant?: string
}

export type WorkspaceDispatchInput = {
  workspace_path: string
  input: string
}

export type WorkspaceInterruptInput = {
  workspace_path: string
}
