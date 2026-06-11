import { modelChainApi } from "@/api/modules/model-chain"
import { opencode } from "@/api/opencode"
import type { ChatFileDiff, ChatMessageRecord, ChatPromptBody, ChatSessionSummary, ChatStatus, ChatTodo } from "@/types/chat"

export const chatApi = {
  listSessions(workspacePath: string) {
    return opencode.get<ChatSessionSummary[]>("/session", {
      params: {
        directory: workspacePath,
        roots: true,
      },
    })
  },

  createSession(workspacePath: string) {
    return opencode.post<ChatSessionSummary>("/session", undefined, {
      params: {
        directory: workspacePath,
      },
    })
  },

  getSessionStatus(workspacePath: string) {
    return opencode.get<Record<string, ChatStatus>>("/session/status", {
      params: {
        directory: workspacePath,
      },
    })
  },

  getSessionMessages(workspacePath: string, sessionId: string) {
    return opencode.get<ChatMessageRecord[]>(`/session/${sessionId}/message`, {
      params: {
        directory: workspacePath,
      },
    })
  },

  getSessionTodos(workspacePath: string, sessionId: string) {
    return opencode.get<ChatTodo[]>(`/session/${sessionId}/todo`, {
      params: {
        directory: workspacePath,
      },
    })
  },

  getSessionDiff(sessionId: string, messageId?: string) {
    return opencode.get<ChatFileDiff[]>(`/session/${sessionId}/diff`, {
      params: {
        messageID: messageId,
      },
    })
  },

  sendPrompt(workspacePath: string, sessionId: string, body: ChatPromptBody) {
    return modelChainApi.sendPrompt({
      ...body,
      workspacePath,
      sessionId,
    })
  },

  abortSession(workspacePath: string, sessionId: string) {
    return opencode.post<boolean>(`/session/${sessionId}/abort`, undefined, {
      params: {
        directory: workspacePath,
      },
    })
  },
}
