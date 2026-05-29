import type { KeyboardEvent, PointerEvent, RefObject, WheelEvent } from "react"
import type { SessionItem, TimelineEvent } from "../../data"
import css from "../../styles/stage/timeline.module.css"
import { TimelineAnalysis, TimelineCanvas, TimelineToolbar } from "./timeline-parts"

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
      <TimelineToolbar zoom={props.zoom} onZoom={props.onZoom} onPan={props.onPan} />
      <div className={css.body}>
        <TimelineCanvas
          cur={props.cur}
          picked={props.picked}
          zoom={props.zoom}
          pan={props.pan}
          drag={props.drag}
          tip={props.tip}
          pane={props.pane}
          boxRef={props.boxRef}
          onPick={props.onPick}
          onHover={props.onHover}
          onFocus={props.onFocus}
          onHide={props.onHide}
          onWheel={props.onWheel}
          onGrab={props.onGrab}
          onKey={props.onKey}
        />
        <TimelineAnalysis
          picked={props.picked}
          picks={props.picks}
          analysis={props.analysis}
          note={props.note}
          onNote={props.onNote}
          onSubmit={props.onSubmit}
          onReset={props.onReset}
        />
      </div>
    </section>
  )
}
