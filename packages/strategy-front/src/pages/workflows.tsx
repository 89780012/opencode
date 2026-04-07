import { useMemo, useState } from "react"
import { Network, Plus, RefreshCw, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { WorkflowList } from "@/components/workflow/workflow-list"
import { workflowList } from "@/data/workflow-demo"

export default function WorkflowsPage() {
  const nav = useNavigate()
  const [q, setQ] = useState("")
  const list = useMemo(() => {
    const key = q.trim().toLowerCase()
    return workflowList.filter((item) => {
      if (!key) return true
      return (
        item.name.toLowerCase().includes(key) ||
        item.desc.toLowerCase().includes(key) ||
        item.tags.some((tag) => tag.toLowerCase().includes(key))
      )
    })
  }, [q])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background dark:bg-[#0f1111]">
      <div className="border-b bg-background dark:border-[#2a2f2d] dark:bg-[#111414]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mt-3 text-3xl font-semibold tracking-tight text-foreground">工作流</div>
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                先做一版贴近编排器形态的 demo，左侧组件库、中央画布和表单型节点都会在这里串起来。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-200 bg-white text-slate-900 hover:bg-slate-100"
              >
                <RefreshCw className="size-4" />
                刷新
              </Button>
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800">
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
                placeholder="搜索工作流、标签或描述..."
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
                  <div className="text-sm text-foreground">画布编排 Demo</div>
                  <div className="text-xs text-muted-foreground">
                    这一步先把交互壳和视觉框架做对，再接真实流程定义。
                  </div>
                </div>
              </div>
              <div className="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
                共 {list.length} 个工作流
              </div>
            </CardContent>
          </Card>

          <WorkflowList items={list} onOpen={(id) => nav(`/app/workflows/${id}`)} />
        </div>
      </div>
    </div>
  )
}
