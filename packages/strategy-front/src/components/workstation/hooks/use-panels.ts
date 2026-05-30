import { useEffect, useState, type KeyboardEvent, type PointerEvent } from "react"
import { clamp } from "../../workbench/lib"

export type Size = null | { kind: "left" | "right"; x: number; w: number }

export function usePanels() {
  const [right, setRight] = useState(false)
  const [left, setLeft] = useState(300)
  const [side, setSide] = useState(360)
  const [size, setSize] = useState<Size>(null)

  useEffect(() => {
    if (!size) return
    document.body.style.userSelect = "none"
    document.body.style.cursor = "col-resize"
    document.body.style.touchAction = "none"

    const move = (event: globalThis.PointerEvent) => {
      if (size.kind === "left") {
        setLeft(clamp(size.w + event.clientX - size.x, 220, 460))
        return
      }
      setSide(clamp(size.w + size.x - event.clientX, 280, 500))
    }

    const up = () => {
      setSize(null)
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
  }, [size])

  const resize = (kind: "left" | "right", event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSize({ kind, x: event.clientX, w: kind === "left" ? left : side })
  }

  const key = (kind: "left" | "right", event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 12
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()

    if (kind === "left") {
      setLeft((item) => clamp(item + (event.key === "ArrowRight" ? step : -step), 220, 460))
      return
    }

    setSide((item) => clamp(item + (event.key === "ArrowLeft" ? step : -step), 280, 500))
  }

  return {
    left: {
      w: left,
      active: size?.kind === "left",
      onDown: (event: PointerEvent<HTMLDivElement>) => resize("left", event),
      onKey: (event: KeyboardEvent<HTMLDivElement>) => key("left", event),
    },
    right: {
      open: right,
      setOpen: setRight,
      w: side,
      active: size?.kind === "right",
      onDown: (event: PointerEvent<HTMLDivElement>) => resize("right", event),
      onKey: (event: KeyboardEvent<HTMLDivElement>) => key("right", event),
    },
  }
}
