import { useState } from "react"
import type { SessionItem, Stage } from "../../data"
import common from "../../styles/session/session-common.module.css"
import { WorkbenchSession } from "../session"
import { Backtest } from "./backtest"
import { CodePanel, type CodeTab } from "./code"
import { Composer } from "./composer"
import { Flow } from "./flow"
import { TimelineStage } from "./timeline-stage"
import type { ChatMessageInfo, ChatStatus } from "@/types/chat"
import type { LocalWorkspace } from "@/types/workspace"

export function StageView(props: {
  cur: SessionItem
  active: string
  stage: Stage
  workspace: LocalWorkspace | null
  sid?: string | null
  load: boolean
  msgs: ChatMessageInfo[]
  status: ChatStatus
  busy: boolean
  making: boolean
  empty: string
  onStage: (stage: Stage) => void
  onSend: (text: string, review: boolean) => void
  onBacktest: () => void
  onCreate: () => Promise<string>
  onPick: (value: string) => void
  onAbort: () => void
}) {
  const [file, setFile] = useState<string | null>(null)
  const [tab, setTab] = useState<CodeTab>("files")

  const diff = (path: string) => {
    setFile(path)
    setTab("review")
    props.onStage("code")
  }

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
            onOpenDiff={diff}
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
          path={file}
          tab={tab}
          onTab={setTab}
        />
      ) : null}
      {props.stage === "backtest" ? <Backtest cur={props.cur} onRun={props.onBacktest} /> : null}
      {props.stage === "timeline" ? <TimelineStage cur={props.cur} active={props.active} /> : null}
      {props.stage !== "session" && props.stage !== "timeline" ? <Composer onSend={props.onSend} /> : null}
    </>
  )
}
