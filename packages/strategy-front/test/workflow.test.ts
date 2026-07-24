import { describe, expect, test } from "bun:test"
import { parse } from "../src/components/workbench/hooks/use-workbench-workflow"
import { workflow } from "../src/components/workbench/hooks/use-workbench"
import { setWorkflow, upsertWorkflow, workbenchReducer } from "../src/store/workbench-slice"
import type { Workflow } from "../src/api/modules/workbench"

function row(value: Partial<Workflow> = {}): Workflow {
  return {
    id: "workflow-1",
    workspacePath: "workspace-a",
    sessionId: "session-a",
    codeRevision: "code-1",
    stage: "review",
    state: "requested",
    reviewRound: 0,
    revision: 1,
    createdAt: 1,
    updatedAt: 1,
    ...value,
  }
}

describe("workbench workflow", () => {
  test("parses valid rows and rejects invalid states", () => {
    expect(parse(row())?.id).toBe("workflow-1")
    expect(parse(row({ state: "dispatching" }))?.state).toBe("dispatching")
    expect(parse({ ...row(), stage: "unknown" })).toBeNull()
    expect(parse({ ...row(), state: "unknown" })).toBeNull()
    expect(
      parse(row({ reviewEnabled: true, debugEnabled: true, backtestEnabled: false })),
    ).toMatchObject({ reviewEnabled: true, debugEnabled: true, backtestEnabled: false })
  })

  test("merges revisions monotonically inside the active scope", () => {
    let state = workbenchReducer(
      undefined,
      setWorkflow({ workspacePath: "workspace-a", sessionId: "session-a", workflow: row({ revision: 2 }) }),
    )
    state = workbenchReducer(state, upsertWorkflow(row({ revision: 1, state: "running" })))
    expect(state.workflow).toMatchObject({ revision: 2, state: "requested" })
    state = workbenchReducer(state, upsertWorkflow(row({ revision: 3, stage: "debug", state: "running" })))
    expect(state.workflow).toMatchObject({ revision: 3, stage: "debug", state: "running" })
    state = workbenchReducer(
      state,
      setWorkflow({ workspacePath: "workspace-a", sessionId: "session-a", workflow: row({ revision: 2 }) }),
    )
    expect(state.workflow).toMatchObject({ revision: 3, stage: "debug" })
    state = workbenchReducer(
      state,
      setWorkflow({ workspacePath: "workspace-a", sessionId: "session-a", workflow: null }),
    )
    expect(state.workflow).toMatchObject({ revision: 3, stage: "debug" })
    state = workbenchReducer(
      state,
      upsertWorkflow(row({ workspacePath: "workspace-b", sessionId: "session-b", revision: 4 })),
    )
    expect(state.workflow).toMatchObject({ revision: 3, workspacePath: "workspace-a" })
  })

  test("keeps a newer socket run over a late HTTP snapshot", () => {
    let state = workbenchReducer(
      undefined,
      setWorkflow({
        workspacePath: "workspace-a",
        sessionId: "session-a",
        workflow: row({ id: "workflow-a", revision: 9, updatedAt: 10 }),
      }),
    )
    state = workbenchReducer(
      state,
      upsertWorkflow(row({ id: "workflow-b", codeRevision: "code-2", revision: 1, updatedAt: 20 })),
    )
    state = workbenchReducer(
      state,
      setWorkflow({
        workspacePath: "workspace-a",
        sessionId: "session-a",
        workflow: row({ id: "workflow-a", revision: 10, updatedAt: 10 }),
      }),
    )
    expect(state.workflow).toMatchObject({ id: "workflow-b", codeRevision: "code-2", updatedAt: 20 })
  })

  test("keeps historical workflow rows for older automatic message cards", () => {
    let state = workbenchReducer(
      undefined,
      setWorkflow({
        workspacePath: "workspace-a",
        sessionId: "session-a",
        workflow: row({ id: "workflow-a", stage: "done", state: "passed", updatedAt: 10 }),
      }),
    )
    state = workbenchReducer(
      state,
      upsertWorkflow(row({ id: "workflow-b", codeRevision: "code-2", revision: 1, updatedAt: 20 })),
    )
    expect(state.workflow).toMatchObject({ id: "workflow-b" })
    expect(state.workflows["workflow-a"]).toMatchObject({ id: "workflow-a", state: "passed" })
    expect(state.workflows["workflow-b"]).toMatchObject({ id: "workflow-b", state: "requested" })
  })

  test("labels completed pipelines as workflows instead of backtests", () => {
    expect(workflow(row({ stage: "done", state: "passed" })).type).toBe("workflow")
    expect(workflow(row({ stage: "backtest", state: "running" })).type).toBe("backtest")
  })

  test("shows a human dispatch message without exposing internal reviewer JSON", () => {
    const event = workflow(row({ state: "dispatching" }))
    expect(event.description).toBe("正在调度审查智能体")
    expect(event.description).not.toContain("{")
  })
})
