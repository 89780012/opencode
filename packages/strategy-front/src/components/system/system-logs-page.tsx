import { Loader2, RefreshCcw, ScrollText, Settings2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { useSystem } from "@/components/system/system-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LogSource, LogTail } from "@/types/system"

const empty: LogTail = {
  source: {
    id: "service",
    label: "Strategy Service",
    type: "managed",
    format: "json",
    path: "",
    watchable: true,
    rotated: true,
  },
  path: "",
  lines: [],
}

function clean(data: Partial<LogTail> | null | undefined, source?: LogSource): LogTail {
  return {
    source:
      source ??
      (data?.source && typeof data.source === "object"
        ? data.source
        : empty.source),
    path: typeof data?.path === "string" ? data.path : source?.path ?? "",
    lines: Array.isArray(data?.lines) ? data.lines.filter((item): item is string => typeof item === "string") : [],
  }
}

function label(row: LogSource) {
  if (row.id === "service") {
    return "服务日志"
  }
  if (row.id === "opencode") {
    return "OpenCode 日志"
  }
  return row.label
}

function brief(row: LogSource | undefined) {
  if (!row) {
    return "-"
  }
  if (row.type === "managed") {
    return "托管服务日志"
  }
  return "托管子进程日志"
}

export function SystemLogsPage() {
  const sys = useSystem()
  const [id, setId] = useState("service")
  const [rows, setRows] = useState<LogSource[]>([])
  const [data, setData] = useState<LogTail>(empty)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tail, setTail] = useState(`${sys.cfg.logs.tail}`)

  useEffect(() => {
    setTail(`${sys.cfg.logs.tail}`)
  }, [sys.cfg.logs.tail])

  const row = useMemo(() => rows.find((item) => item.id === id) ?? rows[0], [id, rows])

  const pull = useCallback(
    async (next: string, spin: boolean = true, list: LogSource[] = rows) => {
      if (spin) {
        setLoad(true)
      }

      try {
        const out = await systemApi.logTail(next, Number.parseInt(tail, 10))
        setData(clean(out, list.find((item) => item.id === next)))
      } catch (err) {
        setData(clean(undefined, list.find((item) => item.id === next)))
        if (err instanceof Error) {
          toast.error(err.message)
        }
      } finally {
        if (spin) {
          setLoad(false)
        }
      }
    },
    [rows, tail],
  )

  const pullSources = useCallback(async () => {
    try {
      const out = await systemApi.logSources(10)
      const list = Array.isArray(out.sources) ? out.sources : []
      setRows(list)
      return list
    } catch (err) {
      setRows([])
      if (err instanceof Error) {
        toast.error(err.message)
      }
      return []
    }
  }, [])

  useEffect(() => {
    void (async () => {
      setLoad(true)
      const list = await pullSources()
      const next = list.find((item) => item.id === id)?.id ?? list[0]?.id ?? "service"
      if (next !== id) {
        setId(next)
      }
      await pull(next, false, list)
      setLoad(false)
    })()
  }, [])

  useEffect(() => {
    if (!row) {
      return
    }
    void pull(row.id)
  }, [pull, row?.id])

  async function save(value: string) {
    setBusy(true)
    try {
      const next = Number.parseInt(value, 10)
      if (!Number.isFinite(next)) {
        return
      }

      await sys.save({
        ...sys.cfg,
        logs: {
          tail: next,
        },
      })
      setTail(`${next}`)
      await pull(id, false)
      toast.success("日志默认行数已保存")
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const lines = data.lines

  return (
    <div className="bg-background h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle>日志设置与查看</CardTitle>
                <CardDescription>统一日志页仅展示托管服务和 OpenCode 托管进程日志。</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={tail} onValueChange={(value) => void save(value)} disabled={busy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="默认行数" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 行</SelectItem>
                    <SelectItem value="200">200 行</SelectItem>
                    <SelectItem value="500">500 行</SelectItem>
                    <SelectItem value="1000">1000 行</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() =>
                    void (async () => {
                      setLoad(true)
                      const list = await pullSources()
                      const next = list.find((item) => item.id === id)?.id ?? list[0]?.id ?? "service"
                      if (next !== id) {
                        setId(next)
                        setLoad(false)
                        return
                      }
                      await pull(next, false, list)
                      setLoad(false)
                    })()
                  }
                  disabled={load}
                >
                  {load ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
                  刷新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6 md:grid-cols-3">
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">默认查看行数</div>
              <div className="mt-2 text-3xl font-semibold">{sys.cfg.logs.tail}</div>
            </div>
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">当前日志来源</div>
              <div className="mt-2 text-3xl font-semibold">{row ? row.label : "-"}</div>
            </div>
            <div className="rounded-3xl border bg-muted/20 p-4">
              <div className="text-muted-foreground text-xs">当前返回行数</div>
              <div className="mt-2 text-3xl font-semibold">{lines.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <CardTitle>日志内容</CardTitle>
                <CardDescription>来源列表由后端统一返回，页面只保留当前需要的托管日志来源。</CardDescription>
              </div>
              <Select value={row?.id ?? id} onValueChange={setId}>
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue placeholder="选择日志来源" />
                </SelectTrigger>
                <SelectContent>
                  {rows.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {label(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 py-6">
            <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="rounded-3xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="text-primary size-4" />
                  来源信息
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">来源类型</div>
                    <div className="mt-1 font-medium">{brief(row)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">文件位置</div>
                    <div className="mt-1 break-all font-medium">{data.path || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">日志格式</div>
                    <div className="mt-1 font-medium">{row?.format ?? "-"}</div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <ScrollText className="text-primary size-4" />
                  最近内容
                </div>
                {load ? (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Loader2 className="size-4 animate-spin" />
                    正在读取日志...
                  </div>
                ) : lines.length === 0 ? (
                  <div className="text-muted-foreground text-sm leading-6">
                    当前来源还没有可展示的日志内容。若服务刚启动，稍后刷新即可。
                  </div>
                ) : (
                  <pre className="max-h-[65vh] overflow-auto rounded-2xl border bg-background p-4 text-xs whitespace-pre-wrap">
                    {lines.join("\n")}
                  </pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
