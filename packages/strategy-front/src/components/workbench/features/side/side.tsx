import { useState } from "react"
import { ClipboardList, MessageSquareMore, Sparkles } from "lucide-react"
import { type SidebarTab } from "../../data"
import { Modal } from "../modal"
import css from "../../styles/side/side.module.css"
import { RequirementsTab, SessionsTab } from "./side-tabs"
import { useSideSession } from "../../hooks/use-side-session"
import { useWorkbench } from "../../hooks/use-workbench"

export function Side(props: { onCreate?: () => void }) {
  const app = useWorkbench()
  const [tab, setTab] = useState<SidebarTab>("requirements")
  const session = useSideSession({
    onCreate: async (data) => {
      app.create(data)
      props.onCreate?.()
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
          cur={app.cur}
          sessions={app.sessions}
          issues={app.issues}
          onToggle={app.toggle}
          onPick={app.setActive}
          onCreate={() => session.setOpen(true)}
          onRename={app.rename}
          onDelete={app.remove}
        />
      ) : (
        <RequirementsTab
          cur={app.cur}
          risk={app.risk}
          hint={app.hint}
          onToggle={app.toggle}
          onBacktest={app.show}
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
