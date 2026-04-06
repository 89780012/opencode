import { CircleDot, Loader2, Play, RotateCcw, SquareTerminal } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpencodeState } from "@/types/system"

const empty: OpencodeState = {
  enabled: false,
  startup: "manual",
  bin: "",
  url: "",
  status: "disabled",
  ready: false,
  running: false,
  owned: false,
}

function tone(state: OpencodeState) {
  if (state.status === "running" || state.status === "external") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }
  if (state.status === "starting" || state.status === "stopping") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }
  if (state.status === "failed") {
    return "border-red-200 bg-red-50 text-red-700"
  }
  return "border-amber-200 bg-amber-50 text-amber-700"
}

export function SystemRuntimePage() {
  const [state, setState] = useState<OpencodeState>(empty)
  const [lines, setLines] = useState<string[]>([])
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState("")

  const reload = useCallback(async (spin: boolean = true) => {
    if (spin) {
      setLoad(true)
    }
    try {
      const [state, log] = await Promise.all([systemApi.opencodeStatus(), systemApi.logTail("opencode", 20)])
      setState(state)
      setLines(log.lines)
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
    } finally {
      if (spin) {
        setLoad(false)
      }
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (state.status !== "starting" && state.status !== "stopping") {
      return
    }
    const timer = window.setInterval(() => {
      void reload(false)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [reload, state.status])

  async function run(kind: "start" | "restart" | "stop") {
    setBusy(kind)
    try {
      const next =
        kind === "start"
          ? await systemApi.opencodeStart()
          : kind === "restart"
            ? await systemApi.opencodeRestart()
            : await systemApi.opencodeStop()
      setState(next)
      setLines((await systemApi.logTail("opencode", 20)).lines)
      toast.success("运行状态已更新")
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
    } finally {
      setBusy("")
    }
  }

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle>运行配置</CardTitle>
                <CardDescription>
                  当前页聚焦 strategy-service 管理的 opencode 运行状态，便于判断是自管进程还是外部进程。
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => void reload()} disabled={load}>
                {load ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">状态</div>
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${tone(state)}`}>
                {state.status}
              </div>
            </div>
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">启动策略</div>
              <div className="mt-3 text-2xl font-semibold">{state.startup || "-"}</div>
            </div>
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">PID</div>
              <div className="mt-3 text-2xl font-semibold">{state.pid || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader className="border-b">
              <CardTitle>基础信息</CardTitle>
              <CardDescription>这些值直接反映后端当前的运行态和启动参数。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 py-6 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">服务地址</div>
                <div className="mt-1 break-all font-medium">{state.url || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">可执行文件</div>
                <div className="mt-1 break-all font-medium">{state.bin || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>运行操作</CardTitle>
              <CardDescription>优先保留简单直接的三种操作，避免系统设置页承载过多低频控制项。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-6">
              <div className="grid gap-3 md:grid-cols-3">
                <Button onClick={() => void run("start")} disabled={busy !== ""}>
                  {busy === "start" ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                  启动
                </Button>
                <Button variant="outline" onClick={() => void run("restart")} disabled={busy !== ""}>
                  {busy === "restart" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  重启
                </Button>
                <Button variant="outline" onClick={() => void run("stop")} disabled={busy !== ""}>
                  {busy === "stop" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SquareTerminal className="size-4" />
                  )}
                  停止
                </Button>
              </div>
              <div className="rounded-3xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <CircleDot className="text-primary size-4" />
                  最近输出
                </div>
                {lines.length === 0 ? (
                  <div className="text-muted-foreground text-xs leading-5">
                    当前没有新的 stdout/stderr 输出。若需要长期排查，请到日志页查看落盘文件。
                  </div>
                ) : (
                  <pre className="max-h-80 overflow-auto rounded-2xl border bg-background p-3 text-xs whitespace-pre-wrap">
                    {lines.join("\n")}
                  </pre>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
