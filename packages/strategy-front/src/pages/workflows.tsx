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
import type { WorkflowItem, WorkflowRuntimeDetail } from "@/types/workflow"

function blank(path: string): Omit<WorkflowRuntimeDetail, "id" | "updated_at"> {
  return {
    name: "新建工作流",
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
        prompt: "输出实现计划，不要修改代码。",
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
        prompt: "在当前工作区中实现需求。",
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
        prompt: '审查当前代码，并返回包含 "pass"、"summary"、"next_prompt" 的 JSON。',
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

export default function WorkflowsPage() {
  const nav = useNavigate()
  const workspaces = useWorkspaceList()
  const [q, setQ] = useState("")
  const [load, setLoad] = useState(true)
  const [err, setErr] = useState("")
  const [items, setItems] = useState<WorkflowRuntimeDetail[]>([])

  const refresh = async () => {
    setLoad(true)
    setErr("")
    try {
      const data = await workflowApi.list()
      setItems(data.items)
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
    return items
      .map(runtimeItem)
      .filter((item) => {
        if (!key) return true
        return (
          item.name.toLowerCase().includes(key) ||
          item.desc.toLowerCase().includes(key) ||
          item.tags.some((tag) => tag.toLowerCase().includes(key))
        )
      })
  }, [items, q])

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
                基于单工作区会话模型编排“计划、构建、审查”等节点。
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
                placeholder="搜索工作流、标签或工作区..."
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
                  <div className="text-sm text-foreground">单工作区工作流</div>
                  <div className="text-xs text-muted-foreground">
                    每个工作流都绑定一个工作区，并通过监听 opencode 会话状态推进节点。
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
                {list.length} 个工作流
              </div>
            </CardContent>
          </Card>

          <WorkflowList
            items={list as WorkflowItem[]}
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
