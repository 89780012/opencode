import { ClipboardCheck, Clock3, History, X } from "lucide-react"
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react"
import { useWorkbench } from "../hooks/use-workbench"
import { badge, lead, stepText, text, tone } from "../lib"
import { Handle } from "../layout/handle"
import ui from "../../shared/styles/ui.module.css"
import css from "../styles/review/review.module.css"

export function Review(props: {
  open: boolean
  width: number
  resizing: boolean
  onDown: (event: PointerEvent<HTMLDivElement>) => void
  onKey: (event: KeyboardEvent<HTMLDivElement>) => void
  onClose: () => void
  onOpen: () => void
}) {
  const app = useWorkbench(props.onOpen)

  return (
    <aside className={css.root}>
      {props.open ? (
        <>
          <Handle
            edge="right"
            onDown={props.onDown}
            onKey={props.onKey}
            active={props.resizing}
            min={280}
            max={500}
            width={props.width}
            label="Resize review panel"
          />
          <div className={css.panel} style={{ "--side": `${props.width}px` } as CSSProperties}>
            <div className={css.head}>
              <div className={css.title}>
                <div className={ui.sectiontitle}>
                  <ClipboardCheck size={16} />
                  <span>审查</span>
                </div>
                <span className={`${css.badge} ${css[`badge_${app.cur.reviewStatus}`]}`}>
                  {text(app.cur.reviewStatus)}
                </span>
              </div>
              <div className={css.actions}>
                <button
                  type="button"
                  className={css.action}
                  onClick={app.view}
                  aria-label={app.cur.reviewView === "current" ? "查看历史" : "查看当前"}
                >
                  {app.cur.reviewView === "current" ? <Clock3 size={14} /> : <History size={14} />}
                </button>
                <button type="button" className={css.action} onClick={props.onClose} aria-label="收起审查面板">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className={`${css.body} ${ui.scroll}`}>
              {app.cur.reviewView === "current" ? (
                <>
                  {app.cur.reviewProgress ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {app.cur.reviewRound} 轮 / {lead(app.cur.reviewStatus)} {text(app.cur.reviewStatus)}
                      </p>
                      {app.cur.reviewProgress.map((item) => {
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
                  ) : app.last ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {app.last.round} 轮 / {lead(app.last.status)} {text(app.last.status)}
                      </p>
                      {app.last.steps.map((item) => {
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
                      {app.last.suggestions.length ? (
                        <div className={css.advice}>
                          <p>{app.last.suggestions.join(", ")}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className={ui.empty}>尚未发起审查</div>
                  )}
                  {app.cur.reviewStatus !== "running" ? (
                    <button type="button" className={css.submit} onClick={() => void app.review()}>
                      <ClipboardCheck size={15} />
                      <span>提交审查</span>
                    </button>
                  ) : null}
                </>
              ) : (
                <div className={css.list}>
                  {app.cur.reviewHistory.length ? (
                    app.cur.reviewHistory
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

      {!props.open ? (
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
