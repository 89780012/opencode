import { describe, expect, test } from "bun:test"
import { ext, output, payload } from "../src/lib/session-tool"
import type { ChatToolPart, ChatToolState } from "../src/types/chat"

function part(state: ChatToolState, tool = "smartx_python"): ChatToolPart {
  return {
    id: "part-1",
    sessionID: "session-1",
    messageID: "message-1",
    type: "tool",
    callID: "call-1",
    tool,
    state,
  }
}

describe("workbench session tool", () => {
  test("renders Python source separately from its execution metadata", () => {
    const body = payload(
      part({
        status: "running",
        input: {
          description: "query market data",
          code: "\nimport akshare as ak\nprint(ak.__version__)\n",
          args: ["000001"],
          timeout: 120000,
        },
        metadata: {},
        time: { start: 1000 },
      }),
    )

    expect(body.lang).toBe("python")
    expect(body.value).toBe("\nimport akshare as ak\nprint(ak.__version__)\n")
    expect(JSON.parse(body.meta ?? "{}")).toEqual({ args: ["000001"], timeout: 120000 })
  })

  test("preserves the exact Python source for display and download", () => {
    const code = "  print(\"\u001b[31m\")\n"
    expect(
      payload(
        part({
          status: "pending",
          input: { description: "diagnose indentation", code },
          raw: "",
        }),
      ).value,
    ).toBe(code)

    expect(
      payload(
        part({
          status: "pending",
          input: { description: "blank source", code: " \n" },
          raw: "",
        }),
      ),
    ).toEqual({ lang: "python", value: " \n", meta: "" })
  })

  test("omits empty Python arguments and keeps generic tools compatible", () => {
    const python = payload(
      part({
        status: "pending",
        input: { description: "run", code: "print('ok')", args: [] },
        raw: "",
      }),
    )
    const generic = payload(
      part(
        {
          status: "pending",
          input: { code: "print('not python')" },
          raw: "",
        },
        "other_tool",
      ),
    )
    const shell = payload(
      part(
        {
          status: "pending",
          input: { command: "pwd" },
          raw: "",
        },
        "bash",
      ),
    )

    expect(python.meta).toBe("")
    expect(generic).toEqual({ lang: "json", value: '{\n  "code": "print(\'not python\')"\n}' })
    expect(shell).toEqual({ lang: "shell", value: "$ pwd" })
  })

  test("reads streaming, completed, and error output", () => {
    expect(
      output(
        part({
          status: "running",
          input: {},
          metadata: { output: "\u001b[32mstreaming\u001b[0m\n" },
          time: { start: 1000 },
        }),
      ),
    ).toBe("streaming")
    expect(
      output(
        part({
          status: "completed",
          input: {},
          output: "done\n",
          title: "run",
          metadata: {},
          time: { start: 1000, end: 2000 },
        }),
      ),
    ).toBe("done")
    expect(
      output(
        part({
          status: "error",
          input: {},
          error: "failed\n",
          time: { start: 1000, end: 2000 },
        }),
      ),
    ).toBe("failed")
  })

  test("maps Python code to a py download extension", () => {
    expect(ext("python")).toBe("py")
    expect(ext("PY")).toBe("py")
    expect(ext("shell")).toBe("sh")
    expect(ext("unknown")).toBe("txt")
  })
})
