import { describe, expect, test } from "bun:test"
import { build, live, watch } from "../src/hooks.js"
import { fresh } from "../src/state.js"

describe("smartx workflow hooks", () => {
  test("watch builds auto follow-up prompt", () => {
    const flow = fresh("s1", "verify the strategy", "2026-04-20T00:00:00Z")
    expect(watch(flow)).toBe(true)
  })

  test("live extracts idle session id", () => {
    expect(live({ type: "session.idle", properties: { sessionID: "s1" } } as const)).toBe("s1")
  })

  test("idle event queues promptAsync for active smartx flow", async () => {
    const sent: string[] = []
    const io = {
      flow: fresh("s1", "verify the strategy", "2026-04-20T00:00:00Z"),
      async load(session: string) {
        return session === this.flow.session ? this.flow : undefined
      },
      async save(flow: ReturnType<typeof fresh>) {
        this.flow = flow
      },
    }
    const hooks = build(
      {
        client: {
          session: {
            promptAsync: async (input: { body?: { parts: Array<{ text: string }> } }) => {
              sent.push(input.body.parts[0]!.text)
              return { data: {} }
            },
          },
        } as never,
        project: {} as never,
        directory: "",
        worktree: "",
        serverUrl: new URL("http://localhost:4096"),
        $: {} as never,
      },
      {
        io,
        now: () => "2026-04-20T00:00:01Z",
      },
    )
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "s1" } } as const })
    expect(sent.length).toBe(1)
    expect(sent[0]?.includes("Continue the SmartX workflow.")).toBe(true)
  })
})
