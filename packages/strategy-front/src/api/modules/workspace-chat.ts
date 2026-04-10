import { request } from "@/api/client"
import type {
  WorkspaceBindInput,
  WorkspaceDispatchInput,
  WorkspaceInterruptInput,
  WorkspaceSnapshot,
} from "@/types/workspace-chat"

export const workspaceChatApi = {
  getState(workspacePath: string) {
    return request.get<WorkspaceSnapshot>("/workspace/chat-state", {
      params: {
        workspace_path: workspacePath,
      },
    })
  },

  bind(body: WorkspaceBindInput) {
    return request.post<WorkspaceSnapshot, WorkspaceBindInput>("/workspace/chat-state/bind", body)
  },

  dispatch(body: WorkspaceDispatchInput) {
    return request.post<WorkspaceSnapshot, WorkspaceDispatchInput>("/workspace/chat-state/dispatch", body)
  },

  interrupt(body: WorkspaceInterruptInput) {
    return request.post<WorkspaceSnapshot, WorkspaceInterruptInput>("/workspace/chat-state/interrupt", body)
  },
}
