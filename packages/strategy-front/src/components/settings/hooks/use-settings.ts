import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { modelChainApi } from "@/api/modules/model-chain"
import { useProviderList } from "@/data/global-data"
import { useProviderPage } from "@/hooks/use-provider-page"
import {
  autoModelChain,
  latestModels,
  modelKey,
  modelVisible,
  normalizeModelChain,
  readModelChain,
  readModelVisibility,
  signature,
  writeModelCatalog,
  type ModelKey,
} from "@/lib/model-catalog"
import { match, sortProvider } from "../logic/catalog"
import type { Row, Vis } from "../types"

export function useSettings() {
  const page = useProviderPage()
  const prv = useProviderList()
  const [q, setQ] = useState("")
  const [user, setUser] = useState<Record<string, Vis>>(() => readModelVisibility())
  const [chain, setChain] = useState<ModelKey[]>(() => readModelChain().chain)
  const [touched, setTouched] = useState(() => readModelChain().chainTouched)
  const dq = useDeferredValue(q.trim().toLowerCase())
  const sync = useRef(prv.sync)
  const saved = useRef({
    chain: signature(readModelChain().chain),
    touched,
    user: JSON.stringify(user),
  })
  const linked = useMemo(() => new Set(page.providers.connected), [page.providers.connected])
  const rows = useMemo(
    () =>
      page.connected.flatMap((provider) =>
        Object.values(provider.models).map((model) => ({
          ...model,
          provider,
          def: page.providers.default[provider.id] === model.id,
          free: provider.id === "opencode" && (!model.cost || model.cost.input === 0),
        })),
      ),
    [page.connected, page.providers.default],
  )
  const latest = useMemo(() => latestModels(rows), [rows])
  const shown = useMemo(
    () =>
      rows.filter((row) =>
        modelVisible({
          row,
          user,
          latest,
          model: { providerID: row.provider.id, modelID: row.id },
        }),
      ),
    [latest, rows, user],
  )
  const order = useMemo(() => normalizeModelChain(shown, { chain, chainTouched: touched }), [chain, shown, touched])
  const stats = useMemo(
    () => ({
      providers: page.connected.length,
      models: rows.length,
      shown: shown.length,
      available: page.providers.all.length - page.connected.length,
      hot: page.popularList.length,
    }),
    [page.connected.length, page.popularList.length, page.providers.all.length, rows.length, shown.length],
  )
  const map = useMemo(
    () => new Map(shown.map((item) => [modelKey({ providerID: item.provider.id, modelID: item.id }), item])),
    [shown],
  )
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>()
    const names = new Map<string, string>()

    rows.forEach((row) => {
      if (!match(row, dq)) return
      const items = map.get(row.provider.id) ?? []
      items.push(row)
      map.set(row.provider.id, items)
      names.set(row.provider.id, row.provider.name)
    })

    return Array.from(map.entries())
      .sort((a, b) => sortProvider(a[0], b[0], names))
      .map(([id, items]) => ({
        id,
        name: names.get(id) ?? id,
        items: items.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
  }, [dq, rows])

  useEffect(() => {
    sync.current = prv.sync
  }, [prv.sync])

  useEffect(() => {
    if (typeof window === "undefined") return
    writeModelCatalog({ user, chain: order, chainTouched: touched })
    const next = {
      chain: signature(order),
      touched,
      user: JSON.stringify(user),
    }
    if (
      saved.current.chain === next.chain &&
      saved.current.touched === next.touched &&
      saved.current.user === next.user
    )
      return

    const push = saved.current.chain !== next.chain
    saved.current = next

    if (push) {
      void modelChainApi.save({ chain: order }).catch(() => undefined)
    }
    sync.current()
  }, [order, touched, user])

  const visible = (input: ModelKey, row?: Row) =>
    modelVisible({
      row,
      user,
      latest,
      model: input,
    })

  const show = (input: ModelKey, on: boolean) => {
    setUser((prev) => ({ ...prev, [modelKey(input)]: on ? "show" : "hide" }))
  }

  const move = (idx: number, dir: number) => {
    const next = idx + dir
    if (next < 0 || next >= order.length) return
    setTouched(true)
    setChain(
      order
        .map((item, at) => (at === idx ? order[next] : at === next ? order[idx] : item))
        .filter((item): item is ModelKey => !!item),
    )
  }

  const top = (idx: number) => {
    if (idx <= 0 || idx >= order.length) return
    setTouched(true)
    setChain([order[idx], ...order.slice(0, idx), ...order.slice(idx + 1)])
  }

  const reset = () => {
    setTouched(false)
    setChain(autoModelChain(shown))
  }

  return {
    clear: () => setUser({}),
    groups,
    latest,
    linked,
    map,
    move,
    order,
    page,
    prv,
    q,
    reset,
    rows,
    setQ,
    show,
    shown,
    stats,
    top,
    user,
    visible,
  }
}
