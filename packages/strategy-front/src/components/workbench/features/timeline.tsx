import { Check, Clock3, GitCompareArrows, Minus, Plus, RotateCcw, Sparkles, X } from "lucide-react"
import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from "react"
import type { SessionItem, TimelineEvent } from "../data"
import { kind } from "../lib"
import ui from "../shared.module.css"
import css from "./timeline.module.css"

export function Timeline(props: {
  cur: SessionItem
  picked: string[]
  picks: TimelineEvent[]
  analysis: string
  note: string
  zoom: number
  pan: { x: number; y: number }
  drag: { on: boolean; x: number; y: number; ox: number; oy: number }
  tip: null | { item: TimelineEvent; x: number; y: number }
  pane: { w: number; h: number; axis: number; top: number; marks: number[] }
  boxRef: RefObject<HTMLDivElement | null>
  onNote: (text: string) => void
  onPick: (id: string) => void
  onSubmit: () => void
  onReset: () => void
  onZoom: (zoom: number) => void
  onPan: (pan: { x: number; y: number }) => void
  onHover: (item: TimelineEvent, x: number, y: number) => void
  onFocus: (item: TimelineEvent, node: HTMLElement) => void
  onHide: () => void
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  onGrab: (event: PointerEvent<HTMLDivElement>) => void
  onKey: (event: KeyboardEvent<HTMLElement>, item: TimelineEvent) => void
}) {
  return (
    <section className={css.root}>
      <div className={css.bar}>
        <div className={css.copy}>
          <strong className={ui.sectiontitle}>
            <Clock3 size={16} />
            <span>策略时间线</span>
          </strong>
          <span className={css.badge}>滚轮缩放 · 自由拖拽</span>
        </div>
        <div className={css.zoom}>
          <button type="button" aria-label="缩小时间线" onClick={() => props.onZoom(Math.max(20, props.zoom - 10))}>
            <Minus size={14} />
          </button>
          <span>{props.zoom}%</span>
          <button type="button" aria-label="放大时间线" onClick={() => props.onZoom(Math.min(250, props.zoom + 10))}>
            <Plus size={14} />
          </button>
          <button
            type="button"
            className={css.reset}
            onClick={() => {
              props.onZoom(100)
              props.onPan({ x: 0, y: 0 })
            }}
          >
            <RotateCcw size={13} />
            <span>重置</span>
          </button>
        </div>
      </div>

      <div className={css.body}>
        <div
          ref={props.boxRef}
          className={`${css.canvas} ${props.drag.on ? css.canvasdrag : ""}`}
          onPointerDown={props.onGrab}
          onWheel={props.onWheel}
        >
          <div className={css.move} style={{ transform: `translate(${props.pan.x}px, ${props.pan.y}px)` }}>
            <div
              className={css.zoomwrap}
              style={{
                transform: `scale(${props.zoom / 100})`,
                width: `${props.pane.w}px`,
                height: `${props.pane.h}px`,
              }}
            >
              <div
                className={css.axis}
                style={{
                  left: `${props.pane.axis}px`,
                  top: `${props.pane.top}px`,
                  height: `${Math.max(props.pane.h - props.pane.top * 2, 120)}px`,
                }}
              ></div>
              {props.pane.marks.map((item, idx) => (
                <span
                  key={`tick-${idx}`}
                  className={css.tick}
                  style={{ top: `${item}px`, left: `${props.pane.axis - 10}px` }}
                ></span>
              ))}
              {props.cur.timelineEvents.map((item, idx) => {
                const top = props.pane.marks[idx] - 12
                const right = idx % 2 === 0
                const on = props.picked.includes(item.id)
                const git = item.type === "git"
                return (
                  <article
                    key={item.id}
                    data-node
                    className={`${css.node} ${right ? css.noderight : css.nodeleft} ${git ? css.nodegit : ""} ${on ? css.nodeselected : ""}`}
                    style={{
                      left: `${right ? props.pane.axis + 40 : Math.max(props.pane.axis - 180, 24)}px`,
                      top: `${top}px`,
                    }}
                    onClick={(event) => {
                      if (!git || (event.target as HTMLElement).closest(`.${css.check}`)) return
                      props.onPick(item.id)
                    }}
                    onKeyDown={(event) => props.onKey(event, item)}
                    onMouseEnter={(event) => props.onHover(item, event.clientX, event.clientY)}
                    onMouseMove={(event) => props.onHover(item, event.clientX, event.clientY)}
                    onMouseLeave={props.onHide}
                    onFocus={(event) => props.onFocus(item, event.currentTarget)}
                    onBlur={props.onHide}
                    tabIndex={git ? 0 : -1}
                    role={git ? "button" : undefined}
                    aria-pressed={git ? on : undefined}
                    aria-label={`${item.label} ${item.time}`}
                  >
                    <span
                      className={css.line}
                      style={{ left: right ? "-40px" : "160px", background: git ? "#c7d2fe" : "#e2e8f0" }}
                    ></span>
                    <span className={`${css.dot} ${css[`dot_${item.type}`]}`}></span>
                    {git ? (
                      <button
                        type="button"
                        className={`${css.check} ${on ? css.checkon : ""}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          props.onPick(item.id)
                        }}
                        aria-label={`${on ? "取消选择" : "选择"} ${item.commitHash ?? item.label}`}
                      >
                        {on ? <Check size={12} strokeWidth={3} /> : null}
                      </button>
                    ) : null}
                    <div className={git ? css.hash : css.label}>
                      {git ? (item.commitHash ?? item.label) : kind(item.type)}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          {props.tip ? (
            <div data-tip className={css.tip} style={{ left: props.tip.x, top: props.tip.y }}>
              <strong>{props.tip.item.label}</strong>
              <span>{props.tip.item.time}</span>
              <p>{props.tip.item.description}</p>
              {props.tip.item.commitHash ? <em>{props.tip.item.commitHash}</em> : null}
            </div>
          ) : null}
        </div>

        <aside className={`${css.analysis} ${ui.scroll}`}>
          {props.picked.length || props.analysis ? (
            <>
              <div className={css.head}>
                <div>
                  <strong className={ui.sectiontitle}>
                    <GitCompareArrows size={16} />
                    <span>Git 节点分析</span>
                  </strong>
                  <span>已选 {props.picked.length} 个节点</span>
                </div>
                {props.picks.length ? (
                  <div className={css.selected}>
                    {props.picks.map((item) => (
                      <span key={item.id}>{item.commitHash ?? item.label}</span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className={css.form}>
                <textarea
                  value={props.note}
                  placeholder="输入分析需求，例如：分析这两个提交之间的代码差异、评估风控逻辑的改进..."
                  onChange={(event) => props.onNote(event.target.value)}
                />
                <div className={css.actions}>
                  <button type="button" className={ui.primary} onClick={props.onSubmit}>
                    <Sparkles size={14} />
                    <span>提交 AI 分析</span>
                  </button>
                  <button type="button" className={ui.blockbtn} onClick={props.onReset}>
                    <X size={14} />
                    <span>清除选择</span>
                  </button>
                </div>
              </div>
              {props.analysis || props.picks.length ? (
                <div className={css.result}>
                  <strong className={ui.sectiontitle}>
                    <Sparkles size={16} />
                    <span>分析结论</span>
                  </strong>
                  {props.analysis ? <p>{props.analysis}</p> : null}
                  {props.picks.map((item) => (
                    <div key={item.id} className={css.diff}>
                      <strong>{item.commitHash ?? item.label}</strong>
                      <p>{item.diffSummary ?? item.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className={css.empty}>💡 在时间线中点击 Git 节点（紫色圆点）进行选择，然后在此处提交 AI 分析</div>
          )}
        </aside>
      </div>
    </section>
  )
}
