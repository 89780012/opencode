import { useState } from "react"
import { useWorkbench } from "../workbench/hooks/use-workbench"
import { Workbench } from "../workbench"
import { SettingsDialog } from "../settings"
import ui from "../shared/styles/ui.module.css"
import { usePanels } from "./hooks/use-panels"
import { Rail } from "./layout/rail"
import { Review } from "./layout/review"
import shell from "./styles/layout.module.css"

export function Workstation() {
  const [open, setOpen] = useState(false)
  const panel = usePanels()
  const app = useWorkbench(panel.right.setOpen)

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail page={open ? "settings" : "bench"} onPage={(page) => setOpen(page === "settings")} />
        <div className={shell.pane}>
          <Workbench panel={panel.left} app={app} />
        </div>
        <Review
          cur={app.cur}
          last={app.last}
          right={panel.right.open}
          side={panel.right.w}
          size={panel.right.active}
          onDown={panel.right.onDown}
          onKey={panel.right.onKey}
          onView={app.view}
          onClose={() => panel.right.setOpen(false)}
          onOpen={() => panel.right.setOpen(true)}
          onRun={() => void app.review()}
        />
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
