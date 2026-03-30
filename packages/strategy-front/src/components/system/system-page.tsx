"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, RefreshCcw, Wrench } from "lucide-react"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { InstallTask, ToolID, ToolState } from "@/types/system"

const empty: ToolState[] = []

function note(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  return fallback
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
  if (status === "installed") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      text: "已安装",
    }
  }

  if (status === "success") {
    return {
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      text: "已完成",
    }
  }

  if (status === "installing" || status === "running") {
    return {
      tone: "border-blue-200 bg-blue-50 text-blue-700",
      bar: "bg-blue-500",
      text: "安装中",
    }
  }

  if (status === "pending") {
    return {
      tone: "border-sky-200 bg-sky-50 text-sky-700",
      bar: "bg-sky-500",
      text: "排队中",
    }
  }

  if (status === "failed") {
    return {
      tone: "border-red-200 bg-red-50 text-red-700",
      bar: "bg-red-500",
      text: "失败",
    }
  }

  return {
    tone: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    text: "未安装",
  }
}

function ratio(task?: InstallTask) {
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
      return Math.max(12, Math.min(raw, 95))
    }
    return Math.max(task.status === "pending" ? 6 : 10, Math.min(raw - 5, 95))
  }

  if (task.status === "failed") {
    return 12
  }

  if (task.status === "pending") {
    return 6
  }

  if (task.status === "running") {
    return 18
  }

  return 0
}

function phase(task?: InstallTask) {
  if (!task) {
    return ""
  }

  if (task.title) {
    return task.title
  }

  if (task.status === "pending") {
    return "等待开始"
  }

  if (task.status === "running") {
    return "正在执行安装"
  }

  if (task.status === "success") {
    return "安装完成"
  }

  if (task.status === "failed") {
    return "安装失败"
  }

  return "处理中"
}

function count(task?: InstallTask) {
  if (!task) {
    return "-"
  }

  if (task.total <= 0) {
    return task.status === "pending" ? "排队中" : "处理中"
  }

  if (task.status === "success") {
    return `${task.total} / ${task.total}`
  }

  const step = Math.max(task.step, task.status === "running" ? 1 : 0)
  return `${Math.min(step, task.total)} / ${task.total}`
}

