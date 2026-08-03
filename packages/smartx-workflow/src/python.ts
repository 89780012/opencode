import path from "node:path"
import { realpath, stat } from "node:fs/promises"
import { tool, type ToolContext } from "@opencode-ai/plugin"

const timeout = 120_000
const maximum = 600_000
const output = 512 * 1024
const live = 30 * 1024
const grace = 250
const runtimes = /^(?:(?:python|pypy)(?:3(?:\.\d+)?)?|py|ipython)(?:\.exe)?$/i
const managers = /^(?:pip(?:3(?:\.\d+)?)?|uv|poetry|pipenv|conda|venv|virtualenv|jupyter)(?:\.exe)?$/i
const wrappers = new Set(["env", "command", "sudo", "doas"])

type Runtime = {
  home?: string
  platform?: NodeJS.Platform
  layout?: string
  exists?: (file: string) => Promise<boolean>
}

type Opt = {
  find?: () => Promise<string>
  cmd?: (bin: string, args: string[], file?: string) => string[]
  start?: (id: string) => void
}

type Proc = Bun.Subprocess<"pipe", "pipe", "pipe">
export type Layout = "production" | "development"

/** 生成固定参数数组；源码本身不会进入命令行。 */
export function argv(bin: string, args: string[], file?: string) {
  return [bin, "-u", file ?? "-", ...args]
}

/** 为 Python 创建可流式读取、无控制台闪窗且可按进程组终止的启动参数。 */
export function options(dir: string, platform: NodeJS.Platform = process.platform) {
  return {
    cwd: dir,
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
    stdin: "pipe" as const,
    stdout: "pipe" as const,
    stderr: "pipe" as const,
    detached: platform !== "win32",
    windowsHide: true,
  }
}

async function terminate(proc: Proc, platform: NodeJS.Platform = process.platform) {
  if (platform === "win32") {
    const code = await Promise.resolve()
      .then(() =>
        Bun.spawn(["taskkill", "/pid", String(proc.pid), "/f", "/t"], {
          stdin: "ignore",
          stdout: "ignore",
          stderr: "ignore",
          windowsHide: true,
        }).exited,
      )
      .catch(() => -1)
    if (proc.exitCode === null) proc.kill("SIGKILL")
    await proc.exited.catch(() => undefined)
    return code === 0
  }

  const send = (signal: NodeJS.Signals) => {
    try {
      process.kill(-proc.pid, signal)
    } catch {
      if (proc.exitCode === null) proc.kill(signal)
    }
  }
  send("SIGTERM")
  await new Promise<void>((resolve) => setTimeout(resolve, grace))
  // 即使组长已经退出，也继续清理仍持有 stdout/stderr 的后代进程。
  send("SIGKILL")
  await proc.exited.catch(() => undefined)
  return true
}

/** 解析显式 CPython 布局；独立运行插件时默认兼容开发目录。 */
export function layout(value?: string): Layout {
  const mode = value?.trim() || "development"
  if (mode === "production" || mode === "development") return mode
  throw new Error('SMARTX_PYTHON_LAYOUT must be "production" or "development".')
}

/** 按 SmartX 的生产和开发目录约定生成解释器候选，始终保留原始路径字符。 */
export function candidates(home: string, platform: NodeJS.Platform, mode: Layout) {
  const common = path.join(home, "bin", "cpython")
  const local = path.join(home, "bin", platform, "cpython")
  const roots = mode === "production" ? [common, local] : [local, common]
  const names =
    platform === "win32"
      ? ["python.exe", path.join("Scripts", "python.exe")]
      : [path.join("bin", "python3"), path.join("bin", "python"), path.join("Scripts", "python"), "python"]
  return [...new Set(roots.flatMap((root) => names.map((name) => path.join(root, name))))]
}

/** 只从 SMART_HOME 定位 CPython，不使用 PATH 或系统 Python 回退。 */
export async function interpreter(opt: Runtime = {}) {
  const home = (opt.home ?? Bun.env.SMART_HOME ?? "").trim()
  if (!home) throw new Error("SMART_HOME is not configured; SmartX Python is unavailable.")
  if (!path.isAbsolute(home)) throw new Error("SMART_HOME must be an absolute path.")
  const platform = opt.platform ?? process.platform
  const files = candidates(path.normalize(home), platform, layout(opt.layout ?? Bun.env.SMARTX_PYTHON_LAYOUT))
  const exists =
    opt.exists ?? ((file: string) => stat(file).then((item) => item.isFile()).catch(() => false))
  const found = await Promise.all(files.map((file) => exists(file)))
  const index = found.findIndex(Boolean)
  if (index >= 0) return files[index]
  throw new Error("SmartX Python interpreter was not found in the configured SMART_HOME CPython layouts.")
}

