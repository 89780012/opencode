import { request } from "@/api/client";
import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  LocalWorkspaceResponse,
  WorkspaceFileContentResponse,
  WorkspaceFilesResponse,
} from "@/types/workspace";

export const workspaceApi = {
  getLocalWorkspaces() {
    return request.get<LocalWorkspaceResponse>("/workspace/list");
  },

  createWorkspace(name: string) {
    return request.post<CreateWorkspaceResponse, CreateWorkspaceRequest>(
      "/workspace/create",
      { name },
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
