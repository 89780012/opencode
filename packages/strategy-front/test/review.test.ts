import { describe, expect, test } from "bun:test"
import { parse, scoped } from "../src/components/workbench/hooks/use-workbench-review"
import {
  rollbackReview,
  setReviewScope,
  setReviews,
  setSessions,
  startReview,
  upsertReview,
  workbenchReducer,
  type WorkbenchReview,
} from "../src/store/workbench-slice"

type State = ReturnType<typeof workbenchReducer>

function review(value: Partial<WorkbenchReview> = {}): WorkbenchReview {
  return {
    id: "review-1",
    workspacePath: "workspace-a",
    worktreePath: "workspace-a",
    reviewId: "review-1",
    sessionId: "session-a",
    state: "running",
    summary: "",
    items: [],
    suggestions: [],
    updatedAt: 1,
    ...value,
  }
}

function scope(path = "workspace-a", ids = ["session-a"]) {
  const state = workbenchReducer(
    undefined,
    setSessions({
      workspacePath: path,
      sessions: ids.map((id) => ({
        id,
        title: id,
        workspacePath: path,
        requirements: [],
        createdAt: 1,
        updatedAt: 1,
      })),
    }),
  )
  return workbenchReducer(state, setReviewScope({ workspacePath: path }))
}

function put(state: State, item: WorkbenchReview) {
  return workbenchReducer(state, upsertReview({ workspacePath: item.workspacePath, review: item }))
}

