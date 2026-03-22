import { opencode } from "@/api/opencode"
import type { ChatFileDiff, ChatMessageRecord, ChatPromptBody, ChatSessionSummary, ChatTodo } from "@/types/chat"

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
    return opencode.post<boolean, ChatPromptBody>(`/session/${sessionId}/prompt_async`, body, {
      params: {
        directory: workspacePath,
      },
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
