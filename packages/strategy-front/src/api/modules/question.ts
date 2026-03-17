import { opencode } from "@/api/opencode";
import type { ChatQuestionAnswer, ChatQuestionRequest } from "@/types/chat";

export const questionApi = {
  list() {
    return opencode.get<ChatQuestionRequest[]>("/question");
  },

  reply(requestID: string, answers: ChatQuestionAnswer[]) {
    return opencode.post<boolean, { answers: ChatQuestionAnswer[] }>(
      `/question/${encodeURIComponent(requestID)}/reply`,
      { answers },
    );
  },

  reject(requestID: string) {
    return opencode.post<boolean>(`/question/${encodeURIComponent(requestID)}/reject`);
  },
};
