import * as React from "react"
import { GripVertical } from "lucide-react"
import { load, save } from "@/lib/store"
import { cn } from "@/lib/utils"

type PanelProps = {
  children: React.ReactNode
  className?: string
  defaultSize?: number
  minSize?: number
}

type HandleProps = {
  className?: string
  withHandle?: boolean
}

type GroupProps = {
  children: React.ReactNode
  className?: string
  autoSaveId?: string
  collapsed?: boolean
  direction?: "horizontal"
}

const rail = 12

function read(key?: string, fallback?: number) {
  if (!key || typeof window === "undefined") {
    return fallback ?? 50
  }

  const raw = load(key)
  const num = Number(raw)
  if (Number.isFinite(num)) {
    return num
  }
  return fallback ?? 50
}

function write(key: string | undefined, value: number) {
  if (!key || typeof window === "undefined") {
    return
  }

  save(key, `${value}`)
}

function clamp(
  value: number,
  width: number,
  gap: number,
  left?: React.ReactElement<PanelProps> | null,
  right?: React.ReactElement<PanelProps> | null,
) {
  const span = width - gap
  if (span <= 0) {
    return value
  }

  const min = (((left?.props.minSize ?? 320) / span) * 100)
  const max = 100 - (((right?.props.minSize ?? 520) / span) * 100)
  return Math.min(Math.max(value, min), max)
}

export function ResizablePanel(props: PanelProps) {
  return <>{props.children}</>
}

export function ResizableHandle(props: HandleProps) {
  void props
  return null
}

export function ResizablePanelGroup(props: GroupProps) {
  const items = React.Children.toArray(props.children)
  const left = React.isValidElement<PanelProps>(items[0]) ? items[0] : null
  const handle = React.isValidElement<HandleProps>(items[1]) ? items[1] : null
  const right = React.isValidElement<PanelProps>(items[2]) ? items[2] : null
  const root = React.useRef<HTMLDivElement | null>(null)
  const dragRef = React.useRef(false)
  const sizeRef = React.useRef(0)
  const posRef = React.useRef(0)
  const frameRef = React.useRef<number | null>(null)
  const boxRef = React.useRef<{ left: number; width: number; span: number; min: number; max: number } | null>(null)
  const start = left?.props.defaultSize ?? 50
  const [size, setSize] = React.useState(() => read(props.autoSaveId, start))
  const [drag, setDrag] = React.useState(false)
  const fold = !!props.collapsed
  const gap = fold ? 0 : rail
  const ratio = fold ? 1 : size / 100

  const paint = React.useCallback((value: number) => {
    const node = root.current
    if (!node) {
      return
    }

    node.style.setProperty("--resize-size", `${fold ? 1 : value / 100}`)
  }, [fold])

  React.useEffect(() => {
    setSize(read(props.autoSaveId, start))
  }, [props.autoSaveId, start])

  React.useEffect(() => {
    sizeRef.current = size
    if (!dragRef.current) {
      paint(size)
    }
  }, [paint, size])

  React.useEffect(() => {
    const node = root.current
    if (!node || !left || !right) {
      return
    }

    const sync = () => {
      setSize((prev) => clamp(prev, node.clientWidth, gap, left, right))
    }

    sync()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", sync)
      return () => {
        window.removeEventListener("resize", sync)
      }
    }

    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [gap, left, right])

  React.useEffect(() => {
    if (!drag || fold) {
      return
    }

    dragRef.current = true

    const flush = () => {
      frameRef.current = null
      const box = boxRef.current
      if (!box) {
        return
      }

      const next = Math.min(Math.max(posRef.current - box.left, box.min), box.max)
      const value = clamp((next / box.span) * 100, box.width, gap, left, right)
      sizeRef.current = value
      paint(value)
    }

    const move = (event: PointerEvent) => {
      posRef.current = event.clientX
      if (frameRef.current !== null) {
        return
      }
      frameRef.current = window.requestAnimationFrame(flush)
    }

    const up = () => {
      dragRef.current = false
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        flush()
      }
      boxRef.current = null
      setDrag(false)
      setSize(sizeRef.current)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    window.addEventListener("blur", up)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      dragRef.current = false
      boxRef.current = null
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      window.removeEventListener("blur", up)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [drag, fold, gap, left, paint, right])

  React.useEffect(() => {
    if (!fold) {
      return
    }

    setDrag(false)
  }, [fold])

  React.useEffect(() => {
    if (drag) {
      return
    }

    const id = window.setTimeout(() => {
      write(props.autoSaveId, size)
    }, 120)

    return () => {
      window.clearTimeout(id)
    }
  }, [drag, props.autoSaveId, size])

  if (props.direction !== "horizontal" || !left || !right) {
    return <div className={props.className}>{props.children}</div>
  }

  return (
    <div
      ref={root}
      className={cn("flex min-h-0 min-w-0 overflow-hidden", props.className)}
      style={{ "--resize-size": `${ratio}` } as React.CSSProperties}
    >
      <div
        className={cn("flex min-h-0 min-w-0 w-full flex-col overflow-hidden", left.props.className)}
        style={{
          flexBasis: fold ? "100%" : `calc((100% - ${gap}px) * var(--resize-size))`,
          flexGrow: 0,
          flexShrink: 0,
        }}
      >
        {left.props.children}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        onPointerDown={(event) => {
          if (fold) {
            return
          }
          event.preventDefault()
          const node = root.current
          if (!node) {
            return
          }
          const rect = node.getBoundingClientRect()
          const span = rect.width - gap
          if (span <= 0) {
            return
          }
          boxRef.current = {
            left: rect.left,
            width: rect.width,
            span,
            min: left.props.minSize ?? 320,
            max: span - (right.props.minSize ?? 520),
          }
          posRef.current = event.clientX
          setDrag(true)
        }}
        className={cn(
          fold ? "pointer-events-none w-0 overflow-hidden" : "group relative flex w-3 shrink-0 touch-none items-center justify-center",
          !fold ? "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border" : "",
          !fold ? "hover:before:bg-muted-foreground/50" : "",
          !fold && drag ? "before:bg-primary" : "",
          handle?.props.className,
        )}
      >
        {handle?.props.withHandle ? (
          <div className="z-10 flex h-10 w-3 items-center justify-center rounded-full border bg-background shadow-sm">
            <GripVertical className="size-3 text-muted-foreground" />
          </div>
        ) : null}
      </div>
      <div
        className={cn("flex min-h-0 min-w-0 w-full flex-col overflow-hidden", right.props.className)}
        style={{
          flexBasis: fold ? 0 : `calc((100% - ${gap}px) * (1 - var(--resize-size)))`,
          flexGrow: 0,
          flexShrink: 0,
        }}
        aria-hidden={fold}
      >
        {right.props.children}
      </div>
    </div>
  )
}
