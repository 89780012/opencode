import { type CSSProperties } from "react"
import { Review } from "./features/review"
import { Side } from "./features/side"
import { StageView } from "./features/stage"
import { usePanels } from "./hooks/use-panels"
import { useWorkbenchAnalysisSync } from "./hooks/use-workbench-analysis"
import { useWorkbenchBacktestSync } from "./hooks/use-workbench-backtest"
import { useWorkbenchFlowchartSync } from "./hooks/use-workbench-flowchart"
import { useWorkbenchQuestionSync } from "./hooks/use-workbench-question"
import { useWorkbenchReviewSync } from "./hooks/use-workbench-review"
import { useWorkbenchSessionSync } from "./hooks/use-workbench-session-sync"
import { useWorkbenchWorkflowSync } from "./hooks/use-workbench-workflow"
import { Handle } from "./layout/handle"
import { Topbar } from "./layout/topbar"
import shell from "./styles/layout/shell.module.css"

export function Workbench(props: { hidden?: boolean }) {
  useWorkbenchSessionSync()
  useWorkbenchQuestionSync()
  useWorkbenchAnalysisSync()
  useWorkbenchBacktestSync()
  useWorkbenchWorkflowSync()
  useWorkbenchFlowchartSync()
  const review = useWorkbenchReviewSync()

  const panel = usePanels()

  return (
    <>
      <div className={shell.pane} hidden={props.hidden}>
        <div
          className={shell.shell}
          data-workbench
          style={
            {
              "--left": `${panel.left.w}px`,
            } as CSSProperties
          }
        >
          <Side />

          <Handle
            onDown={panel.left.onDown}
            onKey={panel.left.onKey}
            active={panel.left.active}
            min={220}
            max={460}
            width={panel.left.w}
            label="Resize left panel"
          />

          <main className={shell.main}>
            <Topbar />
            <StageView />
          </main>
        </div>
      </div>
      <Review
        hidden={props.hidden}
        open={panel.right.open}
        width={panel.right.w}
        resizing={panel.right.active}
        onDown={panel.right.onDown}
        onKey={panel.right.onKey}
        onQuery={review.query}
        onClose={() => panel.right.setOpen(false)}
        onOpen={() => panel.right.setOpen(true)}
        querying={review.loading}
        queryable={review.ready}
      />
    </>
  )
}
