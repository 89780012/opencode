import { Code2, Maximize2, Minus, Play, Plus, Save, Workflow } from "lucide-react"
import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react"
import type { WorkbenchFlowchart } from "@/store/workbench-slice"
import type { SessionItem } from "../../data"
import ui from "../../../shared/styles/ui.module.css"
import css from "../../styles/stage/stage.module.css"

let boot = false
const ZOOM_MIN = 0.3
const ZOOM_MAX = 3
const ZOOM_STEP = 0.15

export function Flow(props: {
  cur: SessionItem
  flow: WorkbenchFlowchart | null
  id: string
  onRun: () => void
  onSave: (code: string) => Promise<void>
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 })
  const [mode, setMode] = useState<"chart" | "source">("chart")
  const [draft, setDraft] = useState(props.cur.flowchartCode)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const dirty = draft !== props.cur.flowchartCode

  useEffect(() => {
    setDraft(props.cur.flowchartCode)
    setErr("")
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [props.cur.flowchartCode])

  useEffect(() => {
    if (mode !== "chart") return
    const node = ref.current
    if (!node) return
    if (!props.cur.flowchartCode) {
      node.innerHTML = ""
      return
    }
    let on = true
    node.innerHTML = ""
    import("mermaid")
      .then((mod) => {
        const chart = mod.default
        if (!boot) {
          chart.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" })
          boot = true
        }
        return chart.render(`workbench-${props.id}`, props.cur.flowchartCode)
      })
      .then((res) => {
        if (!on || !res || !ref.current) return
        ref.current.innerHTML = res.svg
        res.bindFunctions?.(ref.current)
      })
      .catch(() => {
        if (!on || !ref.current) return
        ref.current.textContent = props.cur.flowchartCode
      })
    return () => {
      on = false
    }
  }, [mode, props.cur.flowchartCode, props.id])

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const node = box.current
    if (!node) return
    const rect = node.getBoundingClientRect()
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

  const reset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const save = async () => {
    if (!dirty || saving) return
    setSaving(true)
    setErr("")
    try {
      await props.onSave(draft)
      setMode("chart")
    } catch (error) {
      setErr(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={css.root}>
      <div className={css.head}>
        <strong className={ui.sectiontitle}>
          <Workflow size={16} />
          <span>流程图</span>
          {props.flow?.manual ? <em className={css.badge}>手工修改</em> : null}
        </strong>
        <div className={css.flowtools}>
          <div className={css.switch}>
            <button type="button" className={mode === "chart" ? css.switch_on : ""} onClick={() => setMode("chart")}>
              <Workflow size={13} />
              <span>图</span>
            </button>
            <button type="button" className={mode === "source" ? css.switch_on : ""} onClick={() => setMode("source")}>
              <Code2 size={13} />
              <span>源码</span>
            </button>
          </div>
          {mode === "chart" ? (
            <>
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
            </>
          ) : (
            <button type="button" className={ui.blockbtn} disabled={!dirty || saving} onClick={() => void save()}>
              <Save size={14} />
              <span>{saving ? "保存中" : dirty ? "保存" : "已保存"}</span>
            </button>
          )}
          <button type="button" className={ui.blockbtn} onClick={props.onRun}>
            <Play size={14} />
            <span>运行回测</span>
          </button>
        </div>
      </div>
      {mode === "source" ? (
        <div className={css.sourcebox}>
          <textarea
            className={`${css.source} ${ui.scroll}`}
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className={css.status}>
            <span>{dirty ? "未保存" : props.flow?.source === "manual" ? "手工版本" : "AI 版本"}</span>
            {err ? <strong>{err}</strong> : null}
          </div>
        </div>
      ) : props.cur.flowchartCode ? (
        <div
          ref={box}
          className={css.flowbox}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
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
