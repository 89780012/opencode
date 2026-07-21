import { useEffect, useState } from "react"
import { Workbench } from "../workbench"
import { SettingsPage } from "../settings"
import type { Tab } from "../settings/types"
import ui from "../shared/styles/ui.module.css"
import { Rail } from "./layout/rail"
import shell from "./styles/layout.module.css"

export function Workstation() {
  const [page, setPage] = useState<"bench" | "settings">("bench")
  const [tab, setTab] = useState<Tab>("providers")

  useEffect(() => {
    const open = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: Tab }>).detail?.tab
      if (tab) setTab(tab)
      setPage("settings")
    }
    window.addEventListener("strategy-settings-open", open)
    return () => window.removeEventListener("strategy-settings-open", open)
  }, [])

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail
          page={page}
          onPage={(next) => {
            if (next === "settings") {
              setTab("providers")
            }
            setPage(next)
          }}
        />
        <Workbench hidden={page === "settings"} />
        {page === "settings" ? <SettingsPage tab={tab} onTab={setTab} /> : null}
      </div>
    </div>
  )
}
