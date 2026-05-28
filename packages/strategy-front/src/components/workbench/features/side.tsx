import { ClipboardList, MessageSquareMore, Sparkles } from "lucide-react"
import { type SessionItem, type SidebarTab, type Stage } from "../data"
import css from "./side.module.css"
import { type Issue, RequirementsTab, SessionsTab } from "./side-tabs"

export function Side(props: {
  tab: SidebarTab
  cur: SessionItem
  sessions: SessionItem[]
  issues: Issue[]
  risk: string
  hint: string
  onTab: (tab: SidebarTab) => void
  onToggle: (key: string) => void
  onPick: (id: string) => void
  onModal: () => void
  onStage: (stage: Stage) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onBacktest: (idx: number) => void
}) {
  return (
    <aside className={css.root}>
      <div className={css.logo}>
        <Sparkles size={15} />
        <span>OpenCode</span>
      </div>

      <div className={css.tabs}>
        <button type="button" className={props.tab === "requirements" ? css.tabon : ""} onClick={() => props.onTab("requirements")}>
          <ClipboardList size={14} />
          <span>需求面板</span>
        </button>
        <button type="button" className={props.tab === "sessions" ? css.tabon : ""} onClick={() => props.onTab("sessions")}>
          <MessageSquareMore size={14} />
          <span>会话列表</span>
        </button>
      </div>

      {props.tab === "sessions" ? (
        <SessionsTab
          cur={props.cur}
          sessions={props.sessions}
          issues={props.issues}
          onToggle={props.onToggle}
          onPick={props.onPick}
          onModal={props.onModal}
          onRename={props.onRename}
          onDelete={props.onDelete}
        />
      ) : (
        <RequirementsTab
          cur={props.cur}
          risk={props.risk}
          hint={props.hint}
          onToggle={props.onToggle}
          onStage={props.onStage}
          onBacktest={props.onBacktest}
        />
      )}
    </aside>
  )
}
