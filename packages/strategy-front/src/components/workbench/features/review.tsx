import { ChevronDown, ClipboardCheck, Clock3, History, X } from "lucide-react"
import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import type { Step } from "../data"
import { useWorkbench } from "../hooks/use-workbench"
import { badge, lead, stepText, text, tone } from "../lib"
import { Handle } from "../layout/handle"
import ui from "../../shared/styles/ui.module.css"
import css from "../styles/review/review.module.css"

function Row(props: { item: Step }) {
  const [open, setOpen] = useState(false)
  const more = !!props.item.detail || !!props.item.suggestion

  return (
    <div className={css.step}>
      <button
        type="button"
        className={css.stephead}
        onClick={() => more && setOpen((item) => !item)}
        aria-expanded={open}
        disabled={!more}
      >
        <span className={css.stepmain}>
          {badge(props.item.status, {
            size: 15,
            className: `${css.stepicon} ${css[`stepicon_${tone(props.item.status)}`]} ${props.item.status === "running" ? css.spin : ""}`,
          })}
          <strong>{props.item.text}</strong>
        </span>
        <span className={css.stepright}>
          <em>{stepText(props.item.status)}</em>
          {more ? <ChevronDown size={14} className={`${css.chevron} ${open ? css.chevron_open : ""}`} /> : null}
        </span>
      </button>
      {open && more ? (
        <div className={css.stepcopy}>
          {props.item.detail ? <p>{props.item.detail}</p> : null}
          {props.item.suggestion ? <p className={css.fix}>{props.item.suggestion}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function Advice(props: { tips: string[] }) {
  if (!props.tips.length) return null
  return (
    <ol className={css.advice}>
      {props.tips.map((tip, idx) => (
        <li key={`${idx}-${tip}`}>{tip}</li>
      ))}
    </ol>
  )
}

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
  const [pick, setPick] = useState("")
  const hist = app.cur.reviewHistory.find((item) => item.id === pick) ?? null
  const view = () => {
    if (pick) {
      setPick("")
      app.view("history")
      return
    }
    app.view(app.cur.reviewView === "current" ? "history" : "current")
  }
  const icon = app.cur.reviewView === "current" || pick ? <Clock3 size={14} /> : <History size={14} />
  const label = app.cur.reviewView === "current" || pick ? "查看历史" : "查看当前"

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
                  onClick={view}
                  aria-label={label}
                >
                  {icon}
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
                      {app.cur.reviewProgress.map((item) => (
                        <Row key={item.text} item={item} />
                      ))}
                    </div>
                  ) : app.last ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {app.last.round} 轮 / {lead(app.last.status)} {text(app.last.status)}
                      </p>
                      {app.last.steps.map((item) => (
                        <Row key={item.text} item={item} />
                      ))}
                      <Advice tips={app.last.suggestions} />
                    </div>
                  ) : (
                    <div className={ui.empty}>尚未发起审查</div>
                  )}
                  {app.cur.reviewStatus !== "running" ? (
                    <button type="button" className={css.submit} onClick={() => void app.review()} disabled={app.reviewing}>
                      <ClipboardCheck size={15} />
                      <span>提交审查</span>
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  {hist ? (
                    <div className={css.box}>
                      <p className={css.status}>
                        第 {hist.round} 轮 / {lead(hist.status)} {text(hist.status)}
                      </p>
                      {hist.steps.map((item) => (
                        <Row key={item.text} item={item} />
                      ))}
                      <Advice tips={hist.suggestions} />
                    </div>
                  ) : app.cur.reviewHistory.length ? (
                    <div className={css.list}>
                      {app.cur.reviewHistory
                        .slice()
                        .reverse()
                        .map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={css.item}
                            onClick={() => setPick(item.id)}
                          >
                            <div className={css.top}>
                              <span>第 {item.round} 轮</span>
                              <span>{item.time}</span>
                            </div>
                            <p>
                              {lead(item.status)} {text(item.status)}
                            </p>
                          </button>
                        ))}
                    </div>
                  ) : (
                    <div className={ui.empty}>暂无历史记录</div>
                  )}
                </>
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
