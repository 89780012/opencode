export interface LocalWorkspace {
  id?: string;
  name: string;
  path: string;
  type?: "smartx" | "python" | "js" | "other";
  template?: string;
  entry_file?: string;
  keywords: string[];
  vcs?: "git";
  source?: "default_plugin" | "user_created" | "imported";
  managed?: boolean;
  missing?: boolean;
  updated_at?: number;
}

export interface LocalWorkspaceResponse {
  base_path: string;
  workspaces: LocalWorkspace[];
}

export interface CreateWorkspaceRequest {
  name: string;
  type: "smartx" | "python" | "js" | "other";
  template: string;
  git?: boolean;
}

export interface CreateWorkspaceResponse {
  base_path: string;
  workspace: LocalWorkspace;
}

export interface OpenWorkspaceRequest {
  path: string;
  git?: boolean;
}

export interface ImportWorkspaceRequest {
  path: string;
  type?: "smartx" | "python" | "js" | "other";
  git?: boolean;
}

export interface OpenWorkspaceResponse {
  base_path: string;
  workspace: LocalWorkspace;
}

export interface WorkspaceFile {
  path: string;
}

export interface WorkspaceFilesResponse {
  workspace_path: string;
  files: WorkspaceFile[];
  total_files: number;
}

export interface WorkspaceFileContentResponse {
  workspace_path: string;
  path: string;
  content: string;
  size: number;
  previewable: boolean;
  binary: boolean;
  truncated: boolean;
  reason?: string;
}
