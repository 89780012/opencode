import { describe, expect, test } from "bun:test"
import { parseRequirements } from "../src/components/workbench/hooks/use-workbench-session-sync"
import { capture, settle, type Intake } from "../src/lib/intake"
import { systemDefault } from "../src/types/system"

describe("conversational requirement intake", () => {
  test("keeps retry ids isolated across session switches", () => {
    const store = new Map<string, Intake>()
    const one = "workspace\u0000one"
    const two = "workspace\u0000two"
    const first = capture(store, one, "requirement")
    const other = capture(store, two, "requirement")
    const retry = capture(store, one, "requirement")

    expect(retry).toBe(first)
    expect(other.id).not.toBe(first.id)
    settle(store, two, other.id)
    expect(capture(store, one, "requirement")).toBe(first)
    const changed = capture(store, one, "changed")
    settle(store, one, first.id)
    expect(capture(store, one, "changed")).toBe(changed)
    settle(store, one, changed.id)
    expect(capture(store, one, "requirement").id).not.toBe(first.id)
  })

  test("defaults intake to disabled", () => {
    expect(systemDefault.workbench.intake).toBeFalse()
  })

  test("parses scoped requirement events", () => {
    expect(
      parseRequirements({ workspacePath: "workspace", sessionId: "session", requirements: ["one", "two"] }),
    ).toEqual({ workspacePath: "workspace", sessionId: "session", requirements: ["one", "two"] })
    expect(parseRequirements({ workspacePath: "workspace", sessionId: "session", requirements: [1] })).toBeNull()
    expect(parseRequirements({ workspacePath: "workspace", requirements: [] })).toBeNull()
  })
})
