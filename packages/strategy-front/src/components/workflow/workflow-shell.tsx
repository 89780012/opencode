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
  WorkflowEdgeCond,
  WorkflowField,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeRun,
  WorkflowRun,
  WorkflowRuntimeDetail,
  WorkflowSummary,
} from "@/types/workflow"

function sortRuns(list: WorkflowRun[]) {
  return [...list].sort((a, b) => b.started_at - a.started_at)
}

function sortRows(list: WorkflowNodeRun[]) {
  return [...list].sort((a, b) => a.started_at - b.started_at)
}

export function WorkflowShell(props: { item: WorkflowRuntimeDetail; onRefresh?: () => Promise<void> | void }) {
  const [open, setOpen] = useState(true)
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [summary, setSummary] = useState<WorkflowSummary | null>(null)
  const [item, setItem] = useState(props.item)
  const [flow, setFlow] = useState<WorkflowDetail>(() => runtimeDetail(props.item))
  const [edgeID, setEdgeID] = useState("")
  const [nodeID, setNodeID] = useState("")

  useEffect(() => {
    setItem(props.item)
    setFlow(runtimeDetail(props.item))
    setEdgeID("")
    setNodeID("")
  }, [props.item])

  const current = useMemo(() => {
    const list = rows.filter((row) => row.node_id === run?.current_node_id)
    return list.at(-1) ?? null
  }, [rows, run?.current_node_id])

  const edge = useMemo(() => flow.edges.find((item) => item.id === edgeID) ?? null, [edgeID, flow.edges])
  const node = useMemo(() => flow.nodes.find((item) => item.id === nodeID) ?? null, [flow.nodes, nodeID])

  useEffect(() => {
    if (!edgeID) return
    if (flow.edges.some((item) => item.id === edgeID)) return
    setEdgeID("")
  }, [edgeID, flow.edges])

  useEffect(() => {
    if (!nodeID) return
    if (flow.nodes.some((item) => item.id === nodeID)) return
    setNodeID("")
  }, [flow.nodes, nodeID])

  const sync = useCallback(
    async (runID?: string) => {
      const [stats, data] = await Promise.all([
        workflowApi.summary(item.id).catch(() => null),
        workflowApi.runs(item.id).catch(() => ({ items: [] })),
      ])
      const nextRuns = sortRuns(data.items || [])
      setSummary(stats)
      setRuns(nextRuns)

      const id = runID || nextRuns[0]?.id
      if (!id) {
        setRun(null)
        setRows([])
        return
      }

      const [nextRun, nextRows] = await Promise.all([workflowApi.run(id), workflowApi.nodeRuns(id)])
      setRun(nextRun)
      setRows(sortRows(nextRows.items || []))
    },
    [item.id],
  )

  useEffect(() => {
    void sync()
  }, [sync])

  useEffect(() => {
    if (!run?.id) return
    if (run.status !== "running" && run.status !== "blocked") return

    const timer = window.setInterval(() => {
      void sync(run.id)
    }, 2000)

    return () => window.clearInterval(timer)
  }, [run?.id, run?.status, sync])

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

  const onPick = useCallback((node: WorkflowFlowNode | null) => {
    setNodeID(node?.id || "")
    if (node) setEdgeID("")
  }, [])

  const onEdgeCond = useCallback(
    (cond: WorkflowEdgeCond) => {
      setFlow((prev) => ({
        ...prev,
        edges: prev.edges.map((item) =>
          item.id === edgeID
            ? {
                ...item,
                data: {
                  ...item.data,
                  cond,
                },
              }
            : item,
        ),
      }))
    },
    [edgeID],
  )

  const onEdgeLabel = useCallback(
    (label: string) => {
      setFlow((prev) => ({
        ...prev,
        edges: prev.edges.map((item) => (item.id === edgeID ? { ...item, label } : item)),
      }))
    },
    [edgeID],
  )

  const onNodeTitle = useCallback(
    (title: string) => {
      setFlow((prev) => ({
        ...prev,
        nodes: prev.nodes.map((item) => (item.id === nodeID ? { ...item, data: { ...item.data, title } } : item)),
      }))
    },
    [nodeID],
  )

  const onNodeFields = useCallback(
    (fields: WorkflowField[]) => {
      setFlow((prev) => ({
        ...prev,
        nodes: prev.nodes.map((item) => (item.id === nodeID ? { ...item, data: { ...item.data, fields } } : item)),
      }))
    },
    [nodeID],
  )

  const persist = async () => {
    const next = fromFlow(item, flow.nodes, flow.edges)
    const data = item.id ? await workflowApi.update(item.id, next) : await workflowApi.save(next)
    setItem(data)
    return data
  }

  const onSave = async () => {
    setBusy(true)
    try {
      const data = await persist()
      setFlow(runtimeDetail(data))
      toast.success("工作流已保存")
    } catch (err) {
      console.error(err)
      toast.error("保存工作流失败")
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
      await sync(run?.id)
      await props.onRefresh?.()
      toast.success("工作流已刷新")
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
              <div className="truncate text-xs text-muted-foreground">
                这里编辑的是工作流模板，真正的运行绑定会发生在策略创建后的固定聊天入口里。
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WorkflowTopbar busy={busy} onSave={() => void onSave()} onRefresh={() => void onRefresh()} />
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
              <WorkflowCanvas
                item={flow}
                onPick={onPick}
                onEdgePick={(edge) => setEdgeID(edge?.id || "")}
                onChange={onCanvasChange}
              />
            </div>
          </div>

          <WorkflowSidepanel
            edge={edge}
            node={node}
            run={run}
            runs={runs}
            summary={summary}
            rows={rows}
            current={current}
            nodes={flow.nodes}
            onPickRun={(id) => void sync(id)}
            onEdgeCond={onEdgeCond}
            onEdgeLabel={onEdgeLabel}
            onNodeTitle={onNodeTitle}
            onNodeFields={onNodeFields}
          />
        </div>
      </div>
    </div>
  )
}
