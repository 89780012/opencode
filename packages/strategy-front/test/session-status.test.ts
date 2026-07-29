import { describe, expect, test } from "bun:test"
import { retry } from "../src/lib/session-status"

describe("workbench session status", () => {
  test("only exposes live retry state", () => {
    const state = { type: "retry", attempt: 3, message: "limited", next: 1 } as const

    expect(retry(state)).toEqual(state)
    expect(retry({ type: "busy" })).toBeUndefined()
    expect(retry({ type: "idle" })).toBeUndefined()
  })
})
