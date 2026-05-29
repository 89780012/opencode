import { ChartColumn, LoaderCircle, Play } from "lucide-react"
import type { BacktestResult, SessionItem } from "../../data"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/stage/stage.module.css"

function Result(props: { result: BacktestResult | null }) {
  if (!props.result) return <div className={ui.empty}>暂无回测结果</div>

  return (
    <div className={css.metrics}>
      <div className={css.metric}>
        <span>累计收益</span>
        <strong>{props.result.totalReturn}</strong>
      </div>
      <div className={css.metric}>
        <span>夏普</span>
        <strong>{props.result.sharpe}</strong>
      </div>
      <div className={css.metric}>
        <span>最大回撤</span>
        <strong>{props.result.maxDrawdown}</strong>
      </div>
      <div className={css.metric}>
        <span>胜率</span>
        <strong>{props.result.winRate}</strong>
      </div>
    </div>
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