export function SystemPage() {
  const [list, setList] = useState<ToolState[]>(empty)
  const [jobs, setJobs] = useState<Record<string, InstallTask>>({})
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState("")
  const [err, setErr] = useState("")

  const sync = useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      return
    }

    const rows = await Promise.all(
      ids.map(async (id) => [id, await systemApi.task(id)] as const),
    )

    setJobs((prev) => ({
      ...prev,
      ...Object.fromEntries(rows),
    }))
  }, [])

  const reload = useCallback(async (spin: boolean = true) => {
    if (spin) {
      setLoad(true)
    }

    setErr("")

    try {
      const next = await systemApi.list()
      setList(next)
      const ids = next.flatMap((item) => (item.task_id ? [item.task_id] : []))
      await sync(ids)
    } catch (err) {
      setErr(note(err, "加载安装状态失败"))
    } finally {
      if (spin) {
        setLoad(false)
      }
    }
  }, [sync])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (!list.some((item) => item.status === "installing")) {
      return
    }

    const timer = window.setInterval(() => {
      void reload(false)
    }, 2000)

    return () => window.clearInterval(timer)
  }, [list, reload])

  async function install(id: ToolID) {
    setBusy(id)

    try {
      const task = await systemApi.install(id)
      setJobs((prev) => ({
        ...prev,
        [task.id]: task,
      }))
      await reload(false)
      toast.success(`${id} 安装任务已启动`)
    } catch (err) {
      toast.error(note(err, `启动 ${id} 安装失败`))
      await reload(false)
    } finally {
      setBusy("")
    }
  }

  const ok = list.filter((item) => item.status === "installed").length
  const run = list.filter((item) => item.status === "installing").length
  const miss = list.filter((item) => item.status === "missing" || item.status === "failed").length

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle>本地依赖安装器</CardTitle>
                <CardDescription>
                  通过 Go 服务检查本机是否安装 git、node、npm、opencode，并提供一键安装、重装、任务状态和完整日志查看。
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => void reload()} disabled={load}>
                <RefreshCcw className={load ? "size-4 animate-spin" : "size-4"} />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">已安装</div>
              <div className="mt-2 text-3xl font-semibold">{ok}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">安装中</div>
              <div className="mt-2 text-3xl font-semibold">{run}</div>
            </div>
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <div className="text-muted-foreground text-sm">待处理</div>
              <div className="mt-2 text-3xl font-semibold">{miss}</div>
            </div>
          </CardContent>
        </Card>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {load ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            正在加载本地工具状态...
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {list.map((item) => {
              const task = item.task_id ? jobs[item.task_id] : undefined
              const tool = meta(item.status)
              const job = task ? meta(task.status) : undefined
              const lock = busy === item.id || item.status === "installing"
              const logs = task?.log ?? []
              const fill = task ? ratio(task) : 0

              return (
                <Card key={item.id} className="gap-0 overflow-hidden">
                  <CardHeader className="border-b">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded-xl border bg-muted/40 p-2">
                            <Wrench className="size-4" />
                          </div>
                          <div>
                            <CardTitle>{item.label}</CardTitle>
                            <CardDescription>{item.id}</CardDescription>
                          </div>
                        </div>
                        <div
                          className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${tool.tone}`}
                        >
                          {tool.text}
                        </div>
                      </div>
                      {item.status === "failed" ? (
                        <AlertTriangle className="size-5 text-red-500" />
                      ) : item.status === "installed" ? (
                        <CheckCircle2 className="size-5 text-emerald-500" />
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 py-6 text-sm">
                    <div className="grid gap-3">
                      <div>
                        <div className="text-muted-foreground text-xs">版本</div>
                        <div className="mt-1 break-all font-medium">{item.version || "-"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">路径</div>
                        <div className="mt-1 break-all font-medium">{item.path || "-"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">状态说明</div>
                        <div className="mt-1 leading-6">{item.message || "检测正常"}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-xs">最近检查</div>
                        <div className="mt-1">{stamp(item.updated_at)}</div>
                      </div>
                    </div>

                    {task ? (
                      <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">安装任务</div>
                          <div
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${job?.tone ?? ""}`}
                          >
                            {job?.text ?? task.status}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="text-muted-foreground">安装进度</div>
                            <div className="font-medium">
                              {count(task)}
                              <span className="text-muted-foreground ml-2">{fill}%</span>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-background">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", job?.bar)}
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border bg-background/80 p-3">
                          <div className="text-muted-foreground text-xs">当前阶段</div>
                          <div className="mt-1 font-medium leading-6">{phase(task)}</div>
                          {task.output && task.output !== task.title ? (
                            <div className="text-muted-foreground mt-2 break-all text-xs leading-5">
                              {task.output}
                            </div>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-xs leading-5">
                          <div>开始时间: {stamp(task.started_at)}</div>
                          <div>结束时间: {stamp(task.finished_at)}</div>
                          <div>退出码: {task.exit_code ?? "-"}</div>
                          <div>错误信息: {task.error || "-"}</div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-muted-foreground text-xs">
                            任务日志 {logs.length ? `(${logs.length})` : ""}
                          </div>
                          <pre className="max-h-64 overflow-auto rounded-xl border bg-background p-3 text-xs leading-5 whitespace-pre-wrap">
                            {logs.length ? logs.join("\n") : "暂无日志输出"}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="border-t">
                    <Button
                      onClick={() => void install(item.id)}
                      disabled={lock}
                      variant={item.installed ? "outline" : "default"}
                    >
                      {lock ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          安装中...
                        </>
                      ) : item.installed ? (
                        "重新安装"
                      ) : (
                        "一键安装"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
