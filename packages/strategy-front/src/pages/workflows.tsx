import { useEffect, useMemo, useState } from "react"
import { Network, Plus, RefreshCw, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { workflowApi } from "@/api/modules"
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog"
import { WorkflowCreateDialog } from "@/components/workflow/workflow-create-dialog"
import { WorkflowList } from "@/components/workflow/workflow-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { runtimeItem } from "@/lib/workflow-runtime"
import { starter } from "@/lib/workflow-template"
import type { WorkflowItem, WorkflowRun, WorkflowRuntimeDetail } from "@/types/workflow"

function merge(items: WorkflowRuntimeDetail[], runs: WorkflowRun[]) {
  const map = new Map<string, WorkflowRun[]>()
  for (const item of runs) {
    map.set(item.workflow_id, [...(map.get(item.workflow_id) || []), item])
  }

  return items.map((item) => {
    const base = runtimeItem(item)
    const list = [...(map.get(item.id) || [])].sort((a, b) => b.started_at - a.started_at)
    const cur = list[0]
    return {
      ...base,
      run_status: cur?.status,
      run_total: list.length,
      run_at: cur?.started_at,
      done_runs: list.filter((item) => item.status === "done").length,
      failed_runs: list.filter((item) => item.status === "failed").length,
      blocked_runs: list.filter((item) => item.status === "blocked").length,
    } satisfies WorkflowItem
  })
}

export default function WorkflowsPage() {
  const nav = useNavigate()
  const [q, setQ] = useState("")
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const [items, setItems] = useState<WorkflowRuntimeDetail[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [drop, setDrop] = useState<WorkflowItem | null>(null)

  const refresh = async () => {
    setLoad(true)
    setErr("")
    try {
      const [flows, rows] = await Promise.all([workflowApi.list(), workflowApi.runs()])
      setItems(flows.items || [])
      setRuns(rows.items || [])
    } catch (err) {
      console.error(err)
      setErr("加载工作流失败")
    } finally {
      setLoad(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return merge(items, runs).filter((item) => {
      if (!key) return true
      return (
        item.name.toLowerCase().includes(key) ||
        item.desc.toLowerCase().includes(key) ||
        item.tags.some((tag) => tag.toLowerCase().includes(key))
      )
    })
  }, [items, q, runs])

  const stats = useMemo(
    () => ({
      running: runs.filter((item) => item.status === "running").length,
      blocked: runs.filter((item) => item.status === "blocked").length,
      failed: runs.filter((item) => item.status === "failed").length,
      done: runs.filter((item) => item.status === "done").length,
    }),
    [runs],
  )

  const onCreate = async (name: string) => {
    setBusy(true)
    try {
      const data = await workflowApi.save(starter(name))
      setOpen(false)
      await refresh()
      nav(`/app/workflows/${data.id}`)
      toast.success("已创建默认工作流骨架")
    } catch (err) {
      console.error(err)
      toast.error("创建工作流失败")
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (!drop) return
    setBusy(true)
    try {
      await workflowApi.remove(drop.id)
      setDrop(null)
      await refresh()
      toast.success("工作流已删除")
    } catch (err) {
      console.error(err)
      toast.error("删除工作流失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background dark:border-[#2a2f2d] dark:bg-[#111414]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">工作流</div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                在同一个代码工作区里编排多节点协作流程，把规划、执行、检查、回写串成可重复运行的固定链路。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => {
                  void refresh()
                }}
                disabled={load}
              >
                <RefreshCw className={`size-4 ${load ? "animate-spin" : ""}`} />
                刷新
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                新建工作流
              </Button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="搜索工作流名称、标签或节点类型..."
                className="h-9 rounded-xl border-slate-200 bg-background pl-10 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-4">
          <Card className="rounded-md border border-primary/12 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(255,255,255,0.92))] py-0">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Network className="size-5" />
                </div>
                <div>
                  <div className="text-sm text-foreground">固定工作流控制台</div>
                  <div className="text-xs text-muted-foreground">
                    新工作流会默认生成一套可直接调整的骨架，包含开始、路由、规划、执行、检查和结束节点。
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
                  {list.length} 个工作流
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {stats.done} 个完成
                </div>
                <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  {stats.running} 个运行中
                </div>
                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {stats.blocked} 个阻塞
                </div>
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  {stats.failed} 个失败
                </div>
              </div>
            </CardContent>
          </Card>

          <WorkflowList
            items={list}
            err={err || null}
            onRetry={() => {
              void refresh()
            }}
            onOpen={(id) => nav(`/app/workflows/${id}`)}
            onDelete={setDrop}
          />
        </div>
      </div>

      <WorkflowCreateDialog open={open} busy={busy} onOpenChange={setOpen} onConfirm={(name) => void onCreate(name)} />

      <DeleteConfirmDialog
        open={!!drop}
        busy={busy}
        title="删除工作流"
        name={drop?.name || ""}
        desc="这会删除工作流本身，以及它对应的运行记录和节点运行记录。"
        onOpenChange={(open) => {
          if (!open) setDrop(null)
        }}
        onConfirm={() => void onDelete()}
      />
    </div>
  )
}
