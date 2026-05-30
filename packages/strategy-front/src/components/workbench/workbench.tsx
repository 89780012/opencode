import { useState, type CSSProperties } from "react"
import { Modal } from "./features/modal"
import { Side } from "./features/side"
import { StageView } from "./features/stage"
import type { CodeTab } from "./features/stage/code"
import { useTimeline } from "./hooks/use-timeline"
import { useWorkbench } from "./hooks/use-workbench"
import { useWorkbenchChat } from "./hooks/use-workbench-chat"
import { Handle } from "./layout/handle"
import { Topbar } from "./layout/topbar"
import shell from "./styles/layout/shell.module.css"
import type { usePanels } from "../workstation/hooks/use-panels"

export function Workbench(props: {
  panel: ReturnType<typeof usePanels>["left"]
  app: ReturnType<typeof useWorkbench>
}) {
  const [file, setFile] = useState<string | null>(null)
  const [code, setCode] = useState<CodeTab>("files")
  const real = useWorkbenchChat()
  const time = useTimeline(props.app.cur, props.app.active, props.app.stage)

  return (
    <div
      className={shell.shell}
      data-workbench
      style={
        {
          "--left": `${props.panel.w}px`,
        } as CSSProperties
      }
    >
      <Side
        tab={props.app.tab}
        cur={props.app.cur}
        sessions={props.app.sessions}
        issues={props.app.issues}
        risk={props.app.risk}
        hint={props.app.hint}
        onTab={props.app.setTab}
        onToggle={props.app.toggle}
        onPick={props.app.setActive}
        onModal={() => props.app.setModal(true)}
        onStage={props.app.setStage}
        onRename={props.app.rename}
        onDelete={props.app.remove}
        onBacktest={props.app.show}
      />

      <Handle
        onDown={props.panel.onDown}
        onKey={props.panel.onKey}
        active={props.panel.active}
        min={220}
        max={460}
        now={props.panel.w}
        label="Resize left panel"
      />

      <main className={shell.main}>
        <Topbar stage={props.app.stage} name={props.app.cur.name} onStage={props.app.setStage} />
        <StageView
          cur={props.app.cur}
          active={props.app.active}
          stage={props.app.stage}
          draft={props.app.draft}
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
          onDraft={props.app.setDraft}
          onSend={props.app.send}
          onBacktest={() => void props.app.backtest()}
          onCreate={real.chat.createSession}
          onPick={real.chat.selectSession}
          onAbort={() => void real.abort()}
          onOpenDiff={(path) => {
            setFile(path)
            setCode("review")
            props.app.setStage("code")
          }}
        />
      </main>

      <Modal
        open={props.app.modal}
        busy={props.app.busy}
        step={props.app.step}
        title={props.app.title}
        reqs={props.app.reqs}
        onClose={() => props.app.setModal(false)}
        onStep={props.app.setStep}
        onTitle={props.app.setTitle}
        onReqs={props.app.setReqs}
        onSubmit={() => void props.app.create()}
      />
    </div>
  )
}
