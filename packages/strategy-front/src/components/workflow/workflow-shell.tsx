import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { workflowApi } from "@/api/modules"
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas"
import { WorkflowLibrary } from "@/components/workflow/workflow-library"
import { WorkflowTopbar } from "@/components/workflow/workflow-topbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fromFlow, runtimeDetail } from "@/lib/workflow-runtime"
import type {
  WorkflowDetail,
  WorkflowEdgeCond,
  WorkflowFlowEdge,
  WorkflowFlowNode,
  WorkflowNodeData,
  WorkflowNodeRun,
  WorkflowRun,
  WorkflowRuntimeDetail,
} from "@/types/workflow"

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function stamp(value?: number) {
  if (!value) return "-"
  return fmt.format(new Date(value))
}

function readNote(fields: WorkflowNodeData["fields"], label: string) {
  const item = fields.find((field) => field.kind === "note" && field.label === label)
  if (!item || item.kind !== "note") return ""
  return item.value
}

function readSelect(fields: WorkflowNodeData["fields"], label: string, fallback: string) {
  const item = fields.find((field) => field.kind === "select" && field.label === label)
  if (!item || item.kind !== "select") return fallback
  return item.value || fallback
}

export function WorkflowShell(props: { item: WorkflowRuntimeDetail; onRefresh?: () => Promise<void> | void }) {
  const [open, setOpen] = useState(true)
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState("")
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [item, setItem] = useState(props.item)
  const [flow, setFlow] = useState<WorkflowDetail>(() => runtimeDetail(props.item))
  const [pick, setPick] = useState<WorkflowFlowNode | null>(null)
  const [edge, setEdge] = useState<WorkflowFlowEdge | null>(null)

  useEffect(() => {
    setItem(props.item)
    setFlow(runtimeDetail(props.item))
    setPick(null)
    setEdge(null)
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

  const setNode = (id: string, map: (node: WorkflowFlowNode) => WorkflowFlowNode) => {
    setFlow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => (node.id === id ? map(node) : node)),
    }))
  }

  const setFields = (id: string, map: (fields: WorkflowNodeData["fields"]) => WorkflowNodeData["fields"]) => {
    setNode(id, (node) => ({
      ...node,
      data: {
        ...node.data,
        fields: map(node.data.fields),
      },
    }))
  }

  const setEdgeRow = (id: string, map: (row: WorkflowFlowEdge) => WorkflowFlowEdge) => {
    setFlow((prev) => ({
      ...prev,
      edges: prev.edges.map((row) => (row.id === id ? map(row) : row)),
    }))
  }

  const onCanvasChange = useCallback((nodes: WorkflowFlowNode[], edges: WorkflowFlowEdge[]) => {
    setFlow((prev) => ({
      ...prev,
      count: nodes.length,
      nodes,
      edges,
    }))
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

  const syncPick = (id: string, value: string, label: string) => {
    setPick((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              fields: prev.data.fields.map((item) =>
                item.kind === "note" && item.label === label ? { ...item, value } : item,
              ),
            },
          }
        : prev,
    )
    setFields(id, (fields) => fields.map((item) => (item.kind === "note" && item.label === label ? { ...item, value } : item)))
  }

  const syncPickMode = (id: string, value: string) => {
    setPick((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              fields: prev.data.fields.map((item) =>
                item.kind === "select" && item.label === "会话" ? { ...item, value } : item,
              ),
            },
          }
        : prev,
    )
    setFields(id, (fields) => fields.map((item) => (item.kind === "select" && item.label === "会话" ? { ...item, value } : item)))
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
              <WorkflowCanvas item={flow} onPick={setPick} onEdgePick={setEdge} onChange={onCanvasChange} />
            </div>
          </div>

          <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-border/70 bg-sidebar">
            <div className="border-b border-border/70 px-4 py-4">
              <div className="text-sm font-medium text-foreground">运行输入</div>
              <div className="mt-1 text-xs text-muted-foreground">工作流根会话共享的启动输入。</div>
              <textarea
                value={text}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)}
                placeholder="描述这次工作流要完成的目标..."
                className="mt-3 min-h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="border-b border-border/70 px-4 py-4">
              <div className="text-sm font-medium text-foreground">运行状态</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">状态</span>
                  <span className="font-medium text-foreground">{run?.status || "idle"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">当前节点</span>
                  <span className="max-w-40 truncate font-medium text-foreground">{run?.current_node_id || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">开始时间</span>
                  <span className="font-medium text-foreground">{stamp(run?.started_at)}</span>
                </div>
                {run?.error ? <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{run.error}</div> : null}
                {current?.error ? (
                  <div className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    当前节点：{current.error}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-b border-border/70 px-4 py-4">
              <div className="text-sm font-medium text-foreground">详情编辑</div>
              {pick ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label>节点标题</Label>
                    <Input
                      value={pick.data.title}
                      onChange={(event) => {
                        const value = event.target.value
                        setPick((prev) => (prev ? { ...prev, data: { ...prev.data, title: value } } : prev))
                        setNode(pick.id, (node) => ({ ...node, data: { ...node.data, title: value } }))
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>智能体</Label>
                    <Input value={readNote(pick.data.fields, "智能体")} onChange={(event) => syncPick(pick.id, event.target.value, "智能体")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>会话模式</Label>
                    <select
                      value={readSelect(pick.data.fields, "会话", pick.data.kind === "review" ? "isolated" : "shared")}
                      onChange={(event) => syncPickMode(pick.id, event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="shared">shared</option>
                      <option value="isolated">isolated</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>提示词</Label>
                    <textarea
                      value={readNote(pick.data.fields, "提示词")}
                      onChange={(event) => syncPick(pick.id, event.target.value, "提示词")}
                      className="min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : edge ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1.5">
                    <Label>连线标签</Label>
                    <Input
                      value={typeof edge.label === "string" ? edge.label : ""}
                      onChange={(event) => {
                        const value = event.target.value
                        setEdge((prev) => (prev ? { ...prev, label: value } : prev))
                        setEdgeRow(edge.id, (row) => ({ ...row, label: value }))
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>触发条件</Label>
                    <select
                      value={
                        edge.data?.cond === "pass" || edge.data?.cond === "fail" || edge.data?.cond === "always"
                          ? edge.data.cond
                          : "always"
                      }
                      onChange={(event) => {
                        const value = event.target.value as WorkflowEdgeCond
                        setEdge((prev) => (prev ? { ...prev, data: { ...prev.data, cond: value } } : prev))
                        setEdgeRow(edge.id, (row) => ({ ...row, data: { ...row.data, cond: value } }))
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="always">always</option>
                      <option value="pass">pass</option>
                      <option value="fail">fail</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                  选择一个节点或一条连线后，可在这里编辑详情。
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-3 text-sm font-medium text-foreground">节点运行记录</div>
              <div className="space-y-3">
                {rows.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                    还没有运行记录。
                  </div>
                ) : (
                  rows.map((row) => (
                    <section key={row.id} className="rounded-md border border-border/70 bg-background px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">{row.node_id}</div>
                        <div className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {row.status}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">会话：{row.session_id}</div>
                      {row.output ? <div className="mt-2 whitespace-pre-wrap text-xs leading-5 text-foreground">{row.output}</div> : null}
                      {row.result.next_prompt ? (
                        <div className="mt-2 rounded-md bg-muted px-2 py-2 text-xs leading-5 text-muted-foreground">
                          回写提示词：{row.result.next_prompt}
                        </div>
                      ) : null}
                      {row.error ? <div className="mt-2 text-xs text-destructive">{row.error}</div> : null}
                    </section>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
