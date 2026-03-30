import { useEffect, useState } from "react"
import { ArrowRight, ExternalLink, Loader2, RefreshCcw, ShieldAlert, ShieldCheck, Sparkles, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { Button } from "@/components/ui/button"
import type { InstallTask, ToolAction, ToolID, ToolState } from "@/types/system"

const order: ToolID[] = ["git", "node", "npm", "opencode"]
const site = {
  git: {
    text: "Git 官网",
    url: "https://git-scm.com/downloads",
  },
  node: {
    text: "Node.js 官网",
    url: "https://nodejs.org/",
  },
  npm: {
    text: "npm 官网",
    url: "https://www.npmjs.com/package/npm",
  },
  opencode: {
    text: "OpenCode 官网",
    url: "https://opencode.ai/download",
  },
} satisfies Record<ToolID, { text: string; url: string }>

function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return text
}

function wait(ms: number) {
  return new Promise((done) => window.setTimeout(done, ms))
}

function stamp(text?: string) {
  if (!text) {
    return "-"
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text
  }

  return date.toLocaleString()
}

function meta(status: ToolState["status"] | InstallTask["status"]) {
  if (status === "installed" || status === "success") {
    return {
      dot: "bg-emerald-400",
      ring: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
      text: "已就绪",
    }
  }

  if (status === "installing" || status === "running") {
    return {
      dot: "bg-cyan-300",
      ring: "border-cyan-300/40 bg-cyan-400/10 text-cyan-50",
      text: "处理中",
    }
  }

  if (status === "pending") {
    return {
      dot: "bg-sky-300",
      ring: "border-sky-300/40 bg-sky-400/10 text-sky-50",
      text: "排队中",
    }
  }

  if (status === "failed") {
    return {
      dot: "bg-rose-400",
      ring: "border-rose-400/40 bg-rose-500/10 text-rose-100",
      text: "需处理",
    }
  }

  return {
    dot: "bg-amber-300",
    ring: "border-amber-300/40 bg-amber-400/10 text-amber-50",
    text: "未安装",
  }
}

function fill(task?: InstallTask) {
  if (!task) {
    return 0
  }

  if (task.status === "success") {
    return 100
  }

  if (task.total > 0) {
    const step = task.step || (task.status === "running" ? 1 : 0)
    const raw = Math.round((step / task.total) * 100)
    if (task.status === "failed") {
      return Math.max(14, Math.min(raw, 92))
    }
    return Math.max(task.status === "pending" ? 8 : 14, Math.min(raw - 4, 94))
  }

  if (task.status === "failed") {
    return 14
  }

  if (task.status === "pending") {
    return 8
  }

  if (task.status === "running") {
    return 20
  }

  return 0
}

function phase(task?: InstallTask, status?: ToolState["status"]) {
  if (!task) {
    if (status === "installed") {
      return "检测完成"
    }

    if (status === "failed") {
      return "需要处理"
    }

    if (status === "installing") {
      return "正在处理"
    }

    return "等待检测"
  }

  if (task.title) {
    return task.title
  }

  if (task.status === "pending") {
    return "等待开始"
  }

  if (task.status === "running") {
    return "正在执行"
  }

  if (task.status === "success") {
    return "处理完成"
  }

  if (task.status === "failed") {
    return "处理失败"
  }

  return "处理中"
}

function text(action: ToolAction) {
  if (action === "uninstall") {
    return "卸载"
  }

  if (action === "reinstall") {
    return "重装"
  }

  return "处理"
}

function done(action: ToolAction, label: string) {
  if (action === "uninstall") {
    return `${label} 已卸载`
  }

  if (action === "reinstall") {
    return `${label} 已重装`
  }

  return `${label} 已处理完成`
}

function fail(action: ToolAction, label: string) {
  if (action === "uninstall") {
    return `${label} 卸载失败`
  }

  if (action === "reinstall") {
    return `${label} 重装失败`
  }

  return `${label} 处理失败`
}

function queue(list: ToolState[]) {
  return order.filter((id) => {
    const row = list.find((item) => item.id === id)
    if (!row) {
      return false
    }
    return row.status !== "installed"
  })
}

