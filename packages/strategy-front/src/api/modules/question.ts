import { request } from "@/api/client"
import { opencode } from "@/api/opencode"
import type { ChatQuestionAnswer, ChatQuestionRequest } from "@/types/chat"
import type { QuestionEntry } from "@/types/question"

export const questionApi = {
  list() {
    return opencode.get<ChatQuestionRequest[]>("/question")
  },

  reply(requestID: string, answers: ChatQuestionAnswer[]) {
    return opencode.post<boolean, { answers: ChatQuestionAnswer[] }>(
      `/question/${encodeURIComponent(requestID)}/reply`,
      { answers },
    )
  },

  reject(requestID: string) {
    return opencode.post<boolean>(`/question/${encodeURIComponent(requestID)}/reject`, undefined)
  },
}

// 保存在question.json文件的内容
export const workspaceQuestionApi = {
  list(workspacePath: string) {
    return request.get<QuestionEntry[]>("/question", {
      params: { workspace_path: workspacePath },
    })
  },

  append(body: Omit<QuestionEntry, "id" | "createdAt">) {
    return request.post<QuestionEntry>("/question", body)
  },
}
