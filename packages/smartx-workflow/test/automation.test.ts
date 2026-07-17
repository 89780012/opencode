import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import { reviewResult } from "../src/parse.js"
import type { Run, SaveReview } from "../src/types.js"

function ctx() {
  return {
    client: {
      app: { log: async () => ({ data: true }) },
      session: { get: async () => ({ data: { parentID: undefined } }) },
    } as never,
    project: {} as never,
    directory: "f:/repo",
    worktree: "f:/repo",
    serverUrl: new URL("http://localhost:4096"),
    $: {} as never,
  }
}

function run(value: Partial<Run> = {}): Run {
  return {
    id: "workflow-1",
    workspacePath: "f:/repo",
    sessionId: "s1",
    codeRevision: "code-1",
    stage: "review",
    state: "requested",
    reviewRound: 0,
    debugId: "",
    backtestId: "",
    reviewEnabled: true,
    debugEnabled: true,
    backtestEnabled: true,
    summary: "",
    error: "",
    revision: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...value,
  }
}

function result(state: "passed" | "failed" = "passed") {
  const failed = state === "failed"
  return JSON.stringify({
    state,
    summary: failed ? "缺少止损保护" : "策略实现满足需求",
    items: [
      {
        name: "风险控制",
        status: failed ? "failed" : "passed",
        detail: failed ? "没有设置止损条件" : "止损条件完整",
        suggestion: failed ? "增加止损规则" : "",
      },
    ],
    suggestions: failed ? ["增加止损规则"] : [],
  })
}

function warning() {
  return JSON.stringify({
    state: "warning",
    summary: "策略存在边界风险",
    items: [
      {
        name: "历史数据窗口",
        status: "warning",
        detail: "查询范围可能超过需求窗口",
        suggestion: "限制回看天数",
      },
    ],
    suggestions: ["修复后重新审查"],
  })
}

