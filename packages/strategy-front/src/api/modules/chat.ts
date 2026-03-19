import { opencode } from "@/api/opencode";
import type { ChatMessageRecord, ChatPromptBody, ChatSessionSummary } from "@/types/chat";

export const chatApi = {
  listSessions(workspacePath: string) {
    return opencode.get<ChatSessionSummary[]>("/session", {
      params: {
        directory: workspacePath,
        roots: true,
      },
    });
  },

  createSession(workspacePath: string) {
    return opencode.post<ChatSessionSummary>("/session", undefined, {
      params: {
        directory: workspacePath,
      },
    });
  },

  getSessionMessages(workspacePath: string, sessionId: string) {
    return opencode.get<ChatMessageRecord[]>(`/session/${sessionId}/message`, {
      params: {
        directory: workspacePath,
      },
    });
  },

  sendPrompt(workspacePath: string, sessionId: string, body: ChatPromptBody) {
    return opencode.post<boolean, ChatPromptBody>(
      `/session/${sessionId}/prompt_async`,
      body,
      {
        params: {
          directory: workspacePath,
        },
      },
    );
  },

  abortSession(workspacePath: string, sessionId: string) {
    return opencode.post<boolean>(`/session/${sessionId}/abort`, undefined, {
      params: {
        directory: workspacePath,
      },
    });
  },
};
