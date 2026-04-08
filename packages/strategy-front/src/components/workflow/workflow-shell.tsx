import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { permissionApi, questionApi, workflowApi } from "@/api/modules"
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
  WorkflowSummary,
} from "@/types/workflow"
import type { ChatQuestionAnswer, ChatQuestionRequest, PermissionRequest } from "@/types/chat"

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
  const [text, setText] = useState("")
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [rows, setRows] = useState<WorkflowNodeRun[]>([])
  const [summary, setSummary] = useState<WorkflowSummary | null>(null)
  const [permission, setPermission] = useState<PermissionRequest | null>(null)
  const [question, setQuestion] = useState<ChatQuestionRequest | null>(null)
  const [sending, setSending] = useState(false)
  const [item, setItem] = useState(props.item)
  const [flow, setFlow] = useState<WorkflowDetail>(() => runtimeDetail(props.item))

  useEffect(() => {
    setItem(props.item)
    setFlow(runtimeDetail(props.item))
  }, [props.item])

  const blocked = run?.status === "blocked"
  const current = useMemo(() => rows.find((row) => row.node_id === run?.current_node_id) ?? null, [rows, run])

  const sync = useCallback(
    async (runID?: string) => {
      const [stats, data] = await Promise.all([workflowApi.summary(item.id), workflowApi.runs(item.id)])
      const runs = sortRuns(data.items)
      setSummary(stats)
      setRuns(runs)

      const id = runID || runs[0]?.id
      if (!id) {
        setRun(null)
        setRows([])
        return
      }

      const [run, rows] = await Promise.all([workflowApi.run(id), workflowApi.nodeRuns(id)])
      setRun(run)
      setRows(sortRows(rows.items))
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

  useEffect(() => {
    if (!run?.block_request_id || run.status !== "blocked") {
      setPermission(null)
      setQuestion(null)
      return
    }

    const load = async () => {
      if (run.block_reason === "permission") {
        const data = await permissionApi.list().catch(() => [])
        setPermission(data.find((item) => item.id === run.block_request_id) ?? null)
        setQuestion(null)
        return
      }
      if (run.block_reason === "question") {
        const data = await questionApi.list().catch(() => [])
        setQuestion(data.find((item) => item.id === run.block_request_id) ?? null)
        setPermission(null)
        return
      }
      setPermission(null)
      setQuestion(null)
    }

    void load()
  }, [run?.block_reason, run?.block_request_id, run?.status])

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
      toast.success("Workflow saved")
      await props.onRefresh?.()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save workflow")
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
      await sync(out.run.id)
      toast.success("Workflow started")
    } catch (err) {
      console.error(err)
      toast.error("Failed to start workflow")
    } finally {
      setBusy(false)
    }
  }

  const onContinue = async () => {
    if (!run) return
    setBusy(true)
    try {
      await workflowApi.continue(run.id)
      await sync(run.id)
      toast.success("Workflow resumed")
    } catch (err) {
      console.error(err)
      toast.error("Failed to resume workflow")
    } finally {
      setBusy(false)
    }
  }

  const resume = useCallback(
    async (runID: string) => {
      await workflowApi.continue(runID).catch(() => null)
      await sync(runID)
    },
    [sync],
  )

  const onPermission = async (reply: "once" | "always" | "reject") => {
    if (!permission || !run) return
    setSending(true)
    try {
      await permissionApi.respond(permission.id, { reply })
      setPermission(null)
      await resume(run.id)
      toast.success("Permission request handled")
    } catch (err) {
      console.error(err)
      toast.error("Failed to handle permission request")
    } finally {
      setSending(false)
    }
  }

  const onQuestion = async (answers: ChatQuestionAnswer[]) => {
    if (!question || !run) return
    setSending(true)
    try {
      await questionApi.reply(question.id, answers)
      setQuestion(null)
      await resume(run.id)
      toast.success("Question answered")
    } catch (err) {
      console.error(err)
      toast.error("Failed to submit answer")
    } finally {
      setSending(false)
    }
  }

  const onRejectQuestion = async () => {
    if (!question || !run) return
    setSending(true)
    try {
      await questionApi.reject(question.id)
      setQuestion(null)
      await resume(run.id)
      toast.success("Question rejected")
    } catch (err) {
      console.error(err)
      toast.error("Failed to reject question")
    } finally {
      setSending(false)
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
      toast.success("Workflow refreshed")
    } catch (err) {
      console.error(err)
      toast.error("Failed to refresh workflow")
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
              {open ? "Hide library" : "Show library"}
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

          <WorkflowSidepanel
            text={text}
            run={run}
            runs={runs}
            summary={summary}
            rows={rows}
            current={current}
            nodes={item.nodes}
            permission={permission}
            question={question}
            sending={sending}
            onPickRun={(id) => void sync(id)}
            onPermission={onPermission}
            onQuestion={onQuestion}
            onRejectQuestion={onRejectQuestion}
            onText={setText}
          />
        </div>
      </div>
    </div>
  )
}
