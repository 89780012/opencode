import {
  ChartColumn,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  Workflow,
} from "lucide-react"
import { useAppDispatch } from "@/store"
import {
  setStage,
  type WorkbenchAnalysis,
  type WorkbenchFlowchart,
  type WorkbenchProgressEvent,
} from "@/store/workbench-slice"
import { type SessionItem } from "../../data"
import { Compact } from "../../layout/compact"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/side/side.module.css"

type Mark = {
  key: string
  label: string
  tone: "pending" | "running" | "done" | "error"
}

function FlowStateIcon(props: { tone: Mark["tone"] }) {
  if (props.tone === "done") return <CheckCircle2 size={13} />
  if (props.tone === "running") return <LoaderCircle size={13} className={ui.spin} />
  if (props.tone === "error") return <CircleAlert size={13} />
  return <Clock3 size={13} />
}

function FlowState(props: { analysis: WorkbenchAnalysis | null; flowchart: WorkbenchFlowchart | null }) {
  const marks: Mark[] = [
    {
      key: "analysis",
      label: props.analysis?.state === "done" ? "分析完成" : props.analysis?.state === "running" ? "分析中" : "等待分析",
      tone: props.analysis?.state === "done" ? "done" : props.analysis?.state === "running" ? "running" : "pending",
    },
    {
      key: "flowchart",
      label:
        props.flowchart?.state === "done"
          ? "流程图完成"
          : props.flowchart?.state === "generating"
            ? "正在生成流程图"
            : props.flowchart?.state === "error"
              ? "流程图异常"
              : "等待流程图",
      tone:
        props.flowchart?.state === "done"
          ? "done"
          : props.flowchart?.state === "generating"
            ? "running"
            : props.flowchart?.state === "error"
              ? "error"
              : "pending",
    },
  ]

  return (
    <div className={css.flowstate}>
      {marks.map((item) => (
        <div key={item.key} className={`${css.flowmark} ${css[`flowmark_${item.tone}`]}`}>
          <FlowStateIcon tone={item.tone} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function Logic(props: { analysis: WorkbenchAnalysis | null }) {
  if (!props.analysis) {
    return (
      <>
        <p className={css.warn}>
          <CircleAlert size={14} />
          <span>暂无分析</span>
        </p>
        <p className={css.logic}>工作区策略分析尚未开始。</p>
      </>
    )
  }
  if (props.analysis.state === "running") {
    return (
      <>
        <p className={css.warn}>
          <LoaderCircle size={14} className={ui.spin} />
          <span>正在分析</span>
        </p>
        <p className={css.logic}>workspace-analyzer 正在梳理当前工作区的策略运行逻辑。</p>
      </>
    )
  }
  if (props.analysis.items.length === 0) {
    return (
      <>
        <p className={css.warn}>
          <CircleAlert size={14} />
          <span>暂无条目</span>
        </p>
        <p className={css.logic}>分析已完成，但没有返回可展示的策略逻辑条目。</p>
      </>
    )
  }
  return props.analysis.items.map((item, idx) => (
    <div key={`${idx}-${item}`} className={css.reqrow}>
      <span>{idx + 1}.</span>
      <p>{item}</p>
    </div>
  ))
}

function Tick(props: { item: WorkbenchProgressEvent }) {
  if (props.item.state === "error") return <CircleAlert size={14} color="#ef4444" />
  if (props.item.state === "running") return <LoaderCircle size={14} className={ui.spin} color="#2563eb" />
  return <CheckCircle2 size={14} color="#16a34a" />
}

function stamp(value: number) {
  if (!value) return ""
  return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function RequirementsTab(props: {
  cur: SessionItem
  analysis: WorkbenchAnalysis | null
  flowchart: WorkbenchFlowchart | null
  progress: WorkbenchProgressEvent[]
  open: Record<string, boolean>
  risk: string
  hint: string
  onToggle: (key: string) => void
  onBacktest: (idx: number) => void
}) {
  const dispatch = useAppDispatch()

  return (
    <div className={css.stack}>
      <Compact open={props.open.requirements} icon={FileText} title="需求理解" onToggle={() => props.onToggle("requirements")}>
        <div className={css.reqbox}>
          {props.cur.analyzedRequirements.length ? (
            props.cur.analyzedRequirements.map((item, idx) => (
              <div key={item} className={css.reqrow}>
                <span>{idx + 1}.</span>
                <p>{item}</p>
              </div>
            ))
          ) : (
            <div className={ui.empty}>暂无需求理解</div>
          )}
        </div>
      </Compact>

      <Compact
        open={props.open.logic}
        icon={Workflow}
        title="策略逻辑蓝图"
        onToggle={() => props.onToggle("logic")}
        action={
          <button type="button" className={css.tag} onClick={() => dispatch(setStage("flowchart"))}>
            <Workflow size={12} />
            <span>流程图</span>
          </button>
        }
      >
        <div className={css.logicbox}>
          <FlowState analysis={props.analysis} flowchart={props.flowchart} />
          <Logic analysis={props.analysis} />
        </div>
      </Compact>

      <Compact
        open={props.open.progress}
        icon={Clock3}
        title="进度追踪"
        onToggle={() => props.onToggle("progress")}
        action={
          <button type="button" className={css.tag} onClick={() => dispatch(setStage("timeline"))}>
            <Clock3 size={12} />
            <span>时间线</span>
          </button>
        }
      >
        <div className={css.stepbox}>
          {props.progress.length ? (
            props.progress.map((item) => (
              <div key={item.id} className={css.step}>
                <div className={css.progress}>
                  <span className={css.stepicon}>
                    <Tick item={item} />
                  </span>
                  <strong>{item.title || item.kind}</strong>
                  <time dateTime={item.createdAt ? new Date(item.createdAt).toISOString() : undefined}>
                    {stamp(item.createdAt)}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <div className={ui.empty}>暂无进度记录</div>
          )}
        </div>
      </Compact>

      <Compact open={props.open.backtest} icon={ChartColumn} title="回测记录" onToggle={() => props.onToggle("backtest")}>
        <div className={`${css.logbox} ${ui.scroll}`}>
          {props.cur.backtestHistory.length ? (
            props.cur.backtestHistory.map((item, idx) => (
              <button key={`${item.time}-${idx}`} type="button" className={css.log} onClick={() => props.onBacktest(idx)}>
                <div className={css.rowtop}>
                  <span className={css.logtitle}>回测 #{props.cur.backtestHistory.length - idx}</span>
                  <span>{item.time}</span>
                </div>
                <p className={css.logic}>
                  收益: {item.results.totalReturn} / 夏普: {item.results.sharpe}
                </p>
              </button>
            ))
          ) : (
            <div className={ui.empty}>暂无回测记录</div>
          )}
        </div>
      </Compact>
    </div>
  )
}
