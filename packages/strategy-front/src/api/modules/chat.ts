import { modelChainApi } from "@/api/modules/model-chain"
import { opencode } from "@/api/opencode"
import { workspaceQuestionApi } from "@/api/modules/question"
import { store } from "@/store"
import { bumpQuestionRecord } from "@/store/chat-session-slice"
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
    const text = body.parts.find((p) => p.type === "text")?.text

    const promise = modelChainApi.sendPrompt({
      ...body,
      workspacePath,
      sessionId,
    })

    // fire-and-forget: 用户问题本地留存一份，不阻塞主流程
    promise
      .then(() => {
        if (!text) return
        void workspaceQuestionApi
          .append({
            workspacePath,
            sessionId,
            messageId: body.messageID ?? "",
            text,
          })
          .then(() => {
            store.dispatch(bumpQuestionRecord())
          })
          .catch(() => {})
      })
      .catch(() => {})

    return promise
  },

  abortSession(workspacePath: string, sessionId: string) {
    return opencode.post<boolean>(`/session/${sessionId}/abort`, undefined, {
      params: {
        directory: workspacePath,
      },
    })
  },
}
