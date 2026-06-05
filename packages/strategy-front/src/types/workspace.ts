export interface LocalWorkspace {
  id?: string
  name: string
  path: string
  type?: "smartx" | "python" | "js" | "other"
  template?: string
  entry_file?: string
  keywords: string[]
  source?: "default_plugin" | "user_created" | "imported" | "external"
  managed?: boolean
  missing?: boolean
  updated_at?: number
}

export interface AttachWorkspaceRequest {
  path: string
  type?: "smartx" | "python" | "js" | "other"
  git?: boolean
}

export interface AttachWorkspaceGitState {
  repo: boolean
  initialized: boolean
  available: boolean
}

export interface AttachWorkspaceRuntimeState {
  opencode_ready: boolean
}

export interface AttachWorkspaceResponse {
  workspace: LocalWorkspace
  git: AttachWorkspaceGitState
  runtime: AttachWorkspaceRuntimeState
}

export interface WorkspaceFile {
  path: string
}

export interface WorkspaceFilesResponse {
  workspace_path: string
  files: WorkspaceFile[]
  total_files: number
}

export interface WorkspaceFileContentResponse {
  workspace_path: string
  path: string
  content: string
  size: number
  previewable: boolean
  binary: boolean
  truncated: boolean
  reason?: string
}
