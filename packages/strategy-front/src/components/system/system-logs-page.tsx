import { Loader2, RefreshCcw, ScrollText, Settings2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { systemApi } from "@/api/modules"
import { useSystem } from "@/components/system/system-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SystemLog } from "@/types/system"

const empty: SystemLog = {
  kind: "service",
  path: "",
  lines: [],
}

function clean(data: Partial<SystemLog> | null | undefined, kind: SystemLog["kind"]): SystemLog {
  return {
    kind,
    path: typeof data?.path === "string" ? data.path : "",
    lines: Array.isArray(data?.lines) ? data.lines.filter((item): item is string => typeof item === "string") : [],
  }
}

export function SystemLogsPage() {
  const sys = useSystem()
  const [kind, setKind] = useState<SystemLog["kind"]>("service")
  const [data, setData] = useState<SystemLog>(empty)
  const [load, setLoad] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tail, setTail] = useState(`${sys.cfg.logs.tail}`)

  useEffect(() => {
    setTail(`${sys.cfg.logs.tail}`)
  }, [sys.cfg.logs.tail])

  const reload = useCallback(
    async (next: SystemLog["kind"], spin: boolean = true) => {
      if (spin) {
        setLoad(true)
      }

      try {
        const log = await systemApi.logs(next, Number.parseInt(tail, 10))
        setData(clean(log, next))
      } catch (err) {
        setData(clean(undefined, next))
        if (err instanceof Error) {
          toast.error(err.message)
        }
      } finally {
        if (spin) {
          setLoad(false)
        }
      }
    },
    [tail],
  )

  useEffect(() => {
    void reload(kind)
  }, [kind, reload])

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
      await reload(kind, false)
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
                <CardDescription>服务日志写入 <code>~/.strategy-service/logs</code>，opencode 启动输出现在也会同步落盘。</CardDescription>
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
                <Button variant="outline" onClick={() => void reload(kind)} disabled={load}>
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
              <div className="text-muted-foreground text-xs">当前日志类型</div>
              <div className="mt-2 text-3xl font-semibold">{kind === "service" ? "服务" : "启动"}</div>
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
                <CardDescription>按类型切换查看服务日志与 opencode 启动日志。路径用于你在本地文件系统里继续追踪完整文件。</CardDescription>
              </div>
              <Tabs value={kind} onValueChange={(value) => setKind(value as SystemLog["kind"])}>
                <TabsList className="grid w-[220px] grid-cols-2">
                  <TabsTrigger value="service">服务日志</TabsTrigger>
                  <TabsTrigger value="opencode">启动日志</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 py-6">
            <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="rounded-3xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Settings2 className="text-primary size-4" />
                  文件位置
                </div>
                <div className="break-all text-sm font-medium">{data.path || "-"}</div>
                <p className="text-muted-foreground mt-3 text-xs leading-5">若要看完整历史、压缩归档或和外部编辑器联动，这个路径就是唯一可信入口。</p>
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
                  <div className="text-muted-foreground text-sm leading-6">当前文件还没有可展示的日志行。若服务刚启动，稍后刷新即可。</div>
                ) : (
                  <pre className="max-h-[65vh] overflow-auto rounded-2xl border bg-background p-4 text-xs whitespace-pre-wrap">{lines.join("\n")}</pre>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
