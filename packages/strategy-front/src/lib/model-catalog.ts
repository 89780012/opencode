import type { Model, Provider } from "@/types/provider"
import { load, save } from "@/lib/store"

export type Vis = "show" | "hide"
export type ModelKey = {
  providerID: string
  modelID: string
}
export type ModelRow = Model & {
  provider: Provider
}
export type ModelChain = {
  chain: ModelKey[]
  chainTouched: boolean
}

type Store = ModelChain & {
  user: Record<string, Vis>
}

export const modelStoreKey = "strategy-front.provider-models.v1"
export const modelChainLimit = 10
const win = 1000 * 60 * 60 * 24 * 30 * 6

export function modelKey(input: ModelKey) {
  return `${input.providerID}:${input.modelID}`
}

function parse(): Store {
  if (typeof window === "undefined") {
    return { user: {}, chain: [], chainTouched: false }
  }

  try {
    const raw = load(modelStoreKey)
    if (!raw) return { user: {}, chain: [], chainTouched: false }
    const data = JSON.parse(raw) as Partial<Store>
    return {
      user: data.user ?? {},
      chain: Array.isArray(data.chain)
        ? data.chain.filter((item) => item.providerID && item.modelID).slice(0, modelChainLimit)
        : [],
      chainTouched: !!data.chainTouched,
    }
  } catch {
    return { user: {}, chain: [], chainTouched: false }
  }
}

function ref(row: ModelRow): ModelKey {
  return { providerID: row.provider.id, modelID: row.id }
}

function rank(row: ModelRow) {
  const text = `${row.provider.id} ${row.provider.name} ${row.id} ${row.name}`.toLowerCase()
  if (row.provider.source === "custom") return 0
  if (text.includes("claude") || text.includes("anthropic")) return 1
  if (text.includes("gpt") || text.includes("openai")) return 2
  return 3
}

export function readModelVisibility() {
  return parse().user
}

export function readModelChain(): ModelChain {
  const data = parse()
  return { chain: data.chain, chainTouched: data.chainTouched }
}

export function writeModelCatalog(input: { user?: Record<string, Vis>; chain?: ModelKey[]; chainTouched?: boolean }) {
  if (typeof window === "undefined") return

  const cur = parse()
  save(
    modelStoreKey,
    JSON.stringify({
      user: input.user ?? cur.user,
      chain: input.chain ?? cur.chain,
      chainTouched: input.chainTouched ?? cur.chainTouched,
    }),
  )
}

export function autoModelChain(rows: ModelRow[]) {
  return rows
    .slice()
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.provider.name.localeCompare(b.provider.name) ||
        a.provider.id.localeCompare(b.provider.id) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    )
    .map(ref)
    .slice(0, modelChainLimit)
}

export function normalizeModelChain(rows: ModelRow[], saved = readModelChain()) {
  const map = new Map(rows.map((row) => [modelKey(ref(row)), row]))
  const base = saved.chainTouched && saved.chain.length > 0 ? saved.chain : autoModelChain(rows)
  const seen = new Set<string>()
  const chain = base.filter((item) => {
    const id = modelKey(item)
    if (seen.has(id)) return false
    if (!map.has(id)) return false
    seen.add(id)
    return true
  })

  rows.forEach((row) => {
    if (chain.length >= modelChainLimit) return
    const item = ref(row)
    const id = modelKey(item)
    if (seen.has(id)) return
    chain.push(item)
    seen.add(id)
  })

  return chain.slice(0, modelChainLimit)
}

export function stamp(value: string) {
  const ts = Date.parse(value)
  return Number.isFinite(ts) ? ts : Number.NaN
}

export function latestModels(rows: ModelRow[]) {
  const now = Date.now()
  const grp = new Map<string, Map<string, ModelRow[]>>()

  rows.forEach((row) => {
    const ts = stamp(row.release_date)
    if (!Number.isFinite(ts) || Math.abs(now - ts) >= win) return

    const map = grp.get(row.provider.id) ?? new Map<string, ModelRow[]>()
    const fam = row.family ?? ""
    const list = map.get(fam) ?? []
    list.push(row)
    map.set(fam, list)
    grp.set(row.provider.id, map)
  })

  const set = new Set<string>()
  grp.forEach((map) => {
    map.forEach((items) => {
      const row = items.slice().sort((a, b) => stamp(b.release_date) - stamp(a.release_date))[0]
      if (!row) return
      set.add(modelKey({ providerID: row.provider.id, modelID: row.id }))
    })
  })
  return set
}

export function modelVisible(input: {
  row?: ModelRow
  user: Record<string, Vis>
  latest: Set<string>
  model: ModelKey
}) {
  const id = modelKey(input.model)
  const cur = input.user[id]
  if (cur === "hide") return false
  if (cur === "show") return true
  if (input.latest.has(id)) return true
  return !Number.isFinite(stamp(input.row?.release_date ?? ""))
}
