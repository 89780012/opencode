import type { Agent, ComposerState } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { Config, List, Model, Provider } from "@/types/provider"

export type ComposerModel = Model & {
  provider: Provider
}

export type ProjectComposerState = ComposerState & {
  recent?: ChatModelRef[]
}

export interface ProviderCatalogState {
  providers: List
  config: Config
  connectedModels: ComposerModel[]
  visibleModels: ComposerModel[]
}

export interface ComposerResolved {
  agent?: Agent
  model?: ChatModelRef
  variant?: string
  modelEntry?: ComposerModel
  variants: string[]
}
