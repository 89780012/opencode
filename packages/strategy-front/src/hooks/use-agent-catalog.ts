import { useEffect, useMemo, useState } from "react"
import { agentApi } from "@/api/modules"
import { rankAgent } from "@/lib/chat-composer"
import type { Agent } from "@/types/agent"

export function useAgentCatalog(workspacePath?: string | null) {
  const [ags, setAgs] = useState<Agent[]>([])
  const [load, setLoad] = useState(false)

  useEffect(() => {
    if (!workspacePath) {
      setAgs([])
      return
    }

    let dead = false
    const run = async () => {
      setLoad(true)
      try {
        const list = await agentApi.list(workspacePath)
        if (dead) return
        const ags = list
          .filter((item) => item.mode === "primary" && !item.hidden)
          .slice()
          .sort((a, b) => {
            const diff = rankAgent(a.name) - rankAgent(b.name)
            if (diff !== 0) return diff
            return a.name.localeCompare(b.name)
          })
        setAgs(ags)
      } finally {
        if (!dead) setLoad(false)
      }
    }

    void run()

    return () => {
      dead = true
    }
  }, [workspacePath])

  return useMemo(
    () => ({
      load,
      ags,
      names: ags.map((item) => item.name),
    }),
    [ags, load],
  )
}
