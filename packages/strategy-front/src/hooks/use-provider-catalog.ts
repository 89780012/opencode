import { useCallback, useEffect, useMemo, useState } from "react"
import { providerApi } from "@/api/modules"
import { latestModels, modelVisible, readModelVisibility } from "@/lib/model-catalog"
import type { ProviderCatalogState } from "@/types/composer"
import type { List } from "@/types/provider"

const empty: List = {
  all: [],
  connected: [],
  default: {},
}

export function useProviderCatalog() {
  const [state, setState] = useState<ProviderCatalogState>({
    list: empty,
    cfg: {},
    all: [],
    rows: [],
  })
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<unknown>()
  const user = useMemo(() => readModelVisibility(), [])

  const reload = useCallback(async () => {
    setLoad(true)
    setErr(undefined)
    try {
      const [list, cfg] = await Promise.all([providerApi.list(), providerApi.config()])
      const ids = new Set(list.connected)
      const all = list.all
        .filter((item) => ids.has(item.id))
        .flatMap((provider) =>
          Object.values(provider.models).map((model) => ({
            ...model,
            provider,
          })),
        )
      const latest = latestModels(all)
      const rows = all.filter((item) =>
        modelVisible({
          row: item,
          user,
          latest,
          model: { providerID: item.provider.id, modelID: item.id },
        }),
      )
      setState({
        list,
        cfg,
        all,
        rows,
      })
    } catch (err) {
      setErr(err)
      throw err
    } finally {
      setLoad(false)
    }
  }, [user])

  useEffect(() => {
    void reload().catch(() => undefined)
  }, [reload])

  return useMemo(
    () => ({
      err,
      load,
      reload,
      ...state,
    }),
    [err, load, reload, state],
  )
}
