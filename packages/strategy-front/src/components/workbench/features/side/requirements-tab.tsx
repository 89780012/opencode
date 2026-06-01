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
import { setStage } from "@/store/workbench-slice"
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

export function RequirementsTab(props: {
  cur: SessionItem
  risk: string
  hint: string
  onToggle: (key: string) => void
  onBacktest: (idx: number) => void
}) {
  const dispatch = useAppDispatch()

  return (
    <div className={css.stack}>
      <Compact
        open={props.cur.sections.requirements}
        icon={FileText}
        title="需求理解"
        onToggle={() => props.onToggle("requirements")}
      >
        <div className={css.reqbox}>
          {props.cur.analyzedRequirements.map((item, idx) => (
            <div key={item} className={css.reqrow}>
              <span>{idx + 1}.</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </Compact>

      <Compact
        open={props.cur.sections.logic}
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
          <p className={css.warn}>
            <CircleAlert size={14} />
            <span>{props.risk}</span>
          </p>
          <p className={css.logic}>{props.hint}</p>
          <p className={css.logic}>需求：{props.cur.currentRequirement}</p>
        </div>
      </Compact>

      <Compact
        open={props.cur.sections.progress}
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
        open={props.cur.sections.backtest}
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
                  收益: {item.results.totalReturn} · 夏普: {item.results.sharpe}
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
