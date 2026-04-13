import { useEffect, useState } from "react"
import { ArrowRight, Loader2, RefreshCcw, Sparkles, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { Button } from "@/components/ui/button"
import type { StartupState, StartupTool } from "@/types/system"

const emptyTool = (id: "git" | "opencode", label: string): StartupTool => ({
  id,
  label,
  installed: false,
  status: "missing",
  updated_at: "",
})

const empty: StartupState = {
  ready: false,
  summary: "",
  opencode: emptyTool("opencode", "OpenCode"),
  git: emptyTool("git", "Git"),
}

function note(err: unknown, text: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return text
}

function badge(item: StartupTool) {
  if (item.status === "installed") {
    return {
      dot: "bg-emerald-500",
      tag: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      text: "已就绪",
    }
  }

  if (item.status === "failed") {
    return {
      dot: "bg-rose-500",
      tag: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      text: "异常",
    }
  }

  return {
    dot: "bg-amber-500",
    tag: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    text: "未准备",
  }
}

function body(item: StartupTool) {
  if (item.status === "failed") return "检测异常"
  if (item.status === "installed") {
    if (item.id === "git") return "Git 已就绪"
    return "OpenCode 已就绪"
  }
  if (item.id === "git") return "等待 Git"
  return "等待 OpenCode"
}

function normalizeTool(input: Partial<StartupTool> | undefined, id: "git" | "opencode", label: string): StartupTool {
  return {
    ...emptyTool(id, label),
    ...input,
    id,
    label: input?.label || label,
    installed: Boolean(input?.installed),
    status: input?.status === "installed" || input?.status === "failed" ? input.status : "missing",
  }
}

function normalizeState(input: Partial<StartupState> | undefined): StartupState {
  return {
    ready: Boolean(input?.ready),
    summary: input?.summary || "",
    opencode: normalizeTool(input?.opencode, "opencode", "OpenCode"),
    git: normalizeTool(input?.git, "git", "Git"),
  }
}

export default function Page() {
  const nav = useNavigate()
  const [state, setState] = useState<StartupState>(empty)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  async function reload(spin: boolean = true) {
    if (spin) setLoad(true)
    setErr("")

    try {
      setState(normalizeState(await systemApi.startup()))
    } catch (err) {
      setErr(note(err, "读取启动环境失败"))
      setState(empty)
    } finally {
      if (spin) setLoad(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function prepare() {
    setBusy(true)

    try {
      const next = normalizeState(await systemApi.startupPrepare())
      setState(next)
      toast.success(next.ready ? "启动环境已准备完成" : "环境状态已更新")
    } catch (err) {
      toast.error(note(err, "准备启动环境失败"))
      await reload(false)
    } finally {
      setBusy(false)
    }
  }

  const list = [state.opencode, state.git]
  const ok = list.filter((item) => item.installed).length
  const pct = Math.round((ok / list.length) * 100)

  return (
    <div className="bg-background text-foreground h-full min-h-0 w-full overflow-hidden">
      <div className="from-primary/8 via-background to-background relative flex h-full min-h-0 w-full overflow-hidden bg-gradient-to-br">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="bg-primary/10 absolute left-1/2 top-[12%] size-80 -translate-x-1/2 rounded-full blur-3xl" />

        <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] tracking-[0.26em]">
              <Sparkles className="size-3.5" />
              SMARTX QUANT AI
            </div>
            <div className="text-muted-foreground text-xs">{state.ready ? "研发环境已就绪" : "等待研发环境准备"}</div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
              <div className="text-primary mb-4 text-sm tracking-[0.34em] uppercase">AI Generated SmartX Strategy</div>
              <h1 className="max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl xl:text-7xl 2xl:text-[88px]">
                AI 生成 SmartX 量化策略
              </h1>
              <p className="text-muted-foreground mt-6 max-w-3xl text-base leading-8 xl:text-lg">
                面向真实量化研发场景，直接生成 SmartX 策略代码、交易逻辑、风控结构与迭代草案。
                页面重点只放在策略研发本身，环境准备由系统自动完成。
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" className="h-12 rounded-full px-7" onClick={() => nav("/app")} disabled={load}>
                  进入 SmartX 策略工作台
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full px-7"
                  disabled={load || busy || state.ready}
                  onClick={() => void prepare()}
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Wrench className="size-4" />}
                  一键准备研发环境
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 rounded-full px-6"
                  disabled={load || busy}
                  onClick={() => void reload()}
                >
                  <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                  重新检测
                </Button>
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl">
            <div className="bg-card/92 rounded-[24px] border px-4 py-4 shadow-sm backdrop-blur-sm lg:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="text-muted-foreground text-xs uppercase tracking-[0.22em]">环境监测</div>
                  <div className="text-muted-foreground mt-2 text-sm leading-6 lg:text-base">
                    {err || state.summary || "系统环境检测中..."}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-background inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap shadow-xs">
                    <span className="text-muted-foreground">环境进度</span>
                    <span className="font-medium">{pct}%</span>
                  </div>

                  {list.map((item) => {
                    const view = badge(item)

                    return (
                      <div
                        key={item.id}
                        className="bg-background inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap shadow-xs"
                      >
                        <div className={`size-2.5 rounded-full ${view.dot}`} />
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground">{body(item)}</span>
                        <span
                          className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${view.tag}`}
                        >
                          {view.text}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
