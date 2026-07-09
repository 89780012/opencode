import { ChartColumn, LoaderCircle, Play } from "lucide-react"
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
  if (value === "pending") return "启动中"
  if (value === "running") return "运行中"
  if (value === "done") return "已完成"
  if (value === "failed") return "失败"
  return "未开始"
}

function Result(props: { result: BacktestRun | null }) {
  if (!props.result) return <div className={ui.empty}>暂无回测结果</div>

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
      <div className={css.detail}>
        <div>
          <span>状态</span>
          <strong>{status(props.result.status)}</strong>
        </div>
        <div>
          <span>插件</span>
          <strong>{props.result.pluginId || "--"}</strong>
        </div>
        <div>
          <span>回测 ID</span>
          <strong>{props.result.btId || "--"}</strong>
        </div>
        <div>
          <span>进度</span>
          <strong>{props.result.progress ? `${props.result.progress}%` : "--"}</strong>
        </div>
        <div>
          <span>初始资金</span>
          <strong>{props.result.config.cash}</strong>
        </div>
        <div>
          <span>K线周期</span>
          <strong>{props.result.config.interval === "1m" ? "分钟线" : "日线"}</strong>
        </div>
        <div className={css.wide}>
          <span>日志路径</span>
          <strong>{props.result.logPath || "--"}</strong>
        </div>
      </div>
    </>
  )
}

export function Backtest(props: { cur: SessionItem; onRun: () => void }) {
  return (
    <section className={css.root}>
      <div className={css.head}>
        <strong className={ui.sectiontitle}>
          <ChartColumn size={16} />
          <span>回测报告</span>
        </strong>
        <button type="button" className={ui.blockbtn} onClick={props.onRun}>
          {props.cur.backtestStatus === "running" ? <LoaderCircle size={14} className={ui.spin} /> : <Play size={14} />}
          <span>{props.cur.backtestStatus === "running" ? "运行中..." : "重新运行"}</span>
        </button>
      </div>
      <Result result={props.cur.backtestResults} />
    </section>
  )
}
