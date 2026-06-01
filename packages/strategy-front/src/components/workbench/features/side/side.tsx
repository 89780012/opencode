import { useState } from "react"
import { ClipboardList, MessageSquareMore, Sparkles } from "lucide-react"
import { type SessionItem, type SidebarTab, type Stage } from "../../data"
import { Modal } from "../modal"
import css from "../../styles/side/side.module.css"
import { type Issue, RequirementsTab, SessionsTab } from "./side-tabs"
import { useSideSession } from "../../hooks/use-side-session"

export function Side(props: {
  cur: SessionItem
  sessions: SessionItem[]
  issues: Issue[]
  risk: string
  hint: string
  onToggle: (key: string) => void
  onPick: (id: string) => void
  onCreate: (data: { title: string; reqs: string[] }) => void | Promise<void>
  onStage: (stage: Stage) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
  onBacktest: (idx: number) => void
}) {
  const [tab, setTab] = useState<SidebarTab>("requirements")
  const session = useSideSession({
    onCreate: async (data) => {
      await props.onCreate(data)
      setTab("requirements")
    },
  })

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
        <button
          type="button"
          className={tab === "sessions" ? css.tabon : ""}
          onClick={() => setTab("sessions")}
        >
          <MessageSquareMore size={14} />
          <span>会话列表</span>
        </button>
      </div>

      {tab === "sessions" ? (
        <SessionsTab
          cur={props.cur}
          sessions={props.sessions}
          issues={props.issues}
          onToggle={props.onToggle}
          onPick={props.onPick}
          onCreate={() => session.setOpen(true)}
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

      <Modal
        open={session.open}
        busy={session.busy}
        step={session.step}
        title={session.title}
        reqs={session.reqs}
        onClose={() => session.setOpen(false)}
        onStep={session.setStep}
        onTitle={session.setTitle}
        onReqs={session.setReqs}
        onSubmit={() => void session.submit()}
      />
    </aside>
  )
}
