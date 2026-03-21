import type { Agent } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { ComposerResolved, ProjectComposerState, ProviderCatalogState } from "@/types/composer"

function hasModel(ref: ChatModelRef | undefined, list: ProviderCatalogState["connectedModels"]) {
  if (!ref) return false
  return list.some((item) => sameModel(ref, { providerID: item.provider.id, modelID: item.id }))
}

// 把 provider 配置里的 "provider/model" 字符串转成模型引用，并过滤掉当前不可用的模型。
function resolveConfigModel(config: ProviderCatalogState["config"], list: ProviderCatalogState["connectedModels"]) {
  if (!config.model) return
  const [providerID, ...rest] = config.model.split("/")
  const ref = { providerID, modelID: rest.join("/") }
  if (!hasModel(ref, list)) return
  return ref
}

// 为每个已连接 provider 产出一个默认模型，供最终兜底时使用。
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
  if (name === "build") return 1
  if (name === "plan") return 2
  return 3
}

// 统一计算当前输入框最终使用的 agent、model、variant。
// 选择顺序是：用户当前选择 -> agent 默认模型 -> provider 配置模型 -> 最近使用模型 -> provider 默认模型 -> 第一可用模型。
export function resolveComposer(input: {
  agents: Agent[]
  catalog: ProviderCatalogState
  state?: ProjectComposerState
}): ComposerResolved {
  const state = input.state
  const agent = input.agents.find((item) => item.name === state?.agent) ?? input.agents[0]
  const configModel = resolveConfigModel(input.catalog.config, input.catalog.connectedModels)
  const recentModel = state?.recent?.find((item) => hasModel(item, input.catalog.connectedModels))
  const firstModel = input.catalog.connectedModels[0]
    ? {
        providerID: input.catalog.connectedModels[0].provider.id,
        modelID: input.catalog.connectedModels[0].id,
      }
    : undefined
  // 这里按优先级依次收集候选模型，命中第一个仍可用的模型即停止。
  const modelChoices = [
    state?.model,
    agent?.model,
    configModel,
    recentModel,
    ...resolveProviderDefaults(input.catalog.providers),
    firstModel,
  ].filter((item): item is ChatModelRef => !!item && hasModel(item, input.catalog.connectedModels))
  const model = modelChoices[0]
  const modelEntry = input.catalog.connectedModels.find((item) =>
    sameModel(model, { providerID: item.provider.id, modelID: item.id }),
  )
  const variants = modelEntry?.variants ? Object.keys(modelEntry.variants) : []
  // variant 只会在当前命中模型支持时生效，避免把旧模型的 variant 套到新模型上。
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
