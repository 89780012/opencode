import type { Agent } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { ComposerPrefs, ComposerResolved, ProviderCatalogState } from "@/types/composer"

function hasModel(ref: ChatModelRef | undefined, list: ProviderCatalogState["connectedModels"]) {
  if (!ref) return false
  return list.some((item) => sameModel(ref, { providerID: item.provider.id, modelID: item.id }))
}

function resolveConfigModel(config: ProviderCatalogState["config"], list: ProviderCatalogState["connectedModels"]) {
  if (!config.model) return
  const [providerID, ...rest] = config.model.split("/")
  const ref = { providerID, modelID: rest.join("/") }
  if (!hasModel(ref, list)) return
  return ref
}

function resolveProviderDefaults(providers: ProviderCatalogState["providers"]) {
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
  if (name === "python-strategy") return 1
  if (name === "js-strategy") return 1
  if (name === "build") return 2
  if (name === "plan") return 3
  return 4
}

// 统一计算当前输入框最终使用的 agent、model、variant。
// 选择顺序：用户当前选择 -> agent 默认模型 -> provider 配置模型 -> provider 默认模型 -> 第一个可用模型。
export function resolveComposer(input: {
  agents: Agent[]
  catalog: ProviderCatalogState
  state?: ComposerPrefs
}): ComposerResolved {
  const state = input.state
  const agent = input.agents.find((item) => item.name === state?.agent) ?? input.agents[0]
  const configModel = resolveConfigModel(input.catalog.config, input.catalog.connectedModels)
  const firstModel = input.catalog.connectedModels[0]
    ? {
        providerID: input.catalog.connectedModels[0].provider.id,
        modelID: input.catalog.connectedModels[0].id,
      }
    : undefined
  const modelChoices = [
    state?.model,
    agent?.model,
    configModel,
    ...resolveProviderDefaults(input.catalog.providers),
    firstModel,
  ].filter((item): item is ChatModelRef => !!item && hasModel(item, input.catalog.connectedModels))
  const model = modelChoices[0]
  const modelEntry = input.catalog.connectedModels.find((item) =>
    sameModel(model, { providerID: item.provider.id, modelID: item.id }),
  )
  const variants = modelEntry?.variants ? Object.keys(modelEntry.variants) : []
  const agentVariant =
    agent?.variant &&
    agent.model &&
    modelEntry?.variants &&
    sameModel(agent.model, model) &&
    agent.variant in modelEntry.variants
      ? agent.variant
      : undefined
  const variant =
    state?.variant === null
      ? undefined
      : state?.variant && variants.includes(state.variant)
        ? state.variant
        : agentVariant && variants.includes(agentVariant)
          ? agentVariant
          : undefined
  return {
    agent,
    model,
    variant,
    modelEntry,
    variants,
  }
}
