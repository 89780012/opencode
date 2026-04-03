import { useCallback, useMemo } from "react"
import { useAgentList, useProviderList } from "@/data/global-data-provider"
import { useProjectComposer } from "@/hooks/use-project-composer"
import { resolveComposer } from "@/lib/chat-composer"

export function useStrategyComposer(scope?: string, kind?: string) {
  const catalog = useProviderList()
  const ags = useAgentList(kind)
  const project = useProjectComposer(scope)
  const composer = useMemo(
    () =>
      resolveComposer({
        agents: ags.ags,
        catalog,
        state: project.state,
      }),
    [ags.ags, catalog, project.state],
  )
  const model = composer.model ? `${composer.model.providerID}/${composer.model.modelID}` : undefined

  const setAgent = useCallback(
    (value: string) => {
      if (!ags.ags.some((item) => item.name === value)) {
        return
      }
      project.setAgent(value)
    },
    [ags.ags, project],
  )

  const setModel = useCallback(
    (value: string) => {
      const [providerID, ...rest] = value.split("/")
      const modelID = rest.join("/")
      if (!catalog.connectedModels.some((item) => item.provider.id === providerID && item.id === modelID)) {
        return
      }
      project.setModel({ providerID, modelID })
    },
    [catalog.connectedModels, project],
  )

  const setVariant = useCallback(
    (value: string) => {
      project.setVariant(value === "default" ? null : value)
    },
    [project],
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
