import { useState } from "react"
import { ClipboardList, MessageSquareMore, Sparkles } from "lucide-react"
import { type SidebarTab } from "../../data"
import css from "../../styles/side/side.module.css"
import { RequirementsTab, SessionsTab } from "./side-tabs"
import { useWorkbench } from "../../hooks/use-workbench"

const init = {
  sessions: true,
  issues: true,
  requirements: true,
  logic: true,
  progress: true,
  backtest: true,
}

export function Side() {
  const app = useWorkbench()
  const [tab, setTab] = useState<SidebarTab>("requirements")
  const [open, setOpen] = useState<Record<string, boolean>>(init)
  const flip = (key: string) => setOpen((state) => ({ ...state, [key]: !state[key] }))

  return (
    <aside className={css.root}>
      <div className={css.logo}>
        <Sparkles size={15} />
        <span>OpenCode</span>
      </div>

      <div className={css.tabs}>
        <button
          type="button"
          className={tab === "requirements" ? css.tabon : ""}
          onClick={() => setTab("requirements")}
        >
          <ClipboardList size={14} />
          <span>需求面板</span>
        </button>
        <button type="button" className={tab === "sessions" ? css.tabon : ""} onClick={() => setTab("sessions")}>
          <MessageSquareMore size={14} />
          <span>会话列表</span>
        </button>
      </div>

      {tab === "sessions" ? (
        <SessionsTab open={open} onToggle={flip} />
      ) : (
        <RequirementsTab
          cur={app.cur}
          open={open}
          risk={app.risk}
          hint={app.hint}
          onToggle={flip}
          onBacktest={app.show}
        />
      )}
    </aside>
  )
}
