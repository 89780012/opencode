import { Check, Clock3, GitCompareArrows, Minus, Plus, RotateCcw, Sparkles, X } from "lucide-react"
import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from "react"
import type { SessionItem, TimelineEvent } from "../data"
import { kind } from "../lib"
import ui from "../shared.module.css"
import css from "./timeline.module.css"

export function TimelineToolbar(props: { zoom: number; onZoom: (zoom: number) => void; onPan: (pan: { x: number; y: number }) => void }) {
  return (
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
  )
}

function Node(props: {
  item: TimelineEvent
  idx: number
  axis: number
  top: number
  on: boolean
  onPick: (id: string) => void
  onHover: (item: TimelineEvent, x: number, y: number) => void
  onFocus: (item: TimelineEvent, node: HTMLElement) => void
  onHide: () => void
  onKey: (event: KeyboardEvent<HTMLElement>, item: TimelineEvent) => void
}) {
  const right = props.idx % 2 === 0
  const git = props.item.type === "git"

  return (
    <article
      data-node
      className={`${css.node} ${right ? css.noderight : css.nodeleft} ${git ? css.nodegit : ""} ${props.on ? css.nodeselected : ""}`}
      style={{
        left: `${right ? props.axis + 40 : Math.max(props.axis - 180, 24)}px`,
        top: `${props.top}px`,
      }}
      onClick={(event) => {
        if (!git || (event.target as HTMLElement).closest(`.${css.check}`)) return
        props.onPick(props.item.id)
      }}
      onKeyDown={(event) => props.onKey(event, props.item)}
      onMouseEnter={(event) => props.onHover(props.item, event.clientX, event.clientY)}
      onMouseMove={(event) => props.onHover(props.item, event.clientX, event.clientY)}
      onMouseLeave={props.onHide}
      onFocus={(event) => props.onFocus(props.item, event.currentTarget)}
      onBlur={props.onHide}
      tabIndex={git ? 0 : -1}
      role={git ? "button" : undefined}
      aria-pressed={git ? props.on : undefined}
      aria-label={`${props.item.label} ${props.item.time}`}
    >
      <span className={css.line} style={{ left: right ? "-40px" : "160px", background: git ? "#c7d2fe" : "#e2e8f0" }}></span>
      <span className={`${css.dot} ${css[`dot_${props.item.type}`]}`}></span>
      {git ? (
        <button
          type="button"
          className={`${css.check} ${props.on ? css.checkon : ""}`}
          onClick={(event) => {
            event.stopPropagation()
            props.onPick(props.item.id)
          }}
          aria-label={`${props.on ? "取消选择" : "选择"} ${props.item.commitHash ?? props.item.label}`}
        >
          {props.on ? <Check size={12} strokeWidth={3} /> : null}
        </button>
      ) : null}
      <div className={git ? css.hash : css.label}>{git ? (props.item.commitHash ?? props.item.label) : kind(props.item.type)}</div>
    </article>
  )
}

export function TimelineCanvas({
  cur,
  picked,
  zoom,
  pan,
  drag,
  tip,
  pane,
  boxRef,
  onPick,
  onHover,
  onFocus,
  onHide,
  onWheel,
  onGrab,
  onKey,
}: {
  cur: SessionItem
  picked: string[]
  zoom: number
  pan: { x: number; y: number }
  drag: { on: boolean; x: number; y: number; ox: number; oy: number }
  tip: null | { item: TimelineEvent; x: number; y: number }
  pane: { w: number; h: number; axis: number; top: number; marks: number[] }
  boxRef: RefObject<HTMLDivElement | null>
  onPick: (id: string) => void
  onHover: (item: TimelineEvent, x: number, y: number) => void
  onFocus: (item: TimelineEvent, node: HTMLElement) => void
  onHide: () => void
  onWheel: (event: WheelEvent<HTMLDivElement>) => void
  onGrab: (event: PointerEvent<HTMLDivElement>) => void
  onKey: (event: KeyboardEvent<HTMLElement>, item: TimelineEvent) => void
}) {
  return (
    <div ref={boxRef} className={`${css.canvas} ${drag.on ? css.canvasdrag : ""}`} onPointerDown={onGrab} onWheel={onWheel}>
      <div className={css.move} style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        <div
          className={css.zoomwrap}
          style={{
            transform: `scale(${zoom / 100})`,
            width: `${pane.w}px`,
            height: `${pane.h}px`,
          }}
        >
          <div
            className={css.axis}
            style={{
              left: `${pane.axis}px`,
              top: `${pane.top}px`,
              height: `${Math.max(pane.h - pane.top * 2, 120)}px`,
            }}
          ></div>
          {pane.marks.map((item, idx) => (
            <span key={`tick-${idx}`} className={css.tick} style={{ top: `${item}px`, left: `${pane.axis - 10}px` }}></span>
          ))}
          {cur.timelineEvents.map((item, idx) => (
            <Node
              key={item.id}
              item={item}
              idx={idx}
              axis={pane.axis}
              top={pane.marks[idx] - 12}
              on={picked.includes(item.id)}
              onPick={onPick}
              onHover={onHover}
              onFocus={onFocus}
              onHide={onHide}
              onKey={onKey}
            />
          ))}
        </div>
      </div>

      {tip ? (
        <div data-tip className={css.tip} style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.item.label}</strong>
          <span>{tip.item.time}</span>
          <p>{tip.item.description}</p>
          {tip.item.commitHash ? <em>{tip.item.commitHash}</em> : null}
        </div>
      ) : null}
    </div>
  )
}

export function TimelineAnalysis(props: {
  picked: string[]
  picks: TimelineEvent[]
  analysis: string
  note: string
  onNote: (text: string) => void
  onSubmit: () => void
  onReset: () => void
}) {
  return (
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
  )
}
