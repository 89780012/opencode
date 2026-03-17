export interface LocalWorkspace {
  name: string;
  path: string;
  keywords: string[];
}

export interface LocalWorkspaceResponse {
  base_path: string;
  workspaces: LocalWorkspace[];
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface CreateWorkspaceResponse {
  base_path: string;
  workspace: LocalWorkspace;
}

export interface OpenWorkspaceRequest {
  path: string;
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
}
