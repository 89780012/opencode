import type { Automation, Run, StageRequest } from "./types.js"

export type WorkflowStage = Exclude<Run["stage"], "done">

export function enabledStages(input: Pick<Automation, "review" | "debug" | "backtest">) {
  return [
    { enabled: input.review, stage: "review" as const },
    { enabled: input.debug, stage: "debug" as const },
    { enabled: input.backtest, stage: "backtest" as const },
  ]
    .filter((item) => item.enabled)
    .map((item) => item.stage)
}

export function nextStage(run: Run) {
  const stages = enabledStages({
    review: run.reviewEnabled,
    debug: run.debugEnabled,
    backtest: run.backtestEnabled,
  })
  const index = stages.indexOf(run.stage as WorkflowStage)
  const stage = index < 0 ? undefined : stages[index + 1]
  if (stage) return { stage, state: "requested" } as const
  return { stage: "done", state: "passed" } as const
}

/** 判断活动 Run 是否已经包含所有人工请求，且对应阶段尚未执行完。 */
export function planned(run: Run, input: StageRequest) {
  const order = ["review", "debug", "backtest"] as const
  const current = order.indexOf(run.stage as (typeof order)[number])
  return order.every((stage, index) => {
    if (!input[stage]) return true
    const enabled = stage === "review" ? run.reviewEnabled : stage === "debug" ? run.debugEnabled : run.backtestEnabled
    if (!enabled || index < current) return false
    return index !== current || run.state !== "passed"
  })
}
