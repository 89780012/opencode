import type { Agent } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { ComposerResolved, ProjectComposerState, ProviderCatalogState } from "@/types/composer"

function valid(model: ChatModelRef | undefined, models: ProviderCatalogState["connectedModels"]) {
  if (!model) return false
  return models.some((item) => sameModel(model, { providerID: item.provider.id, modelID: item.id }))
}

function configModel(config: ProviderCatalogState["config"], models: ProviderCatalogState["connectedModels"]) {
  if (!config.model) return
  const [providerID, ...rest] = config.model.split("/")
  const model = { providerID, modelID: rest.join("/") }
  if (!valid(model, models)) return
  return model
}

function providerDefaults(providers: ProviderCatalogState["providers"]) {
  return providers.all
    .filter((item) => providers.connected.includes(item.id))
    .flatMap((item) => {
      const modelID = providers.default[item.id]
      if (modelID) return [{ providerID: item.id, modelID }]
      const first = Object.values(item.models)[0]
      if (!first) return []
      return [{ providerID: item.id, modelID: first.id }]
    })
}

export function sameModel(a?: ChatModelRef, b?: ChatModelRef) {
  if (!a || !b) return false
  return a.providerID === b.providerID && a.modelID === b.modelID
}

export function rankAgent(name: string) {
  if (name === "strategy") return 0
  if (name === "build") return 1
  if (name === "plan") return 2
  return 3
}

export function resolveComposer(input: {
  agents: Agent[]
  catalog: ProviderCatalogState
  current?: ProjectComposerState
}): ComposerResolved {
  const pick = input.current
  const agent = input.agents.find((item) => item.name === pick?.agent) ?? input.agents[0]
  const config = configModel(input.catalog.config, input.catalog.connectedModels)
  const recent = pick?.recent?.find((item) => valid(item, input.catalog.connectedModels))
  const first = input.catalog.connectedModels[0]
    ? {
        providerID: input.catalog.connectedModels[0].provider.id,
        modelID: input.catalog.connectedModels[0].id,
      }
    : undefined
  const refs = [pick?.model, agent?.model, config, recent, ...providerDefaults(input.catalog.providers), first].filter(
    (item): item is ChatModelRef => !!item && valid(item, input.catalog.connectedModels),
  )
  const model = refs[0]
  const entry = input.catalog.connectedModels.find((item) =>
    sameModel(model, { providerID: item.provider.id, modelID: item.id }),
  )
  const variants = entry?.variants ? Object.keys(entry.variants) : []
  const configVariant =
    agent?.variant &&
    agent.model &&
    entry?.variants &&
    sameModel(agent.model, model) &&
    agent.variant in entry.variants
      ? agent.variant
      : undefined
  const variant =
    pick?.variant === null
      ? undefined
      : pick?.variant && variants.includes(pick.variant)
        ? pick.variant
        : configVariant && variants.includes(configVariant)
          ? configVariant
          : undefined
  return {
    agent,
    model,
    variant,
    entry,
    variants,
  }
}
