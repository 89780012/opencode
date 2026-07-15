import { afterEach, describe, expect, test } from "bun:test"
import path from "node:path"
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import type { ToolContext } from "@opencode-ai/plugin"
import { ambient, argv, candidates, interpreter, layout, options, python } from "../src/python.js"

type Meta = {
  title?: string
  metadata?: Record<string, unknown>
}

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function home() {
  const root = await mkdtemp(path.join(tmpdir(), "smartx-python-"))
  const dir = path.join(root, "Smart Home (策略)")
  await mkdir(dir)
  dirs.push(root)
  return dir
}

function context(
  signal: AbortSignal,
  rows: Meta[],
  asks: string[],
  agent = "smartx-helper",
  wait?: () => Promise<void>,
  dir = process.cwd(),
  root = dir,
): ToolContext {
  return {
    sessionID: "s1",
    messageID: "m1",
    agent,
    directory: dir,
    worktree: root,
    abort: signal,
    metadata(input) {
      rows.push(input)
    },
    async ask(input) {
      asks.push(input.permission)
      await wait?.()
    },
  }
}

function runtime(script: string) {
  return python({
    find: async () => process.execPath,
    cmd: (bin, args) => [bin, "-e", script, "--", ...args],
  })
}

describe("SmartX Python runtime", () => {
  test("uses the configured development layout without escaping path characters", async () => {
    const dir = await home()
    const files = candidates(dir, process.platform, "development")
    await mkdir(path.dirname(files[0]), { recursive: true })
    await Bun.write(files[0], "fixture")

    await expect(interpreter({ home: dir, layout: "development" })).resolves.toBe(files[0])
    expect(files[0]).toContain("Smart Home (策略)")
  })

  test("selects the explicit layout and never falls back to PATH", async () => {
    const dir = await home()
    const prod = candidates(dir, process.platform, "production")[0]
    const dev = candidates(dir, process.platform, "development")[0]
    await Promise.all(
      [prod, dev].map(async (file) => {
        await mkdir(path.dirname(file), { recursive: true })
        await Bun.write(file, "fixture")
      }),
    )

    await expect(interpreter({ home: dir, layout: "production" })).resolves.toBe(prod)
    await expect(interpreter({ home: dir, layout: "development" })).resolves.toBe(dev)
    await expect(interpreter({ home: path.join(dir, "missing"), layout: "production" })).rejects.toThrow(
      "configured SMART_HOME",
    )
    await expect(interpreter({ home: dir, layout: "invalid" })).rejects.toThrow("SMARTX_PYTHON_LAYOUT")
    await expect(interpreter({ home: "" })).rejects.toThrow("SMART_HOME is not configured")
    expect(layout()).toBe("development")
    expect(layout("production")).toBe("production")
    expect(argv("python", ["a&b", "$(noop)"])).toEqual(["python", "-u", "-", "a&b", "$(noop)"])
    expect(argv("python", ["a&b"], "script.py")).toEqual(["python", "-u", "script.py", "a&b"])
    expect(options(dir, "win32")).toMatchObject({ windowsHide: true, detached: false })
    expect(options(dir, "linux")).toMatchObject({ windowsHide: true, detached: true })
  })

  test("executes a workspace Python file without a shell", async () => {
    const dir = await home()
    const file = path.join(dir, "query.py")
    await Bun.write(file, "print('query')\n")
    const rows: Meta[] = []
    const asks: string[] = []
    const ctrl = new AbortController()
    let seen: { args: string[]; file?: string } | undefined
    const run = python({
      find: async () => process.execPath,
      cmd: (bin, args, file) => {
        seen = { args, file }
        return [bin, "-e", "console.log('file=' + Bun.argv[1]);", "--", file ?? "", ...args]
      },
    })

    const value = await run.execute(
      { description: "run saved query", file: "query.py", args: ["000001"] },
      context(ctrl.signal, rows, asks, "smartx-helper", undefined, dir),
    )

    expect(seen).toEqual({ args: ["000001"], file })
    expect(value).toContain(`file=${file}`)
    expect(asks).toEqual(["smartx_python"])
  })

  test("rejects unsafe or ambiguous Python file input before resolving the interpreter", async () => {
    const dir = await home()
    const outside = path.join(path.dirname(dir), "outside.py")
    await Bun.write(outside, "print('outside')\n")
    await Bun.write(path.join(dir, "note.txt"), "not python\n")
    const ctrl = new AbortController()
    let found = false
    const run = python({
      find: async () => {
        found = true
        return process.execPath
      },
    })
    const ctx = context(ctrl.signal, [], [], "smartx-helper", undefined, dir)

    await expect(
      run.execute({ description: "ambiguous", code: "print(1)", file: "note.txt" }, ctx),
    ).rejects.toThrow("exactly one")
    await expect(run.execute({ description: "outside", file: "../outside.py" }, ctx)).rejects.toThrow("inside the active worktree")
    await expect(run.execute({ description: "extension", file: "note.txt" }, ctx)).rejects.toThrow(".py extension")
    await expect(run.execute({ description: "absolute", file: outside }, ctx)).rejects.toThrow("relative")
    const link = path.join(dir, "linked.py")
    const linked = await symlink(outside, link).then(() => true).catch(() => false)
    if (linked) await expect(run.execute({ description: "link", file: "linked.py" }, ctx)).rejects.toThrow("inside the active worktree")
    expect(found).toBe(false)
  })

  test("detects ambient Python shell launches without blocking ordinary text commands", () => {
    for (const command of [
      "python job.py",
      "py job.py",
      "pypy job.py",
      "python -m pip install akshare",
      "pip3.12 install akshare",
      "uv run python job.py",
      "conda run python job.py",
      "./job.py",
      "env PYTHONPATH=src python job.py",
      "cmd /c \"python job.py\"",
      "powershell -Command \"python job.py\"",
      "Start-Process python -ArgumentList job.py",
      "echo ready & python job.py",
      "bash -c 'python job.py'",
    ]) {
      expect(ambient({ command })).toBe(true)
    }
    expect(ambient({ command: "echo python job.py" })).toBe(false)
    expect(ambient({ command: "git status && bun test" })).toBe(false)
  })

  test("streams stdin, arguments, UTF-8 environment, stdout, and stderr", async () => {
    const rows: Meta[] = []
    const asks: string[] = []
    const ctrl = new AbortController()
    const run = runtime(`
      const source = await Bun.stdin.text()
      console.log("source=" + source)
      console.error("stderr=警告")
      console.log("args=" + Bun.argv.slice(1).join("|"))
      console.log("utf8=" + process.env.PYTHONUTF8 + "/" + process.env.PYTHONIOENCODING)
      console.log("cwd=" + process.cwd())
    `)

    const value = await run.execute(
      { description: "读取行情", code: "print('你好')", args: ["a&b", "$(noop)"], timeout: 5_000 },
      context(ctrl.signal, rows, asks),
    )

    expect(value).toContain("source=print('你好')")
    expect(value).toContain("stderr=警告")
    expect(value).toContain("args=a&b|$(noop)")
    expect(value).toContain("utf8=1/utf-8")
    expect(value).toContain(`cwd=${process.cwd()}`)
    expect(asks).toEqual(["smartx_python"])
    expect(rows.at(-1)?.metadata?.output).toContain("source=print('你好')")
  })

  test("returns bounded output and keeps process failures actionable", async () => {
    const ctrl = new AbortController()
    const failed = runtime(`
      await Bun.stdin.text()
      console.log("before failure")
      console.error("failure detail")
      process.exit(7)
    `)
    await expect(
      failed.execute(
        { description: "失败示例", code: "raise RuntimeError()", timeout: 5_000 },
        context(ctrl.signal, [], []),
      ),
    ).rejects.toThrow("exited with code 7")
    await expect(
      failed.execute(
        { description: "失败示例", code: "raise RuntimeError()", timeout: 5_000 },
        context(ctrl.signal, [], []),
      ),
    ).rejects.toThrow("failure detail")

    const large = runtime(`
      await Bun.stdin.text()
      console.log("x".repeat(600000))
    `)
    const value = await large.execute(
      { description: "大输出", code: "print('x')", timeout: 5_000 },
      context(ctrl.signal, [], []),
    )
    expect(value.length).toBeLessThanOrEqual(512 * 1024)
    expect(value).toContain("output truncated")
  })

  test("terminates on timeout and abort", async () => {
    const run = runtime(`
      await Bun.stdin.text()
      console.log("started")
      await Bun.sleep(5000)
    `)
    const first = new AbortController()
    const start = Date.now()
    await expect(
      run.execute(
        { description: "超时", code: "sleep(5)", timeout: 1_000 },
        context(first.signal, [], []),
      ),
    ).rejects.toThrow("timed out after 1000 ms")
    expect(Date.now() - start).toBeLessThan(3_000)

    const second = new AbortController()
    const pending = run.execute(
      { description: "取消", code: "sleep(5)", timeout: 5_000 },
      context(second.signal, [], []),
    )
    setTimeout(() => second.abort(), 50)
    await expect(pending).rejects.toThrow("execution was aborted")
  })

  test("terminates descendant processes on timeout", async () => {
    const dir = await home()
    const marker = path.join(dir, "descendant.txt")
    const child = "await Bun.sleep(1800); await Bun.write(Bun.argv[1], 'alive')"
    const run = runtime(`
      const marker = Bun.argv[1]
      Bun.spawn([process.execPath, "-e", ${JSON.stringify(child)}, "--", marker], {
        stdout: "inherit",
        stderr: "inherit",
      })
      await Bun.stdin.text()
      await Bun.sleep(5000)
    `)
    const ctrl = new AbortController()

    await expect(
      run.execute(
        { description: "进程树超时", code: "spawn_child()", args: [marker], timeout: 1_000 },
        context(ctrl.signal, [], []),
      ),
    ).rejects.toThrow("timed out after 1000 ms")
    await Bun.sleep(1_000)
    expect(await Bun.file(marker).exists()).toBe(false)
  })

  test("bounds Windows cleanup when the parent exits before taskkill", async () => {
    if (process.platform !== "win32") return
    const dir = await home()
    const file = path.join(dir, "child.pid")
    const child = "await Bun.sleep(10000)"
    const run = runtime(`
      await Bun.stdin.text()
      const child = Bun.spawn([process.execPath, "-e", ${JSON.stringify(child)}], {
        stdout: "inherit",
        stderr: "inherit",
      })
      await Bun.write(Bun.argv[1], String(child.pid))
    `)
    const ctrl = new AbortController()
    const start = Date.now()
    const err = await run
      .execute(
        { description: "父进程提前退出", code: "spawn_child()", args: [file], timeout: 1_000 },
        context(ctrl.signal, [], []),
      )
      .then(
        () => new Error("expected SmartX Python to time out"),
        (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      )
    const pid = Number(await Bun.file(file).text())
    const cleanup = await Bun.spawn(["taskkill", "/pid", String(pid), "/f", "/t"], {
      stdout: "ignore",
      stderr: "ignore",
      windowsHide: true,
    }).exited

    expect(err.message).toContain("timed out after 1000 ms")
    if (!err.message.includes("cleanup could not be confirmed")) expect(cleanup).not.toBe(0)
    expect(Date.now() - start).toBeLessThan(3_000)
  })

  test("rejects other agents before resolving or spawning Python", async () => {
    let called = false
    const run = python({
      find: async () => {
        called = true
        return process.execPath
      },
    })
    const ctrl = new AbortController()
    await expect(
      run.execute(
        { description: "拒绝", code: "print(1)" },
        context(ctrl.signal, [], [], "general"),
      ),
    ).rejects.toThrow("smartx-helper")
    expect(called).toBe(false)
  })

  test("marks side effects only after the process starts", async () => {
    const ids: string[] = []
    const first = new AbortController()
    first.abort()
    const early = python({
      find: async () => process.execPath,
      start: (id) => ids.push(id),
    })

    await expect(
      early.execute(
        { description: "启动前取消", code: "print(1)" },
        context(first.signal, [], []),
      ),
    ).rejects.toThrow("aborted before start")
    expect(ids).toEqual([])

    const second = new AbortController()
    const started = python({
      find: async () => process.execPath,
      cmd: (bin) => [bin, "-e", "await Bun.stdin.text(); await Bun.sleep(5000)"],
      start: (id) => {
        ids.push(id)
        second.abort()
      },
    })

    await expect(
      started.execute(
        { description: "启动后取消", code: "print(1)", timeout: 5_000 },
        context(second.signal, [], []),
      ),
    ).rejects.toThrow("execution was aborted")
    expect(ids).toEqual(["s1"])
  })

  test("honors aborts while permission or interpreter resolution is pending", async () => {
    const first = new AbortController()
    let resolved = false
    const permission = python({
      find: async () => {
        resolved = true
        return process.execPath
      },
    })
    await expect(
      permission.execute(
        { description: "取消权限", code: "print(1)" },
        context(first.signal, [], [], "smartx-helper", async () => first.abort()),
      ),
    ).rejects.toThrow("aborted before start")
    expect(resolved).toBe(false)

    const second = new AbortController()
    let launched = false
    const resolving = python({
      find: async () => {
        second.abort()
        return process.execPath
      },
      cmd: (bin) => {
        launched = true
        return [bin, "--version"]
      },
    })
    await expect(
      resolving.execute(
        { description: "取消解析", code: "print(1)" },
        context(second.signal, [], []),
      ),
    ).rejects.toThrow("aborted before start")
    expect(launched).toBe(false)
  })
})
