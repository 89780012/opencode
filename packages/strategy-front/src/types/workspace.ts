export interface LocalWorkspace {
  name: string;
  path: string;
  type?: "smartx" | "python" | "js";
  template?: string;
  entry_file?: string;
  keywords: string[];
  vcs?: "git";
  updated_at?: number;
}

export interface LocalWorkspaceResponse {
  base_path: string;
  workspaces: LocalWorkspace[];
}

export interface CreateWorkspaceRequest {
  name: string;
  type: "smartx" | "python" | "js";
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
