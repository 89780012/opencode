import { useEffect, useState } from "react"
import { Workbench } from "../workbench"
import { SettingsDialog } from "../settings"
import type { Tab } from "../settings/types"
import ui from "../shared/styles/ui.module.css"
import { Rail } from "./layout/rail"
import shell from "./styles/layout.module.css"

export function Workstation() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("providers")

  useEffect(() => {
    const open = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: Tab }>).detail?.tab
      if (tab) setTab(tab)
      setOpen(true)
    }
    window.addEventListener("strategy-settings-open", open)
    return () => window.removeEventListener("strategy-settings-open", open)
  }, [])

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail
          page={open ? "settings" : "bench"}
          onPage={(page) => {
            if (page === "settings") {
              setTab("providers")
              setOpen(true)
              return
            }
            setOpen(false)
          }}
        />
        <Workbench />
      </div>
      <SettingsDialog open={open} tab={tab} onTab={setTab} onOpenChange={setOpen} />
    </div>
  )
}
