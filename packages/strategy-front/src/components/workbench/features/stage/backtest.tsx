import { ChartColumn, CircleAlert, Clock3, LoaderCircle, Play } from "lucide-react"
import { useEffect, useState } from "react"
import { action } from "@/lib/backtest"
import type { BacktestRun } from "@/types/backtest"
import type { SessionItem } from "../../data"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/stage/stage.module.css"

function text(data: Record<string, unknown>, key: string) {
  const value = data[key]
  if (typeof value === "string") return value
  if (typeof value === "number") return `${value}`
  return "--"
}

function status(value?: string) {
  if (value === "pending") return "正在启动"
  if (value === "running") return "运行中"
  if (value === "done") return "已完成"
  if (value === "failed") return "失败"
  return "未开始"
}

function stamp(value: number) {
  if (!value) return "--"
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function elapsed(start: number, end: number) {
  if (!start) return "--"
  const seconds = Math.max(0, Math.floor((end - start) / 1000))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours) return `${hours}小时 ${minutes}分 ${rest}秒`
  if (minutes) return `${minutes}分 ${rest}秒`
  return `${rest}秒`
}

function Progress(props: { run: BacktestRun; now: number; compact?: boolean }) {
  const progress = Math.round(Math.min(100, Math.max(0, props.run.progress)))
  return (
    <section className={`${css.runstate} ${props.compact ? css.runstate_compact : ""}`}>
      <div className={css.runhead}>
        <span className={css.runicon}>
          <LoaderCircle size={15} className={ui.spin} />
        </span>
        <div>
          <strong>{props.compact ? "当前回测" : status(props.run.status)}</strong>
          <span>{props.run.status === "pending" ? "后端正在提交 SmartX 任务" : "后端正在查询 SmartX 进度"}</span>
        </div>
        <em>{progress}%</em>
      </div>
      <div
        className={css.runbar}
        role="progressbar"
        aria-label="回测进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${status(props.run.status)} ${progress}%`}
      >
        <span className={props.run.status === "pending" ? css.runbar_pending : ""} style={{ width: `${progress}%` }} />
      </div>
      <div className={css.runmeta}>
        <span>
          <Clock3 size={12} />
          <span>已运行 {elapsed(props.run.startedAt, props.run.finishedAt || props.now || props.run.updatedAt)}</span>
        </span>
        <span>更新于 {stamp(props.run.updatedAt)}</span>
      </div>
    </section>
  )
}

function Detail(props: { run: BacktestRun }) {
  return (
    <div className={css.detail}>
      <div>
        <span>状态</span>
        <strong>{status(props.run.status)}</strong>
      </div>
      <div>
        <span>插件</span>
        <strong>{props.run.pluginId || "--"}</strong>
      </div>
      <div>
        <span>回测 ID</span>
        <strong>{props.run.btId || "--"}</strong>
      </div>
      <div>
        <span>进度</span>
        <strong>{Math.round(props.run.progress)}%</strong>
      </div>
      <div>
        <span>初始资金</span>
        <strong>{props.run.config.cash}</strong>
      </div>
      <div>
        <span>行情模式</span>
        <strong>
          {props.run.config.isTickMode ? "快照行情" : props.run.config.interval === "1m" ? "分钟线" : "日线"}
        </strong>
      </div>
      <div>
        <span>现价成交</span>
        <strong>{props.run.config.isTickMode ? (props.run.config.useNewPrice ? "是" : "否") : "--"}</strong>
      </div>
      <div className={css.wide}>
        <span>日志路径</span>
        <strong>{props.run.logPath || "--"}</strong>
      </div>
    </div>
  )
}

function Result(props: { result: BacktestRun | null; now: number }) {
  if (!props.result) {
    return (
      <div className={css.reportempty}>
        <span>
          <ChartColumn size={20} />
        </span>
        <strong>尚未运行回测</strong>
      </div>
    )
  }
  if (props.result.status === "pending" || props.result.status === "running") {
    return <Progress run={props.result} now={props.now} />
  }
  if (props.result.status === "failed") {
    return (
      <>
        <section className={css.runerror}>
          <CircleAlert size={18} />
          <div>
            <strong>回测失败</strong>
            <p>{props.result.error || "回测任务未能完成，请稍后重新运行。"}</p>
          </div>
        </section>
        <Detail run={props.result} />
      </>
    )
  }
  return (
    <>
      <div className={css.metrics}>
        <div className={css.metric}>
          <span>累计收益</span>
          <strong>{text(props.result.summary, "total_return")}</strong>
        </div>
        <div className={css.metric}>
          <span>夏普</span>
          <strong>{text(props.result.summary, "sharpe_ratio")}</strong>
        </div>
        <div className={css.metric}>
          <span>最大回撤</span>
          <strong>{text(props.result.summary, "max_falldown")}</strong>
        </div>
        <div className={css.metric}>
          <span>胜率</span>
          <strong>{text(props.result.summary, "win_rate")}</strong>
        </div>
      </div>
      <Detail run={props.result} />
    </>
  )
}

export function Backtest(props: { cur: SessionItem; busy: boolean; onRun: () => void }) {
  const [now, setNow] = useState(0)
  const run = props.cur.backtestRun

  useEffect(() => {
    if (!run) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [run])

  return (
    <section className={css.root}>
      <div className={css.head}>
        <strong className={ui.sectiontitle}>
          <ChartColumn size={16} />
          <span>回测报告</span>
        </strong>
        <button
          type="button"
          className={`${ui.blockbtn} ${css.actionbtn}`}
          disabled={!!run || props.busy}
          onClick={props.onRun}
        >
          {run || props.busy ? <LoaderCircle size={14} className={ui.spin} /> : <Play size={14} />}
          <span>{action(run, props.cur.backtestResults, props.busy)}</span>
        </button>
      </div>
      <div className={`${css.report} ${ui.scroll}`}>
        {run ? <Progress run={run} now={now} compact={run.id !== props.cur.backtestResults?.id} /> : null}
        {!run || (props.cur.backtestResults && run.id !== props.cur.backtestResults.id) ? (
          <Result result={props.cur.backtestResults} now={now} />
        ) : null}
      </div>
    </section>
  )
}
