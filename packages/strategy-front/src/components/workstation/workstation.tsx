import { useState } from "react"
import { SettingsDialog } from "../settings"
import ui from "../shared/styles/ui.module.css"
import { Layout } from "./layout"
import { Workbench } from "../workbench"

export function Workstation() {
  const [open, setOpen] = useState(false)

  return (
    <div className={ui.root}>
      <Layout page={open ? "settings" : "bench"} onPage={(page) => setOpen(page === "settings")}>
        <Workbench />
      </Layout>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