describe("workbench review", () => {
  test("keeps terminal state when older or equal running events arrive later", () => {
    const done = put(scope(), review({ state: "passed", updatedAt: 200 }))
    const old = put(done, review({ state: "running", updatedAt: 100 }))
    const same = put(done, review({ state: "running", updatedAt: 200 }))

    expect(old.reviews[0].state).toBe("passed")
    expect(old.reviews[0].updatedAt).toBe(200)
    expect(same.reviews[0].state).toBe("passed")
  })

  test("merges a stale snapshot without removing realtime records", () => {
    const live = put(scope(), review({ id: "review-live", state: "passed", updatedAt: 300 }))
    const next = workbenchReducer(
      live,
      setReviews({
        workspacePath: "workspace-a",
        reviews: [
          review({ id: "review-live", state: "running", updatedAt: 100 }),
          review({ id: "review-old", state: "failed", updatedAt: 50 }),
        ],
      }),
    )

    expect(next.reviews.map((item) => item.id)).toEqual(["review-live", "review-old"])
    expect(next.reviews[0].state).toBe("passed")
    expect(next.reviews[0].updatedAt).toBe(300)
  })

  test("deduplicates pending requests and replaces pending with server state", () => {
    const first = workbenchReducer(
      scope(),
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_1", updatedAt: 100 }),
    )
    const second = workbenchReducer(
      first,
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_2", updatedAt: 101 }),
    )
    const next = put(second, review({ id: "review-real", state: "running", updatedAt: 102 }))

    expect(first.reviews.map((item) => item.id)).toEqual(["pending_1"])
    expect(second.reviews.map((item) => item.id)).toEqual(["pending_1"])
    expect(next.reviews.map((item) => item.id)).toEqual(["review-real"])
  })

  test("pairs realtime reviews with pending requests from the same session", () => {
    const state = scope("workspace-a", ["session-a", "session-b"])
    const first = workbenchReducer(
      state,
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_a", updatedAt: 100 }),
    )
    const second = workbenchReducer(
      first,
      startReview({ workspacePath: "workspace-a", sessionId: "session-b", id: "pending_b", updatedAt: 101 }),
    )
    const other = put(second, review({ id: "review-b", reviewId: "review-b", sessionId: "session-b", updatedAt: 102 }))
    const own = put(other, review({ id: "review-a", reviewId: "review-a", sessionId: "session-a", updatedAt: 103 }))

    expect(second.reviews.filter((item) => item.id.startsWith("pending_")).map((item) => item.sessionId)).toEqual([
      "session-b",
      "session-a",
    ])
    expect(other.reviews.map((item) => item.id)).toEqual(["review-b", "pending_a"])
    expect(own.reviews.map((item) => item.id)).toEqual(["review-a", "review-b"])
  })

  test("pairs snapshots with pending requests from the same session", () => {
    const state = scope("workspace-a", ["session-a", "session-b"])
    const first = workbenchReducer(
      state,
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_a", updatedAt: 100 }),
    )
    const second = workbenchReducer(
      first,
      startReview({ workspacePath: "workspace-a", sessionId: "session-b", id: "pending_b", updatedAt: 101 }),
    )
    const next = workbenchReducer(
      second,
      setReviews({
        workspacePath: "workspace-a",
        reviews: [review({ id: "review-b", reviewId: "review-b", sessionId: "session-b", updatedAt: 102 })],
      }),
    )

    expect(next.reviews.map((item) => item.id)).toEqual(["review-b", "pending_a"])
  })

  test("accepts same-session reviews from another worktree", () => {
    const state = workbenchReducer(
      scope(),
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_a", updatedAt: 100 }),
    )
    const event = put(state, review({ worktreePath: "worktree-b", updatedAt: 200 }))
    const snapshot = workbenchReducer(
      state,
      setReviews({
        workspacePath: "workspace-a",
        reviews: [review({ worktreePath: "worktree-b", updatedAt: 200 })],
      }),
    )

    expect(event.reviews.map((item) => item.id)).toEqual(["review-1"])
    expect(snapshot.reviews.map((item) => item.id)).toEqual(["review-1"])
  })

  test("selects current and historical reviews by session regardless of worktree", () => {
    const rows = scoped(
      [
        review({ id: "review-a", worktreePath: "/", sessionId: "session-a" }),
        review({ id: "review-b", worktreePath: "workspace-a", sessionId: "session-b" }),
      ],
      "workspace-a",
      "session-a",
    )

    expect(rows.map((item) => item.id)).toEqual(["review-a"])
  })

  test("allows a new request when only an older historical review is running", () => {
    const old = put(scope(), review({ id: "review-old", state: "running", updatedAt: 10 }))
    const done = put(old, review({ id: "review-new", state: "passed", updatedAt: 20 }))
    const next = workbenchReducer(
      done,
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_1", updatedAt: 30 }),
    )

    expect(next.reviews[0].id).toBe("pending_1")
  })

  test("rolls back only the matching pending request", () => {
    const old = put(scope(), review({ id: "review-old", state: "passed", updatedAt: 10 }))
    const started = workbenchReducer(
      old,
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_1", updatedAt: 100 }),
    )
    const missed = workbenchReducer(started, rollbackReview({ workspacePath: "workspace-a", id: "pending_2" }))
    const next = workbenchReducer(missed, rollbackReview({ workspacePath: "workspace-a", id: "pending_1" }))

    expect(missed.reviews.some((item) => item.id === "pending_1")).toBe(true)
    expect(next.reviews.map((item) => item.id)).toEqual(["review-old"])
  })

  test("rejects pending and snapshots outside the loaded scope", () => {
    const state = scope()
    const unscoped = workbenchReducer(
      workbenchReducer(undefined, setSessions({ workspacePath: "workspace-a", sessions: state.sessions })),
      startReview({ workspacePath: "workspace-a", sessionId: "session-a", id: "pending_0", updatedAt: 100 }),
    )
    const wrong = workbenchReducer(
      state,
      startReview({ workspacePath: "workspace-b", sessionId: "session-a", id: "pending_1", updatedAt: 100 }),
    )
    const missing = workbenchReducer(
      state,
      startReview({ workspacePath: "workspace-a", sessionId: "session-b", id: "pending_2", updatedAt: 100 }),
    )
    const snapshot = workbenchReducer(
      state,
      setReviews({ workspacePath: "workspace-b", reviews: [review({ workspacePath: "workspace-b" })] }),
    )

    expect(unscoped.reviews).toEqual([])
    expect(wrong).toBe(state)
    expect(missing).toBe(state)
    expect(snapshot).toBe(state)
  })

  test("preserves review identity and validates aggregate state", () => {
    const valid = parse({
      id: "row-a",
      workspacePath: "workspace-a",
      worktreePath: "workspace-a",
      reviewId: "review-a",
      sessionId: "session-a",
      state: "failed",
      summary: "failed with warnings",
      items: [{ name: "risk", status: "warning", detail: "risk found" }],
      suggestions: [],
      updatedAt: 100,
    })
    const empty = parse({
      workspacePath: "workspace-a",
      state: "passed",
      items: [],
    })
    const mismatch = parse({
      workspacePath: "workspace-a",
      state: "passed",
      summary: "mismatch",
      items: [{ name: "risk", status: "warning", detail: "risk found" }],
    })
    const blank = parse({
      workspacePath: "workspace-a",
      state: "passed",
      summary: " ",
      items: [{ name: "quality", status: "passed", detail: "looks good" }],
    })
    const invalid = parse({
      workspacePath: "workspace-a",
      state: "passed",
      summary: "passed",
      items: [{ name: "risk", status: "unknown", detail: "risk found" }],
    })

    expect(valid?.reviewId).toBe("review-a")
    expect(valid?.sessionId).toBe("session-a")
    expect(valid?.state).toBe("failed")
    expect(empty?.state).toBe("error")
    expect(mismatch?.state).toBe("error")
    expect(blank?.state).toBe("error")
    expect(invalid).toBeNull()
  })
})
