import { request } from "@/api/client"
import type {
  AttachWorkspaceRequest,
  AttachWorkspaceResponse,
  WorkspaceFileContentResponse,
  WorkspaceFilesResponse,
} from "@/types/workspace"

export const workspaceApi = {
  attachWorkspace(path: string, type?: "smartx" | "python" | "js" | "other", git?: boolean) {
    return request.post<AttachWorkspaceResponse, AttachWorkspaceRequest>(
      "/workspace/attach",
      { path, type, git },
      {
        timeout: 45000,
      },
    )
  },

  getWorkspaceFiles(workspacePath: string) {
    return request.get<WorkspaceFilesResponse>("/workspace/files", {
      params: {
        workspace_path: workspacePath,
      },
    })
  },

  getWorkspaceFileContent(workspacePath: string, filePath: string) {
    return request.get<WorkspaceFileContentResponse>("/workspace/file-content", {
      params: {
        workspace_path: workspacePath,
        file_path: filePath,
      },
    })
  },

  saveWorkspaceFileContent(workspacePath: string, filePath: string, content: string) {
    return request.put<WorkspaceFileContentResponse, { workspace_path: string; file_path: string; content: string }>(
      "/workspace/file-content",
      {
        workspace_path: workspacePath,
        file_path: filePath,
        content,
      },
    )
  },
}
