import { useState } from "react"
import { SettingsDialog } from "../settings"
import { Rail } from "./layout/rail"
import shell from "./layout/shell.module.css"
import ui from "./shared.module.css"
import { Workbench } from "./workbench"

export function Workstation() {
  const [open, setOpen] = useState(false)

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail page={open ? "settings" : "bench"} onPage={(page) => setOpen(page === "settings")} />
        <div className={shell.pane}>
          <Workbench />
        </div>
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
