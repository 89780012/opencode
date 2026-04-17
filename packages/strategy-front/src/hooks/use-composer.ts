import { useCallback, useMemo } from "react"
import { useAgentList, useProviderList } from "@/data/global-data-provider"
import { useComposerPrefs } from "@/hooks/use-composer-prefs"
import { resolveComposer } from "@/lib/chat-composer"

export function useComposer() {
  const catalog = useProviderList()
  const ags = useAgentList()
  const prefs = useComposerPrefs()
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: prefs.state,
      }),
    [ags.ags, catalog, prefs.state],
  )
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined

  const setAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) {
        return
      }
      prefs.setAgent(value)
    },
    [ags.ags, prefs],
  )

  const setModel = useCallback(
    (value: string) => {
      const [providerID, ...rest] = value.split("/")
      const modelID = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) {
        return
      }
      prefs.setModel({ providerID, modelID })
    },
    [catalog.connectedModels, prefs],
  )

  const setVariant = useCallback(
    (value: string) => {
      prefs.setVariant(value === "default" ? null : value)
    },
    [prefs],
  )

  return useMemo(
    () => ({
      composer,
      agent: composer.agent?.name,
      model,
      variant: composer.variant,
      variants: composer.variants,
      agents: ags.names,
      models: catalog.visibleModels,
      load: ags.load || catalog.load,
      setAgent,
      setModel,
      setVariant,
    }),
    [
      ags.load,
      ags.names,
      catalog.load,
      catalog.visibleModels,
      composer,
      model,
      setAgent,
      setModel,
      setVariant,
    ],
  )
}