type Source = {
  code?: string
  file?: string
}

function clean(value: string) {
  const text = value.trim()
  if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'")))
    return text.slice(1, -1)
  return text
}

function words(value: string) {
  return value.match(/(?:[^\s"'`]|\\.)+|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g)?.map(clean) ?? []
}

function executable(value: string) {
  return path.basename(value.replaceAll("\\", "/")).toLowerCase()
}

function command(value: string): boolean {
  const list = words(value)
  const index = list.findIndex((item) => item !== "&" && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(item))
  if (index < 0) return false
  const name = executable(list[index] ?? "")
  const rest = list.slice(index + 1)
  if (wrappers.has(name)) return command(rest.join(" "))
  if (name === "cmd" && /^\/[ck]$/i.test(rest[0] ?? "")) return command(rest.slice(1).join(" "))
  if (["powershell", "pwsh"].includes(name)) {
    const index = rest.findIndex((item) => ["-command", "-c"].includes(item.toLowerCase()))
    if (index >= 0) return command(rest.slice(index + 1).join(" "))
  }
  if (["start", "start-process"].includes(name))
    return rest.some((item) => {
      const name = executable(item)
      return runtimes.test(name) || managers.test(name) || name.endsWith(".py")
    })
  if (runtimes.test(name) || name.endsWith(".py")) return true
  if (managers.test(name)) return true
  if (["bash", "sh", "zsh", "fish"].includes(name)) {
    const index = rest.findIndex((item) => item === "-c" || item === "-lc")
    if (index >= 0) return command(rest.slice(index + 1).join(" "))
  }
  return false
}

/** 判断 Bash 工具是否会绕过 SmartX 内置 Python 执行 Python。 */
export function ambient(input: unknown) {
  if (!input || typeof input !== "object") return false
  const value = (input as Record<string, unknown>).command
  if (typeof value !== "string") return false
  if (/\$\{?PYTHON/i.test(value)) return true
  return value.split(/&&|\|\||[;&|\n]/).some(command)
}

async function source(input: { code?: string; file?: string }, ctx: Pick<ToolContext, "directory">) {
  const code = input.code?.trim() ? input.code : undefined
  const file = input.file?.trim()
  if (!!code === !!file) throw new Error("SmartX Python requires exactly one of code or file.")
  if (code) return { code } satisfies Source
  if (!file) throw new Error("SmartX Python requires exactly one of code or file.")
  const target = await realpath(path.resolve(ctx.directory, file)).catch(() => "")
  if (!target) throw new Error("SmartX Python file was not found.")
  const info = await stat(target).catch(() => undefined)
  if (!info?.isFile()) throw new Error("SmartX Python file must be a regular file.")
  if (path.extname(target).toLowerCase() !== ".py") throw new Error("SmartX Python file must use the .py extension.")
  return { file: target } satisfies Source
}

function clip(value: string, omitted: number, max: number) {
  if (!omitted && value.length <= max) return value
  const skipped = omitted + Math.max(0, value.length - max)
  const note = `\n\n[SmartX Python output truncated: ${skipped} characters omitted.]\n\n`
  if (note.length >= max) return note.slice(0, max)
  const room = max - note.length
  const head = Math.ceil(room / 2)
  return value.slice(0, head) + note + value.slice(-Math.floor(room / 2))
}

async function drain(stream: ReadableStream<Uint8Array>, append: (value: string) => void, signal: AbortSignal) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const cancel = () => void reader.cancel().catch(() => undefined)
  signal.addEventListener("abort", cancel, { once: true })
  if (signal.aborted) cancel()
  try {
    while (true) {
      const item = await reader.read()
      if (item.done) break
      append(decoder.decode(item.value, { stream: true }))
    }
    append(decoder.decode())
  } catch (err) {
    if (!signal.aborted) throw err
  } finally {
    signal.removeEventListener("abort", cancel)
  }
}

/** 创建供主会话调用的 SmartX Python 工具。 */
export function python(opt: Opt = {}) {
  return tool({
    description:
      "Run Python code or a .py file with the CPython bundled under SMART_HOME. Use this instead of shell Python commands. Packages are never installed at runtime.",
    args: {
      description: tool.schema.string().trim().min(1).max(200).describe("Short description shown in the session"),
      code: tool.schema.string().max(200_000).optional().describe("Complete Python source code"),
      file: tool.schema
        .string()
        .trim()
        .min(1)
        .max(4_096)
        .optional()
        .describe("Relative or absolute .py file to execute"),
      args: tool.schema.array(tool.schema.string().max(4_096)).max(64).optional().describe("Values exposed as sys.argv[1:]"),
      timeout: tool.schema
        .number()
        .int()
        .min(1_000)
        .max(maximum)
        .optional()
        .describe("Timeout in milliseconds; defaults to 120000"),
    },
    async execute(params, ctx) {
      if (ctx.agent !== "smartx-helper") throw new Error("SmartX Python is only available to the smartx-helper agent.")
      const check = () => {
        if (ctx.abort.aborted) throw new Error("SmartX Python execution was aborted before start.")
      }
      check()
      const src = await source(params, ctx)
      check()
      await ctx.ask({
        permission: "smartx_python",
        patterns: ["*"],
        always: ["*"],
        metadata: { description: params.description },
      })
      check()

      const bin = await (opt.find ?? interpreter)()
      check()
      const args = params.args ?? []
      const limit = params.timeout ?? timeout
      const command = (opt.cmd ?? argv)(bin, args, src.file)
      const proc = (() => {
        try {
          return Bun.spawn(command, options(ctx.directory))
        } catch {
          throw new Error("SmartX Python interpreter could not be started.")
        }
      })()

      const halt = new AbortController()
      let reason: "abort" | "timeout" | undefined
      let stopped: Promise<void> | undefined
      let killed = true
      const stop = () => {
        if (stopped) return stopped
        stopped = terminate(proc)
          .then((result) => {
            killed = result
          })
          .finally(() => halt.abort())
        return stopped
      }
      const abort = () => {
        reason ??= "abort"
        void stop()
      }
      ctx.abort.addEventListener("abort", abort, { once: true })
      if (ctx.abort.aborted) abort()
      const clock = setTimeout(() => {
        reason ??= "timeout"
        void stop()
      }, limit)

      let text = ""
      let omitted = 0
      let timer: ReturnType<typeof setTimeout> | undefined
      const metadata = () => {
        timer = undefined
        ctx.metadata({
          title: params.description,
          metadata: {
            output: clip(text, omitted, live),
            description: params.description,
          },
        })
      }
      const schedule = () => {
        if (timer) return
        timer = setTimeout(metadata, 50)
      }
      const append = (value: string) => {
        if (!value) return
        text += value
        if (text.length > output) {
          omitted += text.length - output
          text = text.slice(0, output / 2) + text.slice(-output / 2)
        }
        schedule()
      }

      const streams = Promise.all([drain(proc.stdout, append, halt.signal), drain(proc.stderr, append, halt.signal)])
      let code = -1
      let failed = false
      try {
        opt.start?.(ctx.sessionID)
        metadata()
        if (reason) {
          await stop()
        } else {
          if (src.code) proc.stdin.write(src.code)
          proc.stdin.end()
          code = await proc.exited
        }
        await streams
      } catch {
        failed = true
        await stop()
        await streams.catch(() => undefined)
      } finally {
        clearTimeout(clock)
        ctx.abort.removeEventListener("abort", abort)
        if (stopped) await stopped
        if (timer) clearTimeout(timer)
        metadata()
      }

      const result = clip(text, omitted, output).trimEnd()
      const detail = result ? `\n\nOutput:\n${clip(text, omitted, live).trimEnd()}` : ""
      const warning = killed ? "" : "\n\nWarning: Windows process tree cleanup could not be confirmed."
      if (reason === "abort") throw new Error(`SmartX Python execution was aborted.${detail}${warning}`)
      if (reason === "timeout") throw new Error(`SmartX Python timed out after ${limit} ms.${detail}${warning}`)
      if (failed) throw new Error(`SmartX Python process failed.${detail}${warning}`)
      if (code !== 0) throw new Error(`SmartX Python exited with code ${code}.${detail}${warning}`)
      return result || "SmartX Python completed without output."
    },
  })
}
