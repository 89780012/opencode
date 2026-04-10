import { CheckCircle2, Clock3, LoaderCircle, PauseCircle, Square, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WorkflowNodeRun, WorkflowRuntimeDetail, WorkflowRun } from "@/types/workflow"
import type { WorkspaceState, WorkspaceStatus } from "@/types/workspace-chat"

function phaseText(value: WorkspaceStatus) {
  if (value === "running") return "执行中"
  if (value === "blocked") return "已阻塞"
  if (value === "done") return "已完成"
  if (value === "failed") return "已失败"
  if (value === "interrupted") return "已中断"
  return "空闲"
}

function stepText(value: WorkflowNodeRun["status"]) {
  if (value === "running") return "执行中"
  if (value === "blocked") return "已阻塞"
  if (value === "failed") return "失败"
  if (value === "done") return "已完成"
  if (value === "timeout") return "超时"
  if (value === "interrupted") return "已中断"
  return "待执行"
}

function tone(value: WorkspaceStatus) {
  if (value === "running") return "border-amber-200 bg-amber-50 text-amber-900"
  if (value === "blocked") return "border-red-200 bg-red-50 text-red-900"
  if (value === "done") return "border-emerald-200 bg-emerald-50 text-emerald-900"
  if (value === "failed") return "border-rose-200 bg-rose-50 text-rose-900"
  if (value === "interrupted") return "border-slate-300 bg-slate-100 text-slate-900"
  return "border-slate-200 bg-slate-50 text-slate-900"
}

function mark(value: WorkspaceStatus) {
  if (value === "running") return <LoaderCircle className="size-4 animate-spin" />
  if (value === "blocked") return <PauseCircle className="size-4" />
  if (value === "done") return <CheckCircle2 className="size-4" />
  if (value === "failed") return <XCircle className="size-4" />
  if (value === "interrupted") return <Square className="size-4" />
  return <Clock3 className="size-4" />
}

function name(flow: WorkflowRuntimeDetail | null, run: WorkflowRun | null) {
  if (flow?.name?.trim()) return flow.name.trim()
  if (run?.workflow_id?.trim()) return run.workflow_id.trim()
  return "工作流"
}

function title(flow: WorkflowRuntimeDetail | null, run: WorkflowRun | null) {
  const id = run?.current_node_id
  if (!id) return ""
  return flow?.nodes.find((item) => item.id === id)?.title || id
}

function body(value: WorkspaceStatus) {
  if (value === "running") return "当前消息已经进入固定工作流。新的自然语言消息会中断本轮执行，并在同一会话里开启新一轮工作流。"
  if (value === "blocked") return "当前工作流因为问题或权限请求暂停。先处理下方卡片，再继续执行。"
  if (value === "done") return "本轮工作流已经完成。你可以继续发新消息，系统会在同一会话里开启下一轮。"
  if (value === "failed") return "本轮工作流执行失败。你可以补充信息后重新发起新一轮。"
  if (value === "interrupted") return "上一轮工作流已被中断。继续发送消息会开启新的工作流执行。"
  return "当前策略已经绑定固定工作流。输入需求后，系统会先经过意图识别，再进入规划或执行。"
}

interface Props {
  state: WorkspaceState | null
  run: WorkflowRun | null
  flow: WorkflowRuntimeDetail | null
  rows: WorkflowNodeRun[]
  continuing: boolean
  interrupting: boolean
  disabled?: boolean
  onContinue: () => void
  onInterrupt: () => void
}

export function WorkflowRunCard(props: Props) {
  const step = props.state?.status || "idle"
  const list = [...props.rows].sort((a, b) => a.started_at - b.started_at)
  const cur = title(props.flow, props.run)

  return (
    <div className={cn("rounded-2xl border px-4 py-3 shadow-sm", tone(step))}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            {mark(step)}
            <span>{phaseText(step)}</span>
            <span className="rounded-full border border-current/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]">
              {name(props.flow, props.run)}
            </span>
          </div>
          <div className="mt-1 text-sm leading-6">{body(step)}</div>
          {cur ? <div className="mt-1 text-xs text-current/75">当前步骤：{cur}</div> : null}
          {props.run?.block_reason ? (
            <div className="mt-2 rounded-xl border border-current/10 bg-white/70 px-3 py-2 text-xs text-current/80">
              {props.run.block_reason}
            </div>
          ) : null}
        </div>
        {step === "running" ? (
          <Button size="sm" variant="outline" onClick={props.onInterrupt} disabled={props.interrupting || props.disabled}>
            <Square className="size-4" />
            {props.interrupting ? "中断中..." : "中断当前轮"}
          </Button>
        ) : null}
        {step === "blocked" ? (
          <Button size="sm" onClick={props.onContinue} disabled={props.continuing || props.disabled}>
            <LoaderCircle className={`size-4 ${props.continuing ? "animate-spin" : ""}`} />
            {props.continuing ? "继续中..." : "继续执行"}
          </Button>
        ) : null}
      </div>

      {list.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {list.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-current/10 bg-white/70 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <div className="font-medium">{props.flow?.nodes.find((node) => node.id === item.node_id)?.title || item.node_id}</div>
                <div className="mt-0.5 text-current/70">第 {i + 1} 步</div>
              </div>
              <div className="shrink-0 rounded-full border border-current/10 px-2 py-0.5 uppercase tracking-[0.14em]">
                {stepText(item.status)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
