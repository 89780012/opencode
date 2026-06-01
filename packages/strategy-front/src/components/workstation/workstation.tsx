import { useState } from "react"
import { Workbench } from "../workbench"
import { SettingsDialog } from "../settings"
import ui from "../shared/styles/ui.module.css"
import { Rail } from "./layout/rail"
import shell from "./styles/layout.module.css"

export function Workstation() {
  const [open, setOpen] = useState(false)

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail page={open ? "settings" : "bench"} onPage={(page) => setOpen(page === "settings")} />
        <Workbench />
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
