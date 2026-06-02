import { useState } from "react"
import { ClipboardList, MessageSquareMore, Sparkles } from "lucide-react"
import { type SidebarTab } from "../../data"
import css from "../../styles/side/side.module.css"
import { RequirementsTab, SessionsTab } from "./side-tabs"
import { useWorkbench } from "../../hooks/use-workbench"

export function Side(props: { onCreate?: () => void }) {
  const app = useWorkbench()
  const [tab, setTab] = useState<SidebarTab>("requirements")

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
        <SessionsTab
          cur={app.cur}
          issues={app.issues}
          onToggle={app.toggle}
          onIssuePick={app.setActive}
          onCreate={() => {
            props.onCreate?.()
            setTab("requirements")
          }}
        />
      ) : (
        <RequirementsTab cur={app.cur} risk={app.risk} hint={app.hint} onToggle={app.toggle} onBacktest={app.show} />
      )}
    </aside>
  )
}
