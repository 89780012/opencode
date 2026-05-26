import type { Config, List, Model, Provider } from "@/types/provider"

export type ComposerModel = Model & {
  provider: Provider
}

export interface ProviderCatalogState {
  providers: List
  config: Config
  connectedModels: ComposerModel[]
  visibleModels: ComposerModel[]
  chainModels: ComposerModel[]
}
