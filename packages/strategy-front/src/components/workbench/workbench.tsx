import { useState, type CSSProperties, type KeyboardEventHandler, type PointerEventHandler } from "react"
import { Modal } from "./features/modal"
import { Review } from "./features/review"
import { Side } from "./features/side"
import { StageView } from "./features/stage"
import type { CodeTab } from "./features/stage/code"
import { useTimeline } from "./hooks/use-timeline"
import { useWorkbench } from "./hooks/use-workbench"
import { useWorkbenchChat } from "./hooks/use-workbench-chat"
import { Handle } from "./layout/handle"
import { Topbar } from "./layout/topbar"
import shell from "./styles/layout/shell.module.css"

type Panel = {
  w: number
  active: boolean
  onDown: PointerEventHandler<HTMLDivElement>
  onKey: KeyboardEventHandler<HTMLDivElement>
}

type Panels = {
  left: Panel
  right: Panel & {
    open: boolean
    setOpen: (open: boolean) => void
  }
}

export function Workbench(props: { panel: Panels }) {
  const [file, setFile] = useState<string | null>(null)
  const [code, setCode] = useState<CodeTab>("files")
  const app = useWorkbench(props.panel.right.setOpen)
  const real = useWorkbenchChat()
  const time = useTimeline(app.cur, app.active, app.stage)

  return (
    <>
      <div className={shell.pane}>
        <div
          className={shell.shell}
          data-workbench
          style={
            {
              "--left": `${props.panel.left.w}px`,
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
            onDown={props.panel.left.onDown}
            onKey={props.panel.left.onKey}
            active={props.panel.left.active}
            min={220}
            max={460}
            now={props.panel.left.w}
            label="Resize left panel"
          />

          <main className={shell.main}>
            <Topbar stage={app.stage} name={app.cur.name} onStage={app.setStage} />
            <StageView
              cur={app.cur}
              active={app.active}
              stage={app.stage}
              draft={app.draft}
              timeline={time}
              workspace={real.workspace}
              sid={real.chat.selectedSessionId}
              load={real.chat.detailLoading}
              msgs={real.chat.messages}
              status={real.chat.status}
              busy={real.chat.busy}
              making={real.chat.creating}
              empty={real.list.loading ? "正在加载工作区..." : real.list.error || "没有可用工作区"}
              file={file}
              codeTab={code}
              onCodeTab={setCode}
              onDraft={app.setDraft}
              onSend={app.send}
              onBacktest={() => void app.backtest()}
              onCreate={real.chat.createSession}
              onPick={real.chat.selectSession}
              onAbort={() => void real.abort()}
              onOpenDiff={(path) => {
                setFile(path)
                setCode("review")
                app.setStage("code")
              }}
            />
          </main>

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
        </div>
      </div>
      <Review
        cur={app.cur}
        last={app.last}
        right={props.panel.right.open}
        side={props.panel.right.w}
        size={props.panel.right.active}
        onDown={props.panel.right.onDown}
        onKey={props.panel.right.onKey}
        onView={app.view}
        onClose={() => props.panel.right.setOpen(false)}
        onOpen={() => props.panel.right.setOpen(true)}
        onRun={() => void app.review()}
      />
    </>
  )
}
