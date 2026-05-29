import { Maximize2, Minus, Play, Plus, Workflow } from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react"
import type { SessionItem } from "../../data"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/stage/stage.module.css"

let boot = false
const ZOOM_MIN = 0.3
const ZOOM_MAX = 3
const ZOOM_STEP = 0.15

export function Flow(props: { cur: SessionItem; id: string; onRun: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 })

  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [props.cur.flowchartCode])

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!props.cur.flowchartCode) { node.innerHTML = ""; return }
    let on = true
    node.innerHTML = ""
    import("mermaid").then((mod) => {
      const chart = mod.default
      if (!boot) {
        chart.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" })
        boot = true
      }
      return chart.render(`workbench-${props.id}`, props.cur.flowchartCode)
    }).then((res) => {
      if (!on || !res || !ref.current) return
      ref.current.innerHTML = res.svg
      res.bindFunctions?.(ref.current)
    }).catch(() => {
      if (!on || !ref.current) return
      ref.current.textContent = props.cur.flowchartCode
    })
    return () => { on = false }
  }, [props.cur.flowchartCode, props.id])
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const dir = e.deltaY > 0 ? -1 : 1
    const next = clamp(zoom + dir * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX)
    const ratio = next / zoom
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio })
    setZoom(next)
  }

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    setDragging(true)
    start.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return
    setPan({
      x: start.current.px + (e.clientX - start.current.x),
      y: start.current.py + (e.clientY - start.current.y),
    })
  }

  const onPointerUp = () => setDragging(false)

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  return (
    <section className={css.root}>
      <div className={css.head}>
        <strong className={ui.sectiontitle}>
          <Workflow size={16} />
          <span>流程图</span>
        </strong>
        <div className={css.flowtools}>
          <button type="button" className={css.toolbtn} onClick={() => setZoom(clamp(zoom - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}>
            <Minus size={14} />
          </button>
          <span className={css.zoomlabel}>{Math.round(zoom * 100)}%</span>
          <button type="button" className={css.toolbtn} onClick={() => setZoom(clamp(zoom + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}>
            <Plus size={14} />
          </button>
          <button type="button" className={css.toolbtn} onClick={reset}>
            <Maximize2 size={14} />
          </button>
          <button type="button" className={ui.blockbtn} onClick={props.onRun}>
            <Play size={14} />
            <span>运行回测</span>
          </button>
        </div>
      </div>
      {props.cur.flowchartCode ? (
        <div
          ref={boxRef}
          className={css.flowbox}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <div
            ref={ref}
            className={css.flow}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}
          />
        </div>
      ) : (
        <div className={ui.empty}>暂无流程图</div>
      )}
    </section>
  )
}
