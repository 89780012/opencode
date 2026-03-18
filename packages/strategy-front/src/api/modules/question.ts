import { opencode } from "@/api/opencode";
import type { ChatQuestionAnswer, ChatQuestionRequest } from "@/types/chat";

export const questionApi = {
  list(directory: string) {
    return opencode.get<ChatQuestionRequest[]>("/question", {
      params: {
        directory,
      },
    });
  },

  reply(directory: string, requestID: string, answers: ChatQuestionAnswer[]) {
    return opencode.post<boolean, { answers: ChatQuestionAnswer[] }>(
      `/question/${encodeURIComponent(requestID)}/reply`,
      { answers },
      {
        params: {
          directory,
        },
      },
    );
  },

  reject(directory: string, requestID: string) {
    return opencode.post<boolean>(`/question/${encodeURIComponent(requestID)}/reject`, undefined, {
      params: {
        directory,
      },
    });
  },
};
