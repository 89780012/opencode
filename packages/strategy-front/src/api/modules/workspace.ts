import { request } from "@/api/client";
import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  LocalWorkspaceResponse,
  OpenWorkspaceRequest,
  OpenWorkspaceResponse,
  WorkspaceFileContentResponse,
  WorkspaceFilesResponse,
} from "@/types/workspace";

export const workspaceApi = {
  getLocalWorkspaces() {
    return request.get<LocalWorkspaceResponse>("/workspace/list");
  },

  createWorkspace(name: string, git?: boolean) {
    return request.post<CreateWorkspaceResponse, CreateWorkspaceRequest>(
      "/workspace/create",
      { name, git },
    );
  },

  openWorkspace(path: string, git?: boolean) {
    return request.post<OpenWorkspaceResponse, OpenWorkspaceRequest>(
      "/workspace/open",
      { path, git },
    );
  },

  getWorkspaceFiles(workspacePath: string) {
    return request.get<WorkspaceFilesResponse>("/workspace/files", {
      params: {
        workspace_path: workspacePath,
      },
    });
  },

  getWorkspaceFileContent(workspacePath: string, filePath: string) {
    return request.get<WorkspaceFileContentResponse>("/workspace/file-content", {
      params: {
        workspace_path: workspacePath,
        file_path: filePath,
      },
    });
  },
};
