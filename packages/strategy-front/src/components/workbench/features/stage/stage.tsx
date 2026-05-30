import type { SessionItem, Stage } from "../../data"
import type { TimelineState } from "../../hooks/use-timeline"
import common from "../../styles/session/session-common.module.css"
import { WorkbenchSession } from "../session"
import { Backtest } from "./backtest"
import { CodePanel, type CodeTab } from "./code"
import { Composer } from "./composer"
import { Flow } from "./flow"
import { Timeline } from "./timeline"
import type { ChatMessageInfo, ChatStatus } from "@/types/chat"
import type { LocalWorkspace } from "@/types/workspace"

export function StageView(props: {
  cur: SessionItem
  active: string
  stage: Stage
  draft: string
  timeline: TimelineState
  workspace: LocalWorkspace | null
  sid?: string | null
  load: boolean
  msgs: ChatMessageInfo[]
  status: ChatStatus
  busy: boolean
  making: boolean
  empty: string
  file?: string | null
  codeTab: CodeTab
  onCodeTab: (tab: CodeTab) => void
  onDraft: (text: string) => void
  onSend: (review: boolean) => void
  onBacktest: () => void
  onCreate: () => Promise<string>
  onPick: (value: string) => void
  onAbort: () => void
  onOpenDiff: (path: string) => void
}) {
  return (
    <>
      {props.stage === "session" ? (
        props.workspace ? (
          <WorkbenchSession
            workspace={props.workspace}
            selectedSessionId={props.sid ?? null}
            detailLoading={props.load}
            messages={props.msgs}
            status={props.status}
            busy={props.busy}
            creating={props.making}
            onCreate={props.onCreate}
            onSelectSession={props.onPick}
            onAbort={props.onAbort}
            onOpenDiff={props.onOpenDiff}
          />
        ) : (
          <div className={common.empty}>{props.empty}</div>
        )
      ) : null}
      {props.stage === "flowchart" ? <Flow cur={props.cur} id={props.active} onRun={props.onBacktest} /> : null}
      {props.stage === "code" ? (
        <CodePanel
          cur={props.cur}
          workspace={props.workspace}
          sessionId={props.sid}
          path={props.file}
          tab={props.codeTab}
          onTab={props.onCodeTab}
        />
      ) : null}
      {props.stage === "backtest" ? <Backtest cur={props.cur} onRun={props.onBacktest} /> : null}
      {props.stage === "timeline" ? (
        <Timeline
          cur={props.cur}
          picked={props.timeline.picked}
          picks={props.timeline.picks}
          analysis={props.timeline.analysis}
          note={props.timeline.note}
          zoom={props.timeline.zoom}
          pan={props.timeline.pan}
          drag={props.timeline.drag}
          tip={props.timeline.tip}
          pane={props.timeline.pane}
          boxRef={props.timeline.boxRef}
          onNote={props.timeline.setNote}
          onPick={props.timeline.pick}
          onSubmit={props.timeline.submit}
          onReset={props.timeline.reset}
          onZoom={props.timeline.setZoom}
          onPan={props.timeline.setPan}
          onHover={props.timeline.hover}
          onFocus={props.timeline.focus}
          onHide={props.timeline.hide}
          onWheel={props.timeline.wheel}
          onGrab={props.timeline.grab}
          onKey={props.timeline.key}
        />
      ) : null}
      {props.stage !== "session" && props.stage !== "timeline" ? (
        <Composer draft={props.draft} onDraft={props.onDraft} onSend={props.onSend} />
      ) : null}
    </>
  )
}
