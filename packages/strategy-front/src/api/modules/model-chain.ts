import { request } from "@/api/client"
import type { ChatModelRef, ChatPromptBody } from "@/types/chat"

export interface ModelChainConfig {
  chain: ChatModelRef[]
  updatedAt: number
}

export type ModelChainPrompt = ChatPromptBody & {
  workspacePath: string //工作区
  sessionId: string //会话ID
}

export const modelChainApi = {
  get() {
    return request.get<ModelChainConfig>("/model-chain")
  },

  save(body: Partial<ModelChainConfig>) {
    return request.put<ModelChainConfig, Partial<ModelChainConfig>>("/model-chain", body)
  },

  sendPrompt(body: ModelChainPrompt) {
    return request.post<boolean, ModelChainPrompt>(`/model-chain/session/${body.sessionId}/prompt`, body)
  },
}
