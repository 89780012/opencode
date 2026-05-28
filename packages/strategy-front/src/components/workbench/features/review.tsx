import { ClipboardCheck, Clock3, History, X } from "lucide-react"
import type { KeyboardEvent, PointerEvent } from "react"
import type { SessionItem } from "../data"
import { badge, lead, stepText, text, tone } from "../lib"
import ui from "../shared.module.css"
import { Handle } from "../layout/handle"
import css from "./review.module.css"

export function Review(props: {
  cur: SessionItem
  last: SessionItem["reviewHistory"][number] | null
  right: boolean
  side: number
  size: boolean
  onDown: (event: PointerEvent<HTMLDivElement>) => void
  onKey: (event: KeyboardEvent<HTMLDivElement>) => void
  onView: () => void
  onClose: () => void
  onOpen: () => void
  onRun: () => void
}) {
  return (
    <aside className={css.root}>
      {props.right ? (
        <>
          <Handle
            edge="right"
            onDown={props.onDown}
            onKey={props.onKey}
            active={props.size}
            min={280}
            max={500}
            now={props.side}
            label="Resize review panel"
          />
          <div className={css.panel}>
            <div className={css.head}>
              <div className={css.title}>
                <div className={ui.sectiontitle}>
                  <ClipboardCheck size={16} />
                  <span>审查</span>
                </div>
                <span className={`${css.badge} ${css[`badge_${props.cur.reviewStatus}`]}`}>
                  {text(props.cur.reviewStatus)}
                </span>
              </div>
              <div className={css.actions}>
                <button
                  type="button"
                  className={css.action}
                  onClick={props.onView}
                  aria-label={props.cur.reviewView === "current" ? "查看历史" : "查看当前"}
                >
                  {props.cur.reviewView === "current" ? <Clock3 size={14} /> : <History size={14} />}
                </button>
                <button type="button" className={css.action} onClick={props.onClose} aria-label="收起审查面板">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={`${css.body} ${ui.scroll}`}>
              {props.cur.reviewView === "current" ? (
                <>
                  {props.cur.reviewProgress ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {props.cur.reviewRound} 轮 / {lead(props.cur.reviewStatus)} {text(props.cur.reviewStatus)}
                      </p>
                      {props.cur.reviewProgress.map((item) => {
                        const Icon = badge(item.status)
                        return (
                          <div key={item.text} className={css.step}>
                            <div className={css.stepmain}>
                              <Icon size={15} className={`${css.stepicon} ${css[`stepicon_${tone(item.status)}`]}`} />
                              <strong>{item.text}</strong>
                            </div>
                            <em>{stepText(item.status)}</em>
                          </div>
                        )
                      })}
                    </div>
                  ) : props.last ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {props.last.round} 轮 / {lead(props.last.status)} {text(props.last.status)}
                      </p>
                      {props.last.steps.map((item) => {
                        const Icon = badge(item.status)
                        return (
                          <div key={item.text} className={css.step}>
                            <div className={css.stepmain}>
                              <Icon size={15} className={`${css.stepicon} ${css[`stepicon_${tone(item.status)}`]}`} />
                              <strong>{item.text}</strong>
                            </div>
                            <em>{stepText(item.status)}</em>
                          </div>
                        )
                      })}
                      {props.last.suggestions.length ? (
                        <div className={css.advice}>
                          <p>{props.last.suggestions.join(", ")}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={ui.empty}>尚未发起审查</div>
                  )}
                  {props.cur.reviewStatus !== "running" ? (
                    <button type="button" className={css.submit} onClick={props.onRun}>
                      <ClipboardCheck size={15} />
                      <span>提交审查</span>
                    </button>
                  ) : null}
                </>
              ) : (
                <div className={css.list}>
                  {props.cur.reviewHistory.length ? (
                    props.cur.reviewHistory
                      .slice()
                      .reverse()
                      .map((item) => (
                        <div key={`${item.round}-${item.time}`} className={css.item}>
                          <div className={css.top}>
                            <span>第 {item.round} 轮</span>
                            <span>{item.time}</span>
                          </div>
                          <p>
                            {lead(item.status)} {item.status === "passed" ? "已通过" : "未通过"}
                          </p>
                        </div>
                      ))
                  ) : (
                    <div className={ui.empty}>暂无历史记录</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}

      {!props.right ? (
        <div className={css.rail}>
          <button type="button" className={css.minibtn} onClick={props.onOpen} aria-label="展开审查面板">
            <ClipboardCheck size={16} />
            <span style={{ fontSize: 10 }}>审查</span>
          </button>
        </div>
      ) : null}
    </aside>
  )
}
