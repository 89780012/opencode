import { useRef, useState } from "react"
import { useChatRuntime } from "@/hooks/use-chat-runtime"
import { selectRequirementReview, useAppDispatch, useAppSelector } from "@/store"
import { updateSessionAbortStatus } from "@/store/chat-session-slice"
import { clearRequirementReview, setStage } from "@/store/workbench-slice"
import common from "../../styles/session/session-common.module.css"
import { useStage } from "../../hooks/use-stage"
import { useWorkbenchChat } from "../../hooks/use-workbench-chat"
import { WorkbenchSession } from "../session"
import { Backtest } from "./backtest"
import { CodePanel } from "./code"
import { Composer } from "./composer"
import { Flow } from "./flow"
import { RequirementReview } from "./requirement-review"
import { TimelineStage } from "./timeline-stage"

const prompt = "需求已变更，请根据最新需求重新审查并修改策略代码。"

export function StageView() {
  const dispatch = useAppDispatch()
  const stage = useStage()
  const real = useWorkbenchChat()
  const [mode, setMode] = useState<"narrow" | "full">("narrow")
  const [reviewing, setReviewing] = useState(false)
  const gate = useRef(false)
  const chat = useChatRuntime({
    workspacePath: real.workspace?.path,
    sessionId: real.chat.selectedSessionId,
    status: real.chat.status,
    busy: real.chat.busy,
    createSession: real.chat.createSession,
    selectSession: real.chat.selectSession,
  })
  const path = real.workspace?.path ?? ""
  const revision = useAppSelector((state) => selectRequirementReview(state, path, stage.active))
  const aligned = !!stage.active && real.chat.selectedSessionId === stage.active
  const disabled = !aligned || chat.busy || chat.submitting || real.chat.creating
  const session = stage.stage === "session"
  const empty = real.entry.load
    ? real.entry.phase === "init"
      ? "正在初始化 Git 仓库..."
      : "正在准备工作区..."
    : real.entry.err || (real.path ? "没有可用工作区" : "缺少工作区路径")

  const send = async (text: string, clear = true) => {
    dispatch(updateSessionAbortStatus({ sessionId: real.chat.selectedSessionId || "", status: false }))
    dispatch(setStage("session"))
    return chat.submit({ text }, { clear })
  }

  const review = async () => {
    const id = stage.active
    const version = revision
    if (!path || !id || !version || disabled || gate.current) return
    gate.current = true
    setReviewing(true)
    try {
      if (!(await send(prompt, false))) return
      dispatch(clearRequirementReview({ workspacePath: path, sessionId: id, revision: version }))
    } finally {
      gate.current = false
      setReviewing(false)
    }
  }

  const close = () => {
    if (!path || !stage.active || !revision) return
    dispatch(
      clearRequirementReview({ workspacePath: path, sessionId: stage.active, revision }),
    )
  }

  return (
    <>
      {revision ? (
        <RequirementReview disabled={disabled} sending={reviewing} onClose={close} onReview={() => void review()} />
      ) : null}
      {session ? (
        real.workspace ? (
          <WorkbenchSession real={real} chat={chat} mode={mode} onMode={setMode} onOpenDiff={stage.diff} />
        ) : (
          <div className={common.empty}>{empty}</div>
        )
      ) : null}
      {stage.stage === "flowchart" ? (
        <Flow
          cur={stage.cur}
          flow={stage.flowchart}
          id={stage.active}
          busy={stage.testing}
          onRun={() => void stage.backtest()}
          onSave={stage.saveFlowchart}
        />
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
      {stage.stage === "backtest" ? (
        <Backtest cur={stage.cur} busy={stage.testing} onRun={() => void stage.backtest()} />
      ) : null}
      {stage.stage === "timeline" ? <TimelineStage cur={stage.cur} active={stage.active} /> : null}
      <Composer
        busy={chat.busy}
        disabled={real.chat.creating}
        submitting={chat.submitting || real.chat.creating}
        value={chat.draft.text}
        mode={session ? mode : "narrow"}
        onAbort={() => void real.abort()}
        onChange={chat.draft.setText}
        onSend={(text) => void send(text)}
      />
    </>
  )
}
