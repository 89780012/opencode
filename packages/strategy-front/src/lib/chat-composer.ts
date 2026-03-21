import type { Agent } from "@/types/agent"
import type { ChatModelRef } from "@/types/chat"
import type { ComposerResolved, ProjectComposerState, ProviderCatalogState } from "@/types/composer"

function valid(model: ChatModelRef | undefined, rows: ProviderCatalogState["all"]) {
  if (!model) return false
  return rows.some((item) => sameModel(model, { providerID: item.provider.id, modelID: item.id }))
}

function configModel(cfg: ProviderCatalogState["cfg"], rows: ProviderCatalogState["all"]) {
  if (!cfg.model) return
  const [providerID, ...rest] = cfg.model.split("/")
  const model = { providerID, modelID: rest.join("/") }
  if (!valid(model, rows)) return
  return model
}

function providerModel(prv: ProviderCatalogState["list"]) {
  return prv.all
    .filter((item) => prv.connected.includes(item.id))
    .flatMap((item) => {
      const modelID = prv.default[item.id]
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
  ags: Agent[]
  prv: ProviderCatalogState
  cur?: ProjectComposerState
}): ComposerResolved {
  const pick = input.cur
  const agent = input.ags.find((item) => item.name === pick?.agent) ?? input.ags[0]
  const cfg = configModel(input.prv.cfg, input.prv.all)
  const recent = pick?.recent?.find((item) => valid(item, input.prv.all))
  const first = input.prv.all[0]
    ? {
        providerID: input.prv.all[0].provider.id,
        modelID: input.prv.all[0].id,
      }
    : undefined
  const list = [pick?.model, agent?.model, cfg, recent, ...providerModel(input.prv.list), first].filter(
    (item): item is ChatModelRef => !!item && valid(item, input.prv.all),
  )
  const model = list[0]
  const row = input.prv.all.find((item) => sameModel(model, { providerID: item.provider.id, modelID: item.id }))
  const vars = row?.variants ? Object.keys(row.variants) : []
  const cfgVar =
    agent?.variant && agent.model && row?.variants && sameModel(agent.model, model) && agent.variant in row.variants
      ? agent.variant
      : undefined
  const variant =
    pick?.variant === null
      ? undefined
      : pick?.variant && vars.includes(pick.variant)
        ? pick.variant
        : cfgVar && vars.includes(cfgVar)
          ? cfgVar
          : undefined
  return {
    agent,
    model,
    variant,
    row,
    vars,
  }
}
