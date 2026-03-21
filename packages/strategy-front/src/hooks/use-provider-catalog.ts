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
    providers: empty,
    config: {},
    connectedModels: [],
    visibleModels: [],
  })
  const [load, setLoad] = useState(false)
  const [err, setErr] = useState<unknown>()
  const user = useMemo(() => readModelVisibility(), [])

  const reload = useCallback(async () => {
    setLoad(true)
    setErr(undefined)
    try {
      const [providers, config] = await Promise.all([providerApi.list(), providerApi.config()])
      const connected = new Set(providers.connected)
      const connectedModels = providers.all
        .filter((item) => connected.has(item.id))
        .flatMap((provider) =>
          Object.values(provider.models).map((model) => ({
            ...model,
            provider,
          })),
        )
      const latest = latestModels(connectedModels)
      const visibleModels = connectedModels.filter((item) =>
        modelVisible({
          row: item,
          user,
          latest,
          model: { providerID: item.provider.id, modelID: item.id },
        }),
      )
      setState({
        providers,
        config,
        connectedModels,
        visibleModels,
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
