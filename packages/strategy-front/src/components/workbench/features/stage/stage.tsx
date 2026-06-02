import { useState } from "react"
import { useChatRuntime } from "@/hooks/use-chat-runtime"
import { useAppDispatch } from "@/store"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"
import common from "../../styles/session/session-common.module.css"
import { useStage } from "../../hooks/use-stage"
import { useWorkbenchChat } from "../../hooks/use-workbench-chat"
import { WorkbenchSession } from "../session"
import { Backtest } from "./backtest"
import { CodePanel } from "./code"
import { Composer } from "./composer"
import { Flow } from "./flow"
import { TimelineStage } from "./timeline-stage"

export function StageView() {
  const dispatch = useAppDispatch()
  const stage = useStage()
  const real = useWorkbenchChat()
  const [draft, setDraft] = useState("")
  const [mode, setMode] = useState<"narrow" | "full">("narrow")
  const chat = useChatRuntime({
    workspacePath: real.workspace?.path,
    sessionId: real.chat.selectedSessionId,
    status: real.chat.status,
    busy: real.chat.busy,
    createSession: real.chat.createSession,
    selectSession: real.chat.selectSession,
  })
  const session = stage.stage === "session"
  const empty = real.entry.load
    ? real.entry.phase === "init"
      ? "正在初始化 Git 仓库..."
      : "正在准备工作区..."
    : real.entry.err || (real.path ? "没有可用工作区" : "缺少工作区路径")

  return (
    <>
      {session ? (
        real.workspace ? (
          <WorkbenchSession real={real} chat={chat} mode={mode} onMode={setMode} onOpenDiff={stage.diff} />
        ) : (
          <div className={common.empty}>{empty}</div>
        )
      ) : null}
      {stage.stage === "flowchart" ? (
        <Flow cur={stage.cur} id={stage.active} onRun={() => void stage.backtest()} />
      ) : null}
      {stage.stage === "code" ? (
        <CodePanel
          cur={stage.cur}
          workspace={real.workspace}
          sessionId={real.chat.selectedSessionId}
          path={stage.file}
          tab={stage.tab}
          onTab={stage.setTab}
        />
      ) : null}
      {stage.stage === "backtest" ? <Backtest cur={stage.cur} onRun={() => void stage.backtest()} /> : null}
      {stage.stage === "timeline" ? <TimelineStage cur={stage.cur} active={stage.active} /> : null}
      <Composer
        busy={session ? chat.busy : false}
        disabled={session ? real.chat.creating : false}
        submitting={session ? chat.submitting || real.chat.creating : false}
        value={session ? chat.draft.text : draft}
        mode={session ? mode : "narrow"}
        onAbort={session ? () => void real.abort() : undefined}
        onChange={session ? chat.draft.setText : setDraft}
        onSend={(text, review) => {
          if (!session) {
            stage.send(text, review)
            setDraft("")
            return
          }
          dispatch(updateSessionAbortStatus({ sessionId: real.chat.selectedSessionId || "", status: false }))
          void chat.submit({ text })
        }}
      />
    </>
  )
}
