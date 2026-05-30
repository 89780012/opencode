import { useEffect, useState } from "react"
import { Workbench } from "../workbench"
import { SettingsDialog } from "../settings"
import { socket } from "@/lib/socket-bus"
import ui from "../shared/styles/ui.module.css"
import { usePanels } from "./hooks/use-panels"
import { Rail } from "./layout/rail"
import shell from "./styles/layout.module.css"

export function Workstation() {
  const [open, setOpen] = useState(false)
  const panel = usePanels()

  useEffect(() => {
    socket.connect()
    return () => socket.disconnect()
  }, [])

  return (
    <div className={ui.root}>
      <div className={shell.frame}>
        <Rail page={open ? "settings" : "bench"} onPage={(page) => setOpen(page === "settings")} />
        <Workbench panel={panel} />
      </div>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
