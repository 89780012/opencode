import type { Agent } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { Config, List, Model, Provider } from "@/types/provider"

export type ComposerModel = Model & {
  provider: Provider
}

export interface ComposerPrefs {
  agent?: string
  model?: ChatModelRef
  variant?: string | null
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
