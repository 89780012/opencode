import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { workflowApi } from "@/api/modules"
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas"
import { WorkflowLibrary } from "@/components/workflow/workflow-library"
import { WorkflowSidepanel } from "@/components/workflow/workflow-sidepanel"
import { WorkflowTopbar } from "@/components/workflow/workflow-topbar"
import { Button } from "@/components/ui/button"
import { fromFlow, runtimeDetail } from "@/lib/workflow-runtime"
import type {
  WorkflowDetail,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeRun,
  WorkflowRun,
  WorkflowRuntimeDetail,
} from "@/types/workflow"

export function WorkflowShell(props: { item: WorkflowRuntimeDetail; onRefresh?: () => Promise<void> | void }) {
  const [open, setOpen] = useState(true)
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState("")
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [item, setItem] = useState(props.item)
  const [flow, setFlow] = useState<WorkflowDetail>(() => runtimeDetail(props.item))

  useEffect(() => {
    setItem(props.item)
    setFlow(runtimeDetail(props.item))
  }, [props.item])

  const blocked = run?.status === "blocked"
  const current = useMemo(() => rows.find((row) => row.node_id === run?.current_node_id) ?? null, [rows, run])

  const refreshRun = useCallback(
    async (runID?: string) => {
      const id = runID || run?.id
      if (!id) return
      const [next, list] = await Promise.all([workflowApi.run(id), workflowApi.nodeRuns(id)])
      setRun(next)
      setRows(list.items)
    },
    [run?.id],
  )

  useEffect(() => {
    if (!run?.id) return
    if (run.status !== "running" && run.status !== "blocked") return

    const timer = window.setInterval(() => {
      void refreshRun(run.id)
    }, 2000)

    return () => window.clearInterval(timer)
  }, [refreshRun, run?.id, run?.status])

  const onCanvasChange = useCallback((nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
    setFlow((prev) => {
      if (prev.nodes === nodes && prev.edges === edges) return prev
      return {
        ...prev,
        count: nodes.length,
        nodes,
        edges,
      }
    })
  }, [])

  const onSave = async () => {
    setBusy(true)
    try {
      const next = fromFlow(item, flow.nodes, flow.edges)
      const data = item.id ? await workflowApi.update(item.id, next) : await workflowApi.save(next)
      setItem(data)
      setFlow(runtimeDetail(data))
      toast.success("工作流已保存")
      await props.onRefresh?.()
    } catch (err) {
      console.error(err)
      toast.error("保存工作流失败")
    } finally {
      setBusy(false)
    }
  }

  const onRun = async () => {
    setBusy(true)
    try {
      const next = fromFlow(item, flow.nodes, flow.edges)
      const data = item.id ? await workflowApi.update(item.id, next) : await workflowApi.save(next)
      setItem(data)
      const out = await workflowApi.start(data.id, text.trim())
      setRun(out.run)
      setRows([out.node_run])
      toast.success("工作流已启动")
    } catch (err) {
      console.error(err)
      toast.error("启动工作流失败")
    } finally {
      setBusy(false)
    }
  }

  const onContinue = async () => {
    if (!run) return
    setBusy(true)
    try {
      const out = await workflowApi.continue(run.id)
      setRun(out.run)
      await refreshRun(run.id)
      toast.success("工作流已继续")
    } catch (err) {
      console.error(err)
      toast.error("继续工作流失败")
    } finally {
      setBusy(false)
    }
  }

  const onRefresh = async () => {
    setBusy(true)
    try {
      const data = await workflowApi.get(item.id)
      setItem(data)
      setFlow(runtimeDetail(data))
      await refreshRun(run?.id)
      await props.onRefresh?.()
    } catch (err) {
      console.error(err)
      toast.error("刷新工作流失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="border-b border-border/70 bg-sidebar px-5 py-1 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="outline" size="icon-sm" className="rounded-full" asChild>
              <Link to="/app/workflows">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{item.name}</div>
              <div className="truncate text-xs text-muted-foreground">{item.workspace_path}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkflowTopbar
              busy={busy}
              blocked={blocked}
              onSave={() => void onSave()}
              onRun={() => void onRun()}
              onRefresh={() => void onRefresh()}
              onContinue={blocked ? () => void onContinue() : undefined}
            />
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen((prev) => !prev)}>
              {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
              {open ? "隐藏节点库" : "显示节点库"}
            </Button>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0">
          {open ? <WorkflowLibrary value={q} onValue={setQ} /> : null}

          <div className="relative min-h-0 flex-1">
            <div className="h-full">
              <WorkflowCanvas item={flow} onPick={() => {}} onEdgePick={() => {}} onChange={onCanvasChange} />
            </div>
          </div>

          <WorkflowSidepanel text={text} run={run} rows={rows} current={current} onText={setText} />
        </div>
      </div>
    </div>
  )
}
