import { describe, expect, test } from "bun:test"
import { selectRequirementReview, store } from "../src/store"
import {
  clearRequirementReview,
  deleteSession,
  markRequirementReview,
  setRequirements,
  setSessions,
  workbenchReducer,
} from "../src/store/workbench-slice"

type State = ReturnType<typeof workbenchReducer>

function root(state: State) {
  return { ...store.getState(), workbench: state }
}

function load(workspacePath = "workspace-a", id = "session-a", requirements = ["old-a"]) {
  return workbenchReducer(
    undefined,
    setSessions({
      workspacePath,
      sessions: [
        {
          id,
          title: id,
          workspacePath,
          requirements,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
  )
}

function mark(state: State, workspacePath = "workspace-a", sessionId = "session-a") {
  return workbenchReducer(state, markRequirementReview({ workspacePath, sessionId }))
}

describe("workbench requirements", () => {
  test("updates only the matching workspace session", () => {
    const initial = workbenchReducer(undefined, { type: "test.init" })
    const loaded = workbenchReducer(
      initial,
      setSessions({
        workspacePath: "workspace-a",
        sessions: [
          {
            id: "session-a",
            title: "A",
            workspacePath: "workspace-a",
            requirements: ["old-a"],
            createdAt: 1,
            updatedAt: 1,
          },
          {
            id: "session-b",
            title: "B",
            workspacePath: "workspace-a",
            requirements: ["old-b"],
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      }),
    )
    const next = workbenchReducer(
      loaded,
      setRequirements({ workspacePath: "workspace-a", sessionId: "session-a", requirements: ["new-a"] }),
    )

    expect(next.sessions[0].requirements).toEqual(["new-a"])
    expect(next.sessions[1].requirements).toEqual(["old-b"])

    const stale = workbenchReducer(
      next,
      setRequirements({ workspacePath: "workspace-b", sessionId: "session-a", requirements: ["wrong"] }),
    )
    expect(stale.sessions[0].requirements).toEqual(["new-a"])
    expect(selectRequirementReview(root(stale), "workspace-a", "session-a")).toBe(0)
  })

  test("isolates pending reviews by workspace and session", () => {
    const first = mark(load())
    const loaded = workbenchReducer(
      first,
      setSessions({
        workspacePath: "workspace-b",
        sessions: [
          {
            id: "session-b",
            title: "B",
            workspacePath: "workspace-b",
            requirements: ["old-b"],
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      }),
    )
    const next = mark(loaded, "workspace-b", "session-b")

    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(1)
    expect(selectRequirementReview(root(next), "workspace-a", "session-b")).toBe(0)
    expect(selectRequirementReview(root(next), "workspace-b", "session-a")).toBe(0)
    expect(selectRequirementReview(root(next), "workspace-b", "session-b")).toBe(1)
  })

  test("does not mark an unchanged requirement list", () => {
    const initial = load()
    const next = workbenchReducer(
      initial,
      setRequirements({ workspacePath: "workspace-a", sessionId: "session-a", requirements: ["old-a"] }),
    )

    expect(next).toBe(initial)
    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(0)
  })

  test("does not clear a newer review with an old revision", () => {
    const first = mark(load())
    const second = mark(first)
    const next = workbenchReducer(
      second,
      clearRequirementReview({ workspacePath: "workspace-a", sessionId: "session-a", revision: 1 }),
    )

    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(2)
  })

  test("clears only the matching revision and keeps revisions monotonic", () => {
    const first = mark(load())
    const cleared = workbenchReducer(
      first,
      clearRequirementReview({ workspacePath: "workspace-a", sessionId: "session-a", revision: 1 }),
    )
    const next = mark(cleared)

    expect(selectRequirementReview(root(cleared), "workspace-a", "session-a")).toBe(0)
    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(2)
  })

  test("cleans review state when deleting a session", () => {
    const first = mark(load())
    const loaded = workbenchReducer(
      first,
      setSessions({
        workspacePath: "workspace-b",
        sessions: [
          {
            id: "session-a",
            title: "B",
            workspacePath: "workspace-b",
            requirements: ["old-b"],
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      }),
    )
    const marked = mark(loaded, "workspace-b", "session-a")
    const next = workbenchReducer(marked, deleteSession({ id: "session-a" }))

    expect(next.requirementReviews["workspace-b"]).toBeUndefined()
    expect(selectRequirementReview(root(next), "workspace-b", "session-a")).toBe(0)
    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(1)
  })

  test("records a late save after another workspace replaces the loaded sessions", () => {
    const loaded = workbenchReducer(
      load(),
      setSessions({
        workspacePath: "workspace-b",
        sessions: [
          {
            id: "session-b",
            title: "B",
            workspacePath: "workspace-b",
            requirements: ["old-b"],
            createdAt: 2,
            updatedAt: 2,
          },
        ],
      }),
    )
    const updated = workbenchReducer(
      loaded,
      setRequirements({ workspacePath: "workspace-a", sessionId: "session-a", requirements: ["new-a"] }),
    )
    const next = mark(updated)

    expect(next.sessions[0].workspacePath).toBe("workspace-b")
    expect(next.sessions[0].requirements).toEqual(["old-b"])
    expect(selectRequirementReview(root(next), "workspace-a", "session-a")).toBe(1)
    expect(selectRequirementReview(root(next), "workspace-b", "session-b")).toBe(0)
  })
})
