import type { Automation, Run } from "./types.js"

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
