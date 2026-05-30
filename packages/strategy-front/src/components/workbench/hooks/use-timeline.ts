import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react"
import type { SessionItem, TimelineEvent } from "../data"
import { clamp } from "../lib"

function init(active: string) {
  return {
    active,
    picked: [] as string[],
    analysis: "",
    note: "",
    tip: null as null | { item: TimelineEvent; x: number; y: number },
  }
}

export function useTimeline(cur: SessionItem, active: string) {
  const [state, setState] = useState(() => init(active))
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [drag, setDrag] = useState({ on: false, x: 0, y: 0, ox: 0, oy: 0 })
  const [plot, setPlot] = useState({ w: 0, h: 0 })
  const boxRef = useRef<HTMLDivElement | null>(null)

  const data = state.active === active ? state : init(active)
  const sync = (fn: (item: ReturnType<typeof init>) => ReturnType<typeof init>) => {
    setState((item) => fn(item.active === active ? item : init(active)))
  }
  const picks = cur.timelineEvents.filter((item) => data.picked.includes(item.id))
  const pane = useMemo(() => {
    const w = plot.w || 800
    const h = plot.h || 600
    const total = Math.max(h * 2.2, cur.timelineEvents.length * 100)
    const axis = w * 0.25
    const top = 60
    const bot = 60
    const span = Math.max(total - top - bot, 120)
    return {
      w,
      h: total,
      axis,
      top,
      marks: cur.timelineEvents.map((_, idx) => top + (idx / Math.max(cur.timelineEvents.length - 1, 1)) * span),
    }
  }, [cur.timelineEvents, plot])

  useEffect(() => {
    const node = boxRef.current
    if (!node) return

    const sync = () => {
      setPlot({
        w: node.clientWidth,
        h: node.clientHeight,
      })
    }

    sync()
    const obs = new ResizeObserver(sync)
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!drag.on) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
    document.body.style.touchAction = "none"

    const move = (event: globalThis.PointerEvent) => {
      setPan({
        x: drag.ox + event.clientX - drag.x,
        y: drag.oy + event.clientY - drag.y,
      })
    }

    const up = () => {
      setDrag((item) => ({ ...item, on: false }))
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
      document.body.style.touchAction = ""
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [drag])

  const pick = (id: string) => {
    sync((item) => ({
      ...item,
      picked: item.picked.includes(id) ? item.picked.filter((entry) => entry !== id) : [...item.picked, id],
    }))
  }

  const hover = (item: TimelineEvent, x: number, y: number) => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    sync((state) => ({
      ...state,
      tip: {
        item,
        x: clamp(x - box.left + 18, 16, Math.max(box.width - 280, 16)),
        y: clamp(y - box.top + 18, 16, Math.max(box.height - 120, 16)),
      },
    }))
  }

  const focus = (item: TimelineEvent, node: HTMLElement) => {
    const wrap = boxRef.current?.getBoundingClientRect()
    const box = node.getBoundingClientRect()
    if (!wrap) return
    sync((state) => ({
      ...state,
      tip: {
        item,
        x: clamp(box.right - wrap.left + 12, 16, Math.max(wrap.width - 280, 16)),
        y: clamp(box.top - wrap.top + 8, 16, Math.max(wrap.height - 120, 16)),
      },
    }))
  }

  const wheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    setZoom((old) => {
      const next = clamp(old + (event.deltaY > 0 ? -8 : 8), 20, 250)
      const from = old / 100
      const to = next / 100
      setPan((item) => ({
        x: x - ((x - item.x) / from) * to,
        y: y - ((y - item.y) / from) * to,
      }))
      return next
    })
  }

  const key = (event: KeyboardEvent<HTMLElement>, item: TimelineEvent) => {
    if (item.type !== "git") return
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    pick(item.id)
  }

  const grab = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    const target = event.target as HTMLElement
    if (target.closest("[data-node]") || target.closest("[data-tip]")) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ on: true, x: event.clientX, y: event.clientY, ox: pan.x, oy: pan.y })
  }

  const reset = () => {
    setState(init(active))
  }

  const submit = () => {
    if (!picks.length) return
    sync((item) => ({
      ...item,
      analysis: `已分析 ${picks.map((entry) => entry.commitHash ?? entry.label).join("、")} 之间的变化，建议优先检查风控顺序、空仓保护和信号过滤。`,
      note: item.note.trim() ? item.note : "分析所选 Git 节点间的代码差异、风控路径和审查结论。",
    }))
  }

  return {
    picked: data.picked,
    picks,
    analysis: data.analysis,
    note: data.note,
    zoom,
    pan,
    drag,
    tip: data.tip,
    pane,
    boxRef,
    setNote: (text: string) => sync((item) => ({ ...item, note: text })),
    setZoom,
    setPan,
    pick,
    hover,
    focus,
    hide: () => sync((item) => ({ ...item, tip: null })),
    wheel,
    grab,
    key,
    reset,
    submit,
  }
}

export type TimelineState = ReturnType<typeof useTimeline>
