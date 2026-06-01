import common from "../../styles/session/session-common.module.css"
import { WorkbenchSession } from "../session"
import { useStage } from "../../hooks/use-stage"
import { useWorkbenchChat } from "../../hooks/use-workbench-chat"
import { Backtest } from "./backtest"
import { CodePanel } from "./code"
import { Composer } from "./composer"
import { Flow } from "./flow"
import { TimelineStage } from "./timeline-stage"

export function StageView() {
  const stage = useStage()
  const real = useWorkbenchChat()

  return (
    <>
      {stage.stage === "session" ? (
        real.workspace ? (
          <WorkbenchSession real={real} onOpenDiff={stage.diff} />
        ) : (
          <div className={common.empty}>{real.list.loading ? "正在加载工作区..." : real.list.error || "没有可用工作区"}</div>
        )
      ) : null}
      {stage.stage === "flowchart" ? <Flow cur={stage.cur} id={stage.active} onRun={() => void stage.backtest()} /> : null}
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
      {stage.stage !== "session" && stage.stage !== "timeline" ? <Composer onSend={stage.send} /> : null}
    </>
  )
}
