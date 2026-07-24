import type { Workflow } from "@/api/modules/workbench"
import type { WorkbenchReview } from "@/store/workbench-slice"
import type { BacktestRun } from "@/types/backtest"

export type WorkflowStage = "review" | "debug" | "backtest"
export type WorkflowStageState = "pending" | "running" | "done" | "error"

export function fallback(row?: Workflow | null) {
  if (row) return
  return {
    title: "历史自动流程",
    detail: "该流程的历史状态快照未加载，执行结果未知。",
    state: "neutral" as const,
  }
}

export function terminal(state: WorkflowStageState) {
  if (state === "done" || state === "error") return state
}

const rank = { review: 1, debug: 2, backtest: 3 } as const

function failure(row: Workflow, review?: WorkbenchReview, backtest?: BacktestRun): WorkflowStage | undefined {
  if (row.state !== "failed" && row.state !== "review_exhausted" && row.state !== "cancelled") return
  if (row.stage !== "done") return row.stage
  if (backtest?.status === "failed" || row.backtestId) return "backtest"
  if (row.debugId) return "debug"
  if (review && review.state !== "passed" && review.state !== "idle" && review.state !== "running") return "review"
  if (review?.state === "passed") return row.debugEnabled ? "debug" : "backtest"
  if (row.reviewEnabled) return "review"
  if (row.debugEnabled) return "debug"
  return "backtest"
}

export function view(row: Workflow, review?: WorkbenchReview, backtest?: BacktestRun) {
  const failed = failure(row, review, backtest)
  const done = row.stage === "done" && row.state === "passed"
  const current = row.stage === "done" ? 4 : rank[row.stage]
  const state = (stage: WorkflowStage): WorkflowStageState => {
    if (failed) {
      if (rank[stage] < rank[failed]) return "done"
      if (stage === failed) return "error"
      return "pending"
    }
    if (done || rank[stage] < current) return "done"
    if (rank[stage] > current) return "pending"
    if (row.state === "passed") return "done"
    return "running"
  }
  return {
    failed,
    review: state("review"),
    debug: state("debug"),
    backtest: state("backtest"),
  }
}
