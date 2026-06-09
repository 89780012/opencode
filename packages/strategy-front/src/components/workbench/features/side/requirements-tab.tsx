import {
  ChartColumn,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ClipboardCheck,
  Code2,
  FileCheck,
  FileText,
  LoaderCircle,
  Workflow,
} from "lucide-react"
import { useAppDispatch } from "@/store"
import { setStage, type WorkbenchAnalysis, type WorkbenchFlowchart } from "@/store/workbench-slice"
import { type SessionItem } from "../../data"
import { Compact } from "../../layout/compact"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/side/side.module.css"

const steps = [
  { key: "requirement", label: "需求确认", icon: FileCheck },
  { key: "code", label: "代码编写", icon: Code2 },
  { key: "review", label: "代码审查", icon: ClipboardCheck },
  { key: "flowchart", label: "流程图生成", icon: Workflow },
  { key: "backtest", label: "回测验证", icon: ChartColumn },
] as const

function state(cur: SessionItem, key: (typeof steps)[number]["key"]) {
  if (key === "requirement") return "done"
  if (key === "code") return "done"
  if (key === "review") {
    if (cur.reviewStatus === "running") return "running"
    if (cur.reviewStatus === "passed" || cur.reviewStatus === "failed") return "done"
    return "pending"
  }
  if (key === "flowchart") {
    if (cur.flowchartStatus === "generating") return "running"
    if (cur.flowchartStatus === "done") return "done"
    return "pending"
  }
  if (cur.backtestStatus === "running") return "running"
  if (cur.backtestStatus === "done") return "done"
  return "pending"
}

function Progress(props: { cur: SessionItem }) {
  return (
    <div className={css.stepbox}>
      {steps.map((item) => {
        const Icon = item.icon
        const tone = state(props.cur, item.key)
        return (
          <div key={item.key} className={`${css.step} ${css[`step_${tone}`]}`}>
            <div className={css.progress}>
              <span className={`${css.stepicon} ${css[`stepicon_${tone}`]}`}>
                {tone === "done" ? (
                  <CheckCircle2 size={14} />
                ) : tone === "running" ? (
                  <LoaderCircle size={14} className={ui.spin} />
                ) : (
                  <Icon size={14} />
                )}
              </span>
              <strong>{item.label}</strong>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
          <span>暂未分析</span>
        </p>
        <p className={css.logic}>工作区策略逻辑分析尚未开始。</p>
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

export function RequirementsTab(props: {
  cur: SessionItem
  analysis: WorkbenchAnalysis | null
  flowchart: WorkbenchFlowchart | null
  open: Record<string, boolean>
  risk: string
  hint: string
  onToggle: (key: string) => void
  onBacktest: (idx: number) => void
}) {
  const dispatch = useAppDispatch()

  return (
    <div className={css.stack}>
      <Compact
        open={props.open.requirements}
        icon={FileText}
        title="需求理解"
        onToggle={() => props.onToggle("requirements")}
      >
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
        <Progress cur={props.cur} />
      </Compact>

      <Compact
        open={props.open.backtest}
        icon={ChartColumn}
        title="回测记录"
        onToggle={() => props.onToggle("backtest")}
      >
        <div className={`${css.logbox} ${ui.scroll}`}>
          {props.cur.backtestHistory.length ? (
            props.cur.backtestHistory.map((item, idx) => (
              <button
                key={`${item.time}-${idx}`}
                type="button"
                className={css.log}
                onClick={() => props.onBacktest(idx)}
              >
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
