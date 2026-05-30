import type { SessionItem } from "../../data"
import { useTimeline } from "../../hooks/use-timeline"
import { Timeline } from "./timeline"

export function TimelineStage(props: { cur: SessionItem; active: string }) {
  const time = useTimeline(props.cur, props.active)

  return (
    <Timeline
      cur={props.cur}
      picked={time.picked}
      picks={time.picks}
      analysis={time.analysis}
      note={time.note}
      zoom={time.zoom}
      pan={time.pan}
      drag={time.drag}
      tip={time.tip}
      pane={time.pane}
      boxRef={time.boxRef}
      onNote={time.setNote}
      onPick={time.pick}
      onSubmit={time.submit}
      onReset={time.reset}
      onZoom={time.setZoom}
      onPan={time.setPan}
      onHover={time.hover}
      onFocus={time.focus}
      onHide={time.hide}
      onWheel={time.wheel}
      onGrab={time.grab}
      onKey={time.key}
    />
  )
}