function ready(list: ToolState[]) {
  return list.length > 0 && list.every((item) => item.status === "installed")
}

function lead(list: ToolState[], jobs: Record<string, InstallTask>) {
  const live = list.find((item) => item.status === "installing" && item.task_id)
  if (live?.task_id) {
    return jobs[live.task_id]
  }

  const all = Object.values(jobs)
  if (all.length === 0) {
    return undefined
  }

  return all.slice().sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))[0]
}

export default function Page() {
  const nav = useNavigate()
  const [list, setList] = useState<ToolState[]>([])
  const [jobs, setJobs] = useState<Record<string, InstallTask>>({})
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const [busy, setBusy] = useState("")
  const [flow, setFlow] = useState(false)

  async function sync(ids: string[]) {
    if (ids.length === 0) {
      return
    }

    const rows = await Promise.all(ids.map(async (id) => [id, await systemApi.task(id)] as const))

    setJobs((prev) => ({
      ...prev,
      ...Object.fromEntries(rows),
    }))
  }

  async function reload(spin: boolean = true) {
    if (spin) {
      setLoad(true)
    }

    setErr("")

    try {
      const next = await systemApi.list()
      setList(next)
      await sync(next.flatMap((item) => (item.task_id ? [item.task_id] : [])))
      return next
    } catch (err) {
      setErr(note(err, "读取启动环境失败"))
      return []
    } finally {
      if (spin) {
        setLoad(false)
      }
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  useEffect(() => {
    if (!list.some((item) => item.status === "installing")) {
      return
    }

    const timer = window.setInterval(() => {
      void reload(false)
    }, 1500)

    return () => window.clearInterval(timer)
  }, [list])

  async function watch(id: string) {
    for (;;) {
      const task = await systemApi.task(id)
      setJobs((prev) => ({
        ...prev,
        [id]: task,
      }))

      if (task.status === "success" || task.status === "failed") {
        return task
      }

      await wait(1200)
    }
  }

  async function act(id: ToolID, action: ToolAction, quiet: boolean = false) {
    const row = list.find((item) => item.id === id)
    const label = row?.label || id
    setBusy(id)

    try {
      const task = await systemApi.action(id, action)
      setJobs((prev) => ({
        ...prev,
        [task.id]: task,
      }))

      const last = await watch(task.id)
      await reload(false)

      if (last.status === "failed") {
        if (!quiet) {
          toast.error(note(last.error, fail(action, label)))
        }
        return last
      }

      if (!quiet) {
        toast.success(done(action, label))
      }

      return last
    } catch (err) {
      if (!quiet) {
        toast.error(note(err, fail(action, label)))
      }
      await reload(false)
      return null
    } finally {
      setBusy("")
    }
  }

  async function run(id: ToolID, quiet: boolean = false) {
    return act(id, "install", quiet)
  }

  async function boot() {
    if (flow) {
      return
    }

    setFlow(true)

    try {
      let rows = await reload(false)

      for (const id of order) {
        const row = rows.find((item) => item.id === id)
        if (!row || row.status === "installed") {
          continue
        }

        const last = await run(id, true)
        rows = await reload(false)

        if (!last || last.status === "failed") {
          toast.error(`${row.label} 处理未完成`)
          return
        }
      }

      toast.success("启动环境已准备完成")
    } catch (err) {
      toast.error(note(err, "一键处理失败"))
    } finally {
      setFlow(false)
    }
  }

  const miss = list.filter((item) => item.status !== "installed").length
  const ok = list.filter((item) => item.status === "installed").length
  const todo = queue(list)
  const live = lead(list, jobs)
  const sum = list.length || 4
  const pct = ready(list)
    ? 100
    : Math.round(((ok + (live && live.status !== "failed" ? fill(live) / 100 : 0)) / sum) * 100)
  const state = load
    ? "正在读取本地工具状态..."
    : flow || list.some((item) => item.status === "installing")
      ? phase(live)
      : ready(list)
        ? "所有必需服务均已就绪。"
        : `还有 ${miss} 项服务需要处理。`
  const hint = todo.length > 0 ? `待处理队列：${todo.join(" -> ")}` : "本机依赖已经全部通过检查。"

  return (
    <div className="h-full w-full overflow-hidden bg-[#06101d] text-white">
      <div className="grid h-full w-full grid-cols-1 overflow-hidden lg:grid-cols-[0.78fr_1.22fr]">
        <section className="relative min-h-0 overflow-hidden border-b border-white/8 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),radial-gradient(circle_at_85%_15%,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(140deg,_rgba(6,16,29,1),_rgba(10,24,38,0.96)_55%,_rgba(7,18,30,1))]" />
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative flex h-full min-h-0 flex-col justify-between px-6 py-6 sm:px-8 lg:px-8 lg:py-7">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100">
                  <Sparkles className="size-3.5" />
                  Strategy Launch Deck
                </div>
                <div className="space-y-2">
                  <h1 className="font-serif text-4xl leading-none tracking-[0.08em] text-white sm:text-[44px]">
                    启动前检查
                  </h1>
                  <p className="max-w-md text-sm leading-6 text-slate-200/82">
                    精简展示 Git、Node.js、npm 和 OpenCode 的启动状态。缺失服务可以在右侧直接处理，若安装不上也可跳转官网手动安装。
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/8 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">已就绪</div>
                  <div className="mt-2 font-mono text-3xl">{ok}</div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">待处理</div>
                  <div className="mt-2 font-mono text-3xl">{miss}</div>
                </div>
                <div className="rounded-3xl border border-white/8 bg-white/6 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">完成度</div>
                  <div className="mt-2 font-mono text-3xl">{pct}%</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.05] p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-cyan-300/30 bg-cyan-400/10 p-2 text-cyan-100">
                    {flow || list.some((item) => item.status === "installing") ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : ready(list) ? (
                      <ShieldCheck className="size-4" />
                    ) : (
                      <ShieldAlert className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <div className="text-sm font-medium text-white">当前状态</div>
                    <div className="text-sm leading-6 text-slate-300">{state}</div>
                    <div className="text-xs leading-5 text-slate-400">{hint}</div>
                  </div>
                </div>
              </div>

              {miss > 0 ? (
                <div className="rounded-[24px] border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />
                    <div className="space-y-1">
                      <div className="font-medium text-white">服务缺失提示</div>
                      <div className="text-amber-50/90">
                        当前仍有服务未就绪，部分页面能力、命令执行或运行时功能可能暂时无法使用。建议优先完成安装；如果程序安装失败，可使用右侧卡片里的官网链接手动安装。
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 pt-6">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#67e8f9_0%,#38bdf8_45%,#f59e0b_100%)] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full bg-white px-6 text-slate-950 hover:bg-slate-100"
                  disabled={load || flow || miss === 0}
                  onClick={() => {
                    void boot()
                  }}
                >
                  {flow ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                  一键处理
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/16 bg-white/6 px-6 text-white hover:bg-white/10"
                  disabled={load}
                  onClick={() => nav("/app")}
                >
                  直接进入
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white"
                  disabled={load || flow}
                  onClick={() => {
                    void reload()
                  }}
                >
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  重新检测
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(9,18,31,0.98),rgba(5,11,20,1))]">
          <div className="flex h-full min-h-0 flex-col px-5 py-5 sm:px-6 lg:px-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {load
                ? Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} className="rounded-3xl border border-white/8 bg-white/5 p-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                      <div className="mt-4 h-2 animate-pulse rounded-full bg-white/10" />
                      <div className="mt-3 h-10 animate-pulse rounded-2xl bg-white/6" />
                    </div>
                  ))
                : list.map((item) => {
                    const task = item.task_id ? jobs[item.task_id] : undefined
                    const tone = meta(task?.status ?? item.status)
                    const lock = flow || busy === item.id || item.status === "installing"
                    const installed = item.status === "installed"
                    const jump = site[item.id]

                    return (
                      <div
                        key={item.id}
                        className="rounded-3xl border border-white/8 bg-white/[0.045] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className={`size-2.5 rounded-full ${tone.dot}`} />
                              <div className="truncate text-base font-medium text-white">{item.label}</div>
                            </div>
                            <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${tone.ring}`}>
                              {tone.text}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2.5">
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                            <span className="truncate">{phase(task, item.status)}</span>
                            <span>{fill(task)}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/8">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#5eead4_0%,#38bdf8_55%,#f59e0b_100%)] transition-all duration-500"
                              style={{ width: `${fill(task)}%` }}
                            />
                          </div>
                          <div className="grid gap-1.5 text-xs text-slate-400 sm:grid-cols-2">
                            <div className="truncate">版本：{item.version || "-"}</div>
                            <div className="truncate">路径：{item.path || "-"}</div>
                            <div>最近检查：{stamp(item.updated_at)}</div>
                            <div>任务步骤：{task?.total ? `${Math.min(task.step || 0, task.total)} / ${task.total}` : "-"}</div>
                          </div>

                          {!installed ? (
                            <div className="rounded-2xl border border-amber-300/18 bg-amber-400/8 px-3 py-2 text-xs leading-5 text-amber-50/90">
                              服务缺失时，相关功能可能无法正常使用。若程序安装失败，可改用官网安装。
                            </div>
                          ) : null}

                          {/* 已安装服务只保留更明确的维护动作，未安装服务保留单一处理入口。 */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {installed ? (
                              <>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="rounded-full border-white/14 bg-white/6 text-white hover:bg-white/10"
                                  disabled={lock}
                                  onClick={() => {
                                    void act(item.id, "reinstall")
                                  }}
                                >
                                  {lock ? <Loader2 className="size-3 animate-spin" /> : text("reinstall")}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white"
                                  disabled={lock}
                                  onClick={() => {
                                    void act(item.id, "uninstall")
                                  }}
                                >
                                  {lock ? <Loader2 className="size-3 animate-spin" /> : text("uninstall")}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white"
                                  asChild
                                >
                                  <a href={jump.url} target="_blank" rel="noreferrer">
                                    {jump.text}
                                    <ExternalLink className="size-3" />
                                  </a>
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="rounded-full border-cyan-300/30 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/15"
                                  disabled={lock}
                                  onClick={() => {
                                    void run(item.id)
                                  }}
                                >
                                  {lock ? <Loader2 className="size-3 animate-spin" /> : text("install")}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  className="rounded-full text-slate-200 hover:bg-white/8 hover:text-white"
                                  asChild
                                >
                                  <a href={jump.url} target="_blank" rel="noreferrer">
                                    {jump.text}
                                    <ExternalLink className="size-3" />
                                  </a>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-[#07111f]">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white">
                  <ShieldAlert className="size-4 text-amber-300" />
                  实时任务日志
                </div>
                <div className="max-w-[50%] truncate text-xs text-slate-400">{live ? phase(live) : "等待任务"}</div>
              </div>

              <div className="grid h-[calc(100%-49px)] min-h-0 grid-rows-[auto_1fr]">
                <div className="grid gap-2 border-b border-white/8 px-4 py-3 text-xs text-slate-400 sm:grid-cols-2">
                  <div>当前任务：{live?.tool || "-"}</div>
                  <div>开始时间：{stamp(live?.started_at)}</div>
                  <div>结束时间：{stamp(live?.finished_at)}</div>
                  <div>退出码：{live?.exit_code ?? "-"}</div>
                </div>

                {/* 日志区域保留滚动能力，但外层布局保持稳定，不再把整页撑出滚动条。 */}
                <div className="scrollbar-none min-h-0 overflow-auto px-4 py-4 font-mono text-xs leading-6 text-slate-200">
                  {err ? (
                    <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-rose-100">
                      {err}
                    </div>
                  ) : live?.log?.length ? (
                    <pre className="whitespace-pre-wrap break-words">{live.log.join("\n")}</pre>
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-slate-500">
                      <div className="space-y-2">
                        <ShieldCheck className="mx-auto size-5 text-emerald-300" />
                        <div>暂无任务日志。完成检查后，可直接进入工作台。</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
