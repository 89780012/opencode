import { ChartColumn, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode } from "react"
import { selectWorkbench, useAppDispatch, useAppSelector } from "@/store"
import { setBacktestActive, setStage } from "@/store/workbench-slice"
import type { BacktestToolResult } from "@/types/backtest"
import common from "../../styles/session/session-common.module.css"
import css from "../../styles/session/session-chat.module.css"

type Result = Extract<BacktestToolResult, { accepted: true }>

function label(status: Result["run"]["status"]) {
  if (status === "pending") return "等待运行"
  if (status === "running") return "回测运行中"
  if (status === "done") return "回测已完成"
  return "回测失败"
}

function Icon(props: { status: Result["run"]["status"] }) {
  if (props.status === "pending" || props.status === "running") {
    return <LoaderCircle size={16} className={common.spin} />
  }
  if (props.status === "failed") return <CircleAlert size={16} />
  return <CheckCircle2 size={16} />
}

export function SessionBacktestTool(props: { data: Result; fallback: ReactNode }) {
  const dispatch = useAppDispatch()
  const state = useAppSelector(selectWorkbench)
  const data = props.data.run
  const scope =
    state.sessionPath === data.workspacePath &&
    state.active === data.sessionId &&
    state.backtestPath === data.workspacePath &&
    state.backtestSession === data.sessionId
  const run = scope ? state.backtests.find((item) => item.id === data.id) : undefined

  if (!run) return props.fallback
  const progress = Math.round(Math.min(100, Math.max(0, run.progress)))
  const active = run.status === "pending" || run.status === "running"

  return (
    <section className={`${css.backtestTool} ${css[`backtest_${run.status}`]}`} aria-live="polite">
      <div className={css.backtestHead}>
        <span className={css.backtestIcon}>
          <Icon status={run.status} />
        </span>
        <span className={css.backtestCopy}>
          <strong>{label(run.status)}</strong>
          <span title={run.id}>{run.id}</span>
        </span>
        <span className={css.backtestProgress}>{progress}%</span>
      </div>
      {active ? (
        <div
          className={css.backtestBar}
          role="progressbar"
          aria-label="回测进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      {run.status === "failed" && run.error ? <p className={css.backtestError}>{run.error}</p> : null}
      <button
        type="button"
        className={css.backtestAction}
        onClick={() => {
          dispatch(setBacktestActive(run.id))
          dispatch(setStage("backtest"))
        }}
      >
        <ChartColumn size={14} />
        <span>查看回测</span>
      </button>
    </section>
  )
}
