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
    name: "New workflow",
    workspace_path: path,
    root_node_id: "plan-1",
    nodes: [
      {
        id: "plan-1",
        kind: "plan",
        title: "planner",
        agent: "planner",
        skills: [],
        session_mode: "shared",
        prompt: "Produce a clear implementation plan before any code changes.",
        timeout_ms: 0,
        retry_limit: 0,
      },
      {
        id: "build-1",
        kind: "build",
        title: "coder",
        agent: "coder",
        skills: [],
        session_mode: "shared",
        prompt: "Implement the requested change inside the current workspace and keep it verifiable.",
        timeout_ms: 0,
        retry_limit: 0,
      },
      {
        id: "review-1",
        kind: "review",
        title: "reviewer",
        agent: "reviewer",
        skills: [],
        session_mode: "isolated",
        prompt: 'Inspect the current code and return JSON with keys "pass", "summary", and "next_prompt".',
        timeout_ms: 0,
        retry_limit: 0,
      },
    ],
    edges: [
      { id: "edge-1", from: "plan-1", to: "build-1", cond: "always", label: "" },
      { id: "edge-2", from: "build-1", to: "review-1", cond: "always", label: "" },
      { id: "edge-3", from: "review-1", to: "build-1", cond: "fail", label: "Retry" },
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
      setErr("Failed to load workflows")
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
      toast.error("Create or import a workspace first")
      return
    }
    try {
      const data = await workflowApi.save(blank(path))
      await refresh()
      nav(`/app/workflows/${data.id}`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to create workflow")
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background dark:border-[#2a2f2d] dark:bg-[#111414]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Workflows</div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                Build single-workspace multi-agent workflows with planning, execution, checking, repair loops, and
                resumable blocked steps.
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
                Refresh
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => void onCreate()}>
                <Plus className="size-4" />
                New Workflow
              </Button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search workflows, tags, or workspace paths..."
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
                  <div className="text-sm text-foreground">Single-workspace workflow runtime</div>
                  <div className="text-xs text-muted-foreground">
                    Each workflow targets one workspace and advances when opencode sessions reach idle, blocked, or
                    failed states.
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
                  {list.length} workflows
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  {stats.done} done
                </div>
                <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  {stats.running} running
                </div>
                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {stats.blocked} blocked
                </div>
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  {stats.failed} failed
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