describe("automatic workflow idle driver", () => {
  test("parses only valid structured Chinese review results", () => {
    expect(reviewResult(result())?.summary).toBe("策略实现满足需求")
    expect(reviewResult(warning())).toMatchObject({ state: "failed", summary: "策略存在边界风险" })
    expect(reviewResult('{"state":"passed","summary":"通过","items":[],"suggestions":[]}')).toBeUndefined()
    expect(
      reviewResult(
        '{"state":"passed","summary":"通过","items":[{"name":"风险","status":"failed","detail":"缺失","suggestion":"修复"}],"suggestions":[]}',
      ),
    ).toBeUndefined()
  })

  test("saves warning reviews through MCP and resumes the main agent to fix code", async () => {
    let current = run({ state: "dispatching" })
    const calls: string[] = []
    const dispatches: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async (name) => {
        calls.push(name)
        if (name === "save_review") return {}
        throw new Error(`unexpected call ${name}`)
      },
      dispatch: async (_session, action) => {
        dispatches.push(action)
      },
    })

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-warning" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    const output = { title: "", output: warning(), metadata: {} }
    await hooks["tool.execute.after"]?.(
      {
        sessionID: "s1",
        tool: "task",
        callID: "review-warning",
        args: { subagent_type: "strategy-reviewer" },
      },
      output,
    )

    expect(calls).toEqual(["save_review", "save_review"])
    expect(current).toMatchObject({ stage: "review", state: "fixing", reviewRound: 1 })
    expect(output.output).toBe("自动审查未通过：策略存在边界风险")
    expect(output.output).not.toContain("{")

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(dispatches).toEqual(["fix"])
  })

  test("dispatches one reviewer after idle and saves a sanitized result", async () => {
    let current = run()
    const dispatches: string[] = []
    const reviews: SaveReview[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      saveReview: async (input) => {
        reviews.push(input)
      },
      call: async (name) => {
        expect(name).toBe("get_requirements")
        return { requirements: ["实现止损保护"] }
      },
      dispatch: async (_session, action, prompt) => {
        expect(action).toBe("review")
        dispatches.push(prompt)
      },
    })

    const idle = {
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never
    await hooks.event?.(idle)
    await hooks.event?.(idle)

    expect(current.state).toBe("dispatching")
    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]).toContain("实现止损保护")

    await hooks["tool.execute.before"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1" },
      { args: { subagent_type: "strategy-reviewer" } },
    )
    const output = { title: "", output: result(), metadata: {} }
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-1", args: { subagent_type: "strategy-reviewer" } },
      output,
    )

    expect(reviews).toHaveLength(2)
    expect(reviews[1]).toMatchObject({ state: "passed", summary: "策略实现满足需求" })
    expect(current).toMatchObject({ stage: "debug", state: "requested", reviewRound: 1 })
    expect(output.output).toBe("自动审查通过：策略实现满足需求")
    expect(output.output).not.toContain("{")
  })

  test("creates the workflow from dirty code when the model stops before another transform", async () => {
    let current: Run | undefined
    let starts = 0
    const dispatches: string[] = []
    const dirty = new Map()
    const hooks = build(ctx(), {
      parent: async () => false,
      dirtyStates: dirty,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      startRun: async (input) => {
        starts++
        current = run({
          codeRevision: input.codeRevision,
          debugEnabled: false,
          backtestEnabled: false,
        })
        return current
      },
      updateRun: async (input) => {
        current = { ...current!, ...input, revision: current!.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async (name) => {
        expect(name).toBe("get_requirements")
        return { requirements: ["实现止损保护"] }
      },
      dispatch: async (_session, action) => {
        expect(action).toBe("review")
        dispatches.push(action)
      },
    })
    const idle = {
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "edit", callID: "edit-1", args: { filePath: "f:/repo/strategy.py" } },
      { title: "", output: "done", metadata: {} },
    )
    await hooks.event?.(idle)
    await hooks.event?.(idle)

    expect(starts).toBe(1)
    expect(dispatches).toEqual(["review"])
    expect(current).toMatchObject({ stage: "review", state: "dispatching" })
  })

  test("does not create a workflow for another idle session or disabled automation", async () => {
    let starts = 0
    const dirty = new Map([
      ["f:/repo\x00f:/repo", { state: "dirty" as const, updated: Date.now(), reason: "edit", session: "s1" }],
    ])
    const other = build(ctx(), {
      parent: async () => false,
      dirtyStates: dirty,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => undefined,
      startRun: async () => {
        starts++
        return run()
      },
    })
    const off = build(ctx(), {
      parent: async () => false,
      dirtyStates: dirty,
      workflow: async () => ({ baseline: false, review: false, debug: false, backtest: false }),
      loadRun: async () => undefined,
      startRun: async () => {
        starts++
        return run()
      },
    })

    await other.event?.({
      event: { type: "session.status", properties: { sessionID: "s2", status: { type: "idle" } } },
    } as never)
    await off.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(starts).toBe(0)
  })

  test("calls start logs and backtest directly through MCP after idle", async () => {
    let current = run({ stage: "debug", state: "requested", reviewRound: 1 })
    const calls: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async (name) => {
        calls.push(name)
        if (name === "start") {
          current = { ...current, state: "running", debugId: "debug-1", revision: current.revision + 1 }
          return { debugId: "debug-1", live: true }
        }
        if (name === "logs") return { state: "passed", summary: "未发现致命问题" }
        if (name === "run_backtest") {
          current = { ...current, state: "running", backtestId: "backtest-1", revision: current.revision + 1 }
          return { accepted: true }
        }
        throw new Error(`unexpected call ${name}`)
      },
    })

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(calls).toEqual(["start", "logs", "run_backtest"])
    expect(current).toMatchObject({ stage: "backtest", state: "running", backtestId: "backtest-1" })
  })

  test("fails closed and never exposes malformed reviewer JSON", async () => {
    let current = run({ state: "running", reviewRound: 1 })
    const reviews: SaveReview[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      saveReview: async (input) => {
        reviews.push(input)
      },
    })
    const output = { title: "", output: '{"state":"passed","items":[]}', metadata: {} }

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-bad", args: { subagent_type: "strategy-reviewer" } },
      output,
    )

    expect(reviews[0]).toMatchObject({ state: "error", summary: "审查结果格式异常，请重新审查。" })
    expect(current).toMatchObject({ stage: "done", state: "failed" })
    expect(output.output).toBe("自动审查未通过：审查结果格式异常，请重新审查。")
  })

  test("sanitizes reviewer output before a save failure can reach the session", async () => {
    let current = run({ state: "running", reviewRound: 1 })
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      saveReview: async () => {
        throw new Error("save failed")
      },
    })
    const output = { title: "", output: result(), metadata: {} }

    await expect(
      hooks["tool.execute.after"]?.(
        { sessionID: "s1", tool: "task", callID: "review-save-failed", args: { subagent_type: "strategy-reviewer" } },
        output,
      ),
    ).rejects.toThrow("save failed")

    expect(output.output).toBe("自动审查通过：策略实现满足需求")
    expect(output.output).not.toContain("{")
  })

  test("bounds idle repair resumes when the model makes no code change", async () => {
    let current = run({ state: "fixing", reviewRound: 1 })
    const scope = "f:/repo\x00f:/repo\x00s1"
    const fixes = new Map([
      [
        scope,
        {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          sessionID: "s1",
          attempt: 1,
          reviewText: "缺少止损保护",
          changed: false,
          resumes: 0,
        },
      ],
    ])
    const dispatches: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      reviewFixes: fixes,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      dispatch: async (_session, action) => {
        expect(action).toBe("fix")
        dispatches.push(action)
      },
    })
    const idle = {
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never

    await hooks.event?.(idle)
    await hooks.event?.(idle)
    await hooks.event?.(idle)

    expect(dispatches).toEqual(["fix", "fix"])
    expect(current).toMatchObject({ stage: "done", state: "failed", error: "自动修复连续两次未产生代码变更。" })
  })

  test("restores a fixing review from persisted session results after restart", async () => {
    let current = run({ state: "fixing", reviewRound: 1 })
    const scope = "f:/repo\x00f:/repo\x00s1"
    const fixes = new Map()
    const dispatches: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      reviewFixes: fixes,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async (name, args) => {
        expect(name).toBe("get_review")
        expect(args.sessionId).toBe("s1")
        return {
          sessionId: "s1",
          state: "failed",
          summary: "缺少止损保护",
          items: [{ name: "风险控制", status: "failed", detail: "没有设置止损条件", suggestion: "增加止损规则" }],
          suggestions: ["补充异常行情保护"],
        }
      },
      dispatch: async (_session, action) => {
        expect(action).toBe("fix")
        dispatches.push(action)
      },
    })

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(dispatches).toEqual(["fix"])
    expect(current).toMatchObject({ stage: "review", state: "fixing" })
    expect(fixes.get(scope)?.reviewText).toContain("增加止损规则")
  })
})
