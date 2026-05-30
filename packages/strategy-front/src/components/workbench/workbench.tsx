import { useState, type CSSProperties } from "react"
import { Modal } from "./features/modal"
import { Review } from "./features/review"
import { Side } from "./features/side"
import { StageView } from "./features/stage"
import { WorkbenchSession } from "./features/session"
import type { CodeTab } from "./features/stage/code"
import { usePanels } from "./hooks/use-panels"
import { useTimeline } from "./hooks/use-timeline"
import { useWorkbench } from "./hooks/use-workbench"
import { useWorkbenchChat } from "./hooks/use-workbench-chat"
import { Handle } from "./layout/handle"
import shell from "./styles/layout/shell.module.css"
import { Topbar } from "./layout/topbar"
import common from "./styles/session/session-common.module.css"

export function Workbench() {
  const panel = usePanels()
  const app = useWorkbench(panel.setRight)
  const real = useWorkbenchChat()
  const time = useTimeline(app.cur, app.active, app.stage)
  const session = app.stage === "session"
  const [file, setFile] = useState<string | null>(null)
  const [codeTab, setCodeTab] = useState<CodeTab>("files")

  return (
    <>
      <div
        className={shell.shell}
        data-workbench
        style={
          {
            "--left": `${panel.left}px`,
            "--side": `${panel.right ? panel.side : 0}px`,
          } as CSSProperties
        }
      >
        <Side
          tab={app.tab}
          cur={app.cur}
          sessions={app.sessions}
          issues={app.issues}
          risk={app.risk}
          hint={app.hint}
          onTab={app.setTab}
          onToggle={app.toggle}
          onPick={app.setActive}
          onModal={() => app.setModal(true)}
          onStage={app.setStage}
          onRename={app.rename}
          onDelete={app.remove}
          onBacktest={app.show}
        />

        <Handle
          onDown={(event) => panel.resize("left", event)}
          onKey={(event) => panel.key("left", event)}
          active={panel.size?.kind === "left"}
          min={220}
          max={460}
          now={panel.left}
          label="Resize left panel"
        />

        <main className={shell.main}>
          <Topbar stage={app.stage} name={app.cur.name} onStage={app.setStage} />
          {session ? (
            real.workspace ? (
              <>
                <WorkbenchSession
                  workspace={real.workspace}
                  selectedSessionId={real.chat.selectedSessionId}
                  detailLoading={real.chat.detailLoading}
                  messages={real.chat.messages}
                  status={real.chat.status}
                  busy={real.chat.busy}
                  creating={real.chat.creating}
                  onCreate={real.chat.createSession}
                  onSelectSession={real.chat.selectSession}
                  onAbort={() => void real.abort()}
                  onOpenDiff={(path) => {
                    setFile(path)
                    setCodeTab("review")
                    app.setStage("code")
                  }}
                />
              </>
            ) : (
              <div className={common.empty}>
                {real.list.loading ? "正在加载工作区..." : real.list.error || "没有可用工作区"}
              </div>
            )
          ) : (
            <StageView
              cur={app.cur}
              active={app.active}
              stage={app.stage}
              draft={app.draft}
              timeline={time}
              workspace={real.workspace}
              sessionId={real.chat.selectedSessionId}
              file={file}
              codeTab={codeTab}
              onCodeTab={setCodeTab}
              onDraft={app.setDraft}
              onSend={app.send}
              onBacktest={() => void app.backtest()}
            />
          )}
        </main>

        <Review
          cur={app.cur}
          last={app.last}
          right={panel.right}
          side={panel.side}
          size={panel.size?.kind === "right"}
          onDown={(event) => panel.resize("right", event)}
          onKey={(event) => panel.key("right", event)}
          onView={app.view}
          onClose={() => panel.setRight(false)}
          onOpen={() => panel.setRight(true)}
          onRun={() => void app.review()}
        />
      </div>

      <Modal
        open={app.modal}
        busy={app.busy}
        step={app.step}
        title={app.title}
        reqs={app.reqs}
        onClose={() => app.setModal(false)}
        onStep={app.setStep}
        onTitle={app.setTitle}
        onReqs={app.setReqs}
        onSubmit={() => void app.create()}
      />
    </>
  )
}
