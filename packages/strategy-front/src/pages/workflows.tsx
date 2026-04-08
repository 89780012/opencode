import { useEffect, useMemo, useState } from "react"
import { Network, Plus, RefreshCw, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { workflowApi } from "@/api/modules"
import { WorkflowList } from "@/components/workflow/workflow-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWorkspaceList } from "@/data/global-data-provider"
import { runtimeItem } from "@/lib/workflow-runtime"
import type { WorkflowItem, WorkflowRun, WorkflowRuntimeDetail } from "@/types/workflow"

function blank(path: string): Omit<WorkflowRuntimeDetail, "id" | "updated_at"> {
  return {
    name: "新建工作流",
    workspace_path: path,
    root_node_id: "plan-1",
    nodes: [
      {
        id: "plan-1",
        kind: "plan",
        title: "规划",
        agent: "planner",
        skills: [],
        session_mode: "shared",
        prompt: "先输出清晰的实现计划，再进入后续节点。",
        timeout_ms: 0,
        retry_limit: 0,
      },
      {
        id: "build-1",
        kind: "build",
        title: "执行",
        agent: "coder",
        skills: [],
        session_mode: "shared",
        prompt: "在当前工作区内完成需求实现，并保持结果可验证。",
        timeout_ms: 0,
        retry_limit: 0,
      },
      {
        id: "review-1",
        kind: "review",
        title: "检查",
        agent: "reviewer",
        skills: [],
        session_mode: "isolated",
        prompt: '检查当前结果，并返回包含 "pass"、"summary"、"next_prompt" 的 JSON。',
        timeout_ms: 0,
        retry_limit: 0,
      },
    ],
    edges: [
      { id: "edge-1", from: "plan-1", to: "build-1", cond: "always", label: "" },
      { id: "edge-2", from: "build-1", to: "review-1", cond: "always", label: "" },
      { id: "edge-3", from: "review-1", to: "build-1", cond: "fail", label: "重试" },
    ],
  }
}

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
  const workspaces = useWorkspaceList()
  const [q, setQ] = useState("")
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const [items, setItems] = useState<WorkflowRuntimeDetail[]>([])
  const [runs, setRuns] = useState<WorkflowRun[]>([])

  const refresh = async () => {
    setLoad(true)
    setErr("")
    try {
      const [flows, runs] = await Promise.all([workflowApi.list(), workflowApi.runs()])
      setItems(flows.items)
      setRuns(runs.items)
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

  const onCreate = async () => {
    const path = workspaces.workspaces[0]?.path
    if (!path) {
      toast.error("请先创建或导入工作区")
      return
    }
    try {
      const data = await workflowApi.save(blank(path))
      await refresh()
      nav(`/app/workflows/${data.id}`)
    } catch (err) {
      console.error(err)
      toast.error("创建工作流失败")
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
                在单个工作区内编排规划、执行、检查、修复回环和可恢复的阻塞步骤，构建多智能体工作流。
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
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => void onCreate()}>
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
                placeholder="搜索工作流、标签或工作区路径..."
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
                  <div className="text-sm text-foreground">单工作区工作流运行台</div>
                  <div className="text-xs text-muted-foreground">
                    每个工作流绑定一个工作区，并根据 opencode 会话推进到空闲、阻塞、失败等状态。
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
          />
        </div>
      </div>
    </div>
  )
}
