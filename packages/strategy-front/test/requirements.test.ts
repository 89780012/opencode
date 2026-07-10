import { describe, expect, test } from "bun:test"
import { setRequirements, setSessions, workbenchReducer } from "../src/store/workbench-slice"

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
  })
})
