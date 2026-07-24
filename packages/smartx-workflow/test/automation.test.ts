import { describe, expect, test } from "bun:test"
import { build } from "../src/hooks.js"
import type { Pending, Run, SaveReview } from "../src/types.js"

function ctx(prompts: unknown[] = [], messages: unknown[] = []) {
  return {
    client: {
      app: { log: async () => ({ data: true }) },
      session: {
        get: async () => ({ data: { parentID: undefined } }),
        promptAsync: async (input: unknown) => {
          prompts.push(input)
          return { data: true }
        },
        messages: async () => ({ data: messages }),
      },
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
  return failed
    ? "审查结论：未通过\n\n## 风险控制\n没有设置止损条件。\n\n建议：增加止损规则。"
    : "审查结论：通过\n\n## 风险控制\n止损条件完整，策略实现满足需求。"
}

function warning() {
  return "审查结论：未通过\n\n历史数据窗口存在边界风险，查询范围可能超过需求窗口。\n\n建议限制回看天数。"
}

describe("automatic workflow idle driver", () => {
  test("does not resume a cancelled workflow after the abort idle event", async () => {
    const calls: string[] = []
    const dispatches: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: true, backtest: true }),
      loadRun: async () => run({ state: "cancelled" }),
      call: async (name) => {
        calls.push(name)
        return {}
      },
      dispatch: async (_session, action) => {
        dispatches.push(action)
      },
    })

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(calls).toEqual([])
    expect(dispatches).toEqual([])
  })

  test("uses the restored third review round when saving a delayed warning report", async () => {
    const scope = "f:/repo\x00f:/repo\x00s1"
    const pending = new Map<string, Pending>([
      [
        scope,
        {
          kind: "review",
          reviewId: "review-3",
          sessionId: "s1",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          reviewText: warning(),
        },
      ],
    ])
    const runs = new Map([[scope, run({ state: "running", reviewRound: 2 })]])
    const fixes = new Map([
      [
        scope,
        {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          sessionID: "s1",
          attempt: 1,
          reviewText: warning(),
          changed: true,
          resumes: 0,
        },
      ],
    ])
    let current = run({ state: "running", reviewRound: 3 })
    const updates: Partial<Run>[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
      runs,
      reviewFixes: fixes,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        updates.push(input)
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
    })
    const save = {
      args: {
        reviewId: "review-3",
        sessionId: "s1",
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        state: "failed",
        summary: "第三轮仍存在边界风险",
        items: [{ name: "历史窗口", status: "warning", detail: "范围超出需求", suggestion: "限制窗口" }],
        suggestions: ["限制窗口后重新审查"],
      },
    }

    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "save-3" }, save)
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_save_review", callID: "save-3", args: save.args },
      { title: "", output: "{}", metadata: {} },
    )

    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ stage: "review", state: "review_exhausted", reviewRound: 3 })
    expect(current).toMatchObject({ stage: "review", state: "review_exhausted", reviewRound: 3 })
    expect(fixes.has(scope)).toBe(false)
  })

  test("rejects another reviewer after the third round starts", async () => {
    const current = run({ state: "fixing", reviewRound: 3 })
    const hooks = build(ctx(), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
    })

    await expect(
      hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: "review-4" },
        { args: { subagent_type: "strategy-reviewer" } },
      ),
    ).rejects.toThrow("review limit reached")
  })

  test("counts a new manual review chain from one after the previous workflow stops", async () => {
    const scope = "f:/repo\x00f:/repo\x00s1"
    const reviews: SaveReview[] = []
    const pending = new Map<string, Pending>()
    const fixes = new Map()
    const current = run({ state: "review_exhausted", reviewRound: 3 })
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
      reviewFixes: fixes,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      saveReview: async (input) => {
        reviews.push(input)
      },
    })

    const audit = async (round: number) => {
      const id = `manual-review-${round}`
      await hooks["tool.execute.before"]?.(
        { sessionID: "s1", tool: "task", callID: id },
        { args: { subagent_type: "strategy-reviewer" } },
      )
      await hooks["tool.execute.after"]?.(
        { sessionID: "s1", tool: "task", callID: id, args: { subagent_type: "strategy-reviewer" } },
        { title: "", output: result("failed"), metadata: {} },
      )
      const save = {
        args: {
          reviewId: id,
          sessionId: "s1",
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          state: "failed",
          summary: `第 ${round} 轮手工审查发现风险`,
          items: [{ name: "风险控制", status: "failed", detail: "缺少止损", suggestion: "增加止损规则" }],
          suggestions: ["修复后重新审查"],
        },
      }
      await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: `save-${id}` }, save)
      await hooks["tool.execute.after"]?.(
        { sessionID: "s1", tool: "smartx_save_review", callID: `save-${id}`, args: save.args },
        { title: "", output: "{}", metadata: {} },
      )
    }

    await audit(1)
    expect(reviews[0]).toMatchObject({ reviewId: "manual-review-1", state: "running" })
    expect(fixes.get(scope)).toMatchObject({ attempt: 1 })
    await audit(2)
    expect(fixes.get(scope)).toMatchObject({ attempt: 2 })
    await audit(3)
    expect(reviews).toHaveLength(3)
    expect(pending.has(scope)).toBe(false)
    expect(fixes.has(scope)).toBe(false)
    expect(current).toMatchObject({ state: "review_exhausted", reviewRound: 3 })
  })

  test("waits for the main agent to save a failed reviewer report before fixing", async () => {
    let current = run({ state: "dispatching" })
    const calls: string[] = []
    const dispatches: string[] = []
    const pending = new Map<string, Pending>()
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
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

    expect(calls).toEqual(["save_review"])
    expect(current).toMatchObject({ stage: "review", state: "running", reviewRound: 1 })
    expect(pending.get("f:/repo\x00f:/repo\x00s1")).toMatchObject({ kind: "review", reviewText: warning() })

    const save = {
      args: {
        reviewId: "review-warning",
        sessionId: "s1",
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        state: "failed",
        summary: "策略存在边界风险",
        items: [
          { name: "历史数据窗口", status: "warning", detail: "查询范围可能超过需求窗口", suggestion: "限制回看天数" },
        ],
        suggestions: ["修复后重新审查"],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "save-1" }, save)
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_save_review", callID: "save-1", args: save.args },
      { title: "", output: "{}", metadata: {} },
    )

    expect(current).toMatchObject({ stage: "review", state: "fixing", reviewRound: 1 })
    expect(pending.has("f:/repo\x00f:/repo\x00s1")).toBe(false)

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(dispatches).toEqual(["fix"])
  })

  test("dispatches one reviewer and lets the main agent save its plain text report", async () => {
    let current = run()
    const dispatches: string[] = []
    const reviews: SaveReview[] = []
    const pending = new Map<string, Pending>()
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
      projects: new Map([
        ["f:/repo\x00f:/repo", { workspace: "f:/repo", worktree: "f:/repo", hasProjectState: true, updated: 1 }],
      ]),
      memory: new Map([["f:/repo\x00f:/repo", { hasProjectState: true, hasRestoredState: true, needsSave: false }]]),
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

    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ state: "running" })
    expect(pending.get("f:/repo\x00f:/repo\x00s1")).toMatchObject({ kind: "review", reviewText: result() })
    expect(current).toMatchObject({ stage: "review", state: "running", reviewRound: 1 })

    const note = { system: [] as string[] }
    await hooks["experimental.chat.system.transform"]?.({ sessionID: "s1", model: {} as never }, note)
    expect(note.system.join("\n")).toContain(result())
    expect(note.system.join("\n")).toContain("smartx_save_review")

    const save = {
      args: {
        reviewId: "review-1",
        sessionId: "s1",
        workspacePath: "f:/repo",
        worktreePath: "f:/repo",
        state: "passed",
        summary: "策略实现满足需求",
        items: [{ name: "风险控制", status: "passed", detail: "止损条件完整", suggestion: "" }],
        suggestions: [],
      },
    }
    await hooks["tool.execute.before"]?.({ sessionID: "s1", tool: "smartx_save_review", callID: "save-1" }, save)
    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "smartx_save_review", callID: "save-1", args: save.args },
      { title: "", output: "{}", metadata: {} },
    )
    expect(current).toMatchObject({ stage: "debug", state: "requested", reviewRound: 1 })
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

  test("marks runtime activity without creating another code review revision", async () => {
    let current = run({ stage: "done", state: "passed", debugEnabled: false, backtestEnabled: false })
    let starts = 0
    const dirty = new Map()
    const hooks = build(ctx(), {
      parent: async () => false,
      dirtyStates: dirty,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      startRun: async (input) => {
        starts++
        current = run({ codeRevision: input.codeRevision, debugEnabled: false, backtestEnabled: false })
        return current
      },
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async () => ({ requirements: [] }),
      dispatch: async () => {},
    })
    const idle = {
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "bash", callID: "debug-1", args: { command: "bun test" } },
      { title: "", output: "done", metadata: {} },
    )
    await hooks.event?.(idle)

    expect(starts).toBe(0)
    expect(dirty.get("f:/repo\x00f:/repo")).toMatchObject({ state: "dirty", revision: 0, reason: "bash" })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "edit", callID: "edit-1", args: { filePath: "f:/repo/strategy.py" } },
      { title: "", output: "done", metadata: {} },
    )
    await hooks["tool.execute.after"]?.(
      { sessionID: "s2", tool: "bash", callID: "debug-2", args: { command: "bun test" } },
      { title: "", output: "done", metadata: {} },
    )
    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s2", status: { type: "idle" } } },
    } as never)

    expect(starts).toBe(0)
    expect(dirty.get("f:/repo\x00f:/repo")).toMatchObject({ owner: "s1", session: "s2", reason: "bash" })

    await hooks.event?.(idle)

    expect(starts).toBe(1)
    expect(current.codeRevision).not.toBe("code-1")
  })

  test("keeps automatic repair writes inside the current workflow revision", async () => {
    const id = "f:/repo\x00f:/repo"
    const scope = `${id}\x00s1`
    let current = run({ codeRevision: "100", state: "fixing", reviewRound: 1, updatedAt: 200 })
    let starts = 0
    const dirty = new Map([
      [id, { state: "dirty" as const, updated: 100, revision: 100, owner: "s1", reason: "edit", session: "s1" }],
    ])
    const fixes = new Map([
      [
        scope,
        {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          sessionID: "s1",
          attempt: 1,
          reviewText: warning(),
          changed: false,
          resumes: 0,
        },
      ],
    ])
    const runs = new Map([[scope, current]])
    const hooks = build(ctx(), {
      parent: async () => false,
      dirtyStates: dirty,
      reviewFixes: fixes,
      runs,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      startRun: async () => {
        starts++
        return run()
      },
    })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "edit", callID: "repair-1", args: { filePath: "f:/repo/strategy.py" } },
      { title: "", output: "done", metadata: {} },
    )

    expect(dirty.get(id)).toMatchObject({ revision: 100, owner: "s1" })
    expect(fixes.get(scope)).toMatchObject({ changed: true })

    current = run({ codeRevision: "100", stage: "done", state: "passed", reviewRound: 2, updatedAt: Date.now() })
    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(starts).toBe(0)
  })

  test("tags automatic reviewer messages with the workflow identity", async () => {
    let current = run()
    const prompts: unknown[] = []
    const hooks = build(ctx(prompts), {
      parent: async () => false,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      call: async () => ({ requirements: ["实现止损保护"] }),
    })

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    const input = prompts[0] as {
      body: { parts: Array<{ metadata?: Record<string, unknown> }> }
    }
    expect(input.body.parts[0]?.metadata).toEqual({
      smartxWorkflowId: "workflow-1",
      smartxWorkflowAction: "review",
    })
  })

  test("does not treat a fixing-stage debug command as a code repair", async () => {
    let current = run({ state: "fixing", reviewRound: 1, debugEnabled: false, backtestEnabled: false })
    const scope = "f:/repo\x00f:/repo\x00s1"
    const fixes = new Map([
      [
        scope,
        {
          workspacePath: "f:/repo",
          worktreePath: "f:/repo",
          sessionID: "s1",
          attempt: 1,
          reviewText: "需要补充止损规则。",
          changed: false,
          resumes: 0,
        },
      ],
    ])
    const actions: string[] = []
    const hooks = build(ctx(), {
      parent: async () => false,
      reviewFixes: fixes,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      dispatch: async (_session, action) => {
        actions.push(action)
      },
    })

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "bash", callID: "debug-fix", args: { command: "bun test" } },
      { title: "", output: "done", metadata: {} },
    )
    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(fixes.get(scope)).toMatchObject({ changed: false, resumes: 1 })
    expect(actions).toEqual(["fix"])
    expect(current).toMatchObject({ stage: "review", state: "fixing" })
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

  test("accepts a free-form reviewer report without parsing it as JSON", async () => {
    let current = run({ state: "running", reviewRound: 1 })
    const reviews: SaveReview[] = []
    const pending = new Map<string, Pending>()
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
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
    const output = { title: "", output: "审查结论：未通过\n\n缺少异常行情保护，建议增加熔断处理。", metadata: {} }

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-bad", args: { subagent_type: "strategy-reviewer" } },
      output,
    )

    expect(reviews).toHaveLength(0)
    expect(current).toMatchObject({ stage: "review", state: "running" })
    expect(pending.get("f:/repo\x00f:/repo\x00s1")).toMatchObject({ kind: "review", reviewText: output.output })
  })

  test("keeps a reviewer report pending until MCP save succeeds", async () => {
    let current = run({ state: "running", reviewRound: 1 })
    const pending = new Map<string, Pending>()
    const hooks = build(ctx(), {
      parent: async () => false,
      pending,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
    })
    const output = { title: "", output: result(), metadata: {} }

    await hooks["tool.execute.after"]?.(
      { sessionID: "s1", tool: "task", callID: "review-save-failed", args: { subagent_type: "strategy-reviewer" } },
      output,
    )

    expect(pending.has("f:/repo\x00f:/repo\x00s1")).toBe(true)
    expect(current).toMatchObject({ stage: "review", state: "running" })
  })

  test("restores a completed reviewer handoff from persisted session messages", async () => {
    let current = run({ state: "running", reviewRound: 1, debugEnabled: false, backtestEnabled: false })
    const pending = new Map<string, Pending>()
    const actions: string[] = []
    const messages = [
      {
        info: { id: "user-old", role: "user", time: { created: 10 } },
        parts: [
          {
            id: "marker-old",
            messageID: "user-old",
            sessionID: "s1",
            type: "text",
            text: "",
            synthetic: true,
            ignored: true,
            metadata: { smartxWorkflowId: "workflow-1", smartxWorkflowAction: "review" },
          },
        ],
      },
      {
        info: {
          id: "assistant-old",
          role: "assistant",
          parentID: "user-old",
          time: { created: 11, completed: 12 },
        },
        parts: [
          {
            id: "review-old",
            messageID: "assistant-old",
            sessionID: "s1",
            type: "tool",
            callID: "task-call",
            tool: "task",
            state: {
              status: "completed",
              input: { subagent_type: "strategy-reviewer" },
              output: "审查结论：未通过\n\n旧报告。",
              title: "策略审查",
              metadata: {},
              time: { start: 11, end: 12 },
            },
          },
        ],
      },
      {
        info: { id: "user-review", role: "user", time: { created: 20 } },
        parts: [
          {
            id: "marker-review",
            messageID: "user-review",
            sessionID: "s1",
            type: "text",
            text: "",
            synthetic: true,
            ignored: true,
            metadata: { smartxWorkflowId: "workflow-1", smartxWorkflowAction: "review" },
          },
        ],
      },
      {
        info: {
          id: "assistant-review",
          role: "assistant",
          parentID: "user-review",
          time: { created: 21, completed: 22 },
        },
        parts: [
          {
            id: "review-restart",
            messageID: "assistant-review",
            sessionID: "s1",
            type: "tool",
            callID: "task-call",
            tool: "task",
            state: {
              status: "completed",
              input: { subagent_type: "strategy-reviewer" },
              output: result(),
              title: "策略审查",
              metadata: {},
              time: { start: 21, end: 22 },
            },
          },
        ],
      },
    ].reverse()
    const hooks = build(ctx([], messages), {
      parent: async () => false,
      pending,
      workflow: async () => ({ baseline: false, review: true, debug: false, backtest: false }),
      loadRun: async () => current,
      updateRun: async (input) => {
        current = { ...current, ...input, revision: current.revision + 1, updatedAt: Date.now() }
        return current
      },
      dispatch: async (_session, action) => {
        actions.push(action)
      },
    })

    await hooks.event?.({
      event: { type: "session.status", properties: { sessionID: "s1", status: { type: "idle" } } },
    } as never)

    expect(pending.get("f:/repo\x00f:/repo\x00s1")).toMatchObject({
      kind: "review",
      reviewId: "review-restart",
      reviewText: result(),
    })
    expect(actions).toEqual(["fix"])
    expect(current).toMatchObject({ stage: "review", state: "running" })
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
    expect(current).toMatchObject({ stage: "review", state: "failed", error: "自动修复连续两次未产生代码变更。" })
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
