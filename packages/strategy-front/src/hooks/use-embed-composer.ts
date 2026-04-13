import { useEffect } from "react"
import { useStrategyComposer } from "@/hooks/use-strategy-composer"
import { useProjectComposer } from "@/hooks/use-project-composer"

export function useEmbedComposer(path?: string, kind?: string) {
  const composer = useStrategyComposer(path, kind)
  const project = useProjectComposer(path)

  useEffect(() => {
    if (!project.ready) return
    if (project.state.agent) return
    if (!composer.agents.includes("smartx-helper")) return
    if (composer.agent === "smartx-helper") return
    composer.setAgent("smartx-helper")
  }, [composer, project.ready, project.state.agent])

  return composer
}
