import * as React from "react"
import { GripVertical } from "lucide-react"
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

  const raw = window.localStorage.getItem(key)
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

  window.localStorage.setItem(key, `${value}`)
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
  const start = left?.props.defaultSize ?? 50
  const [size, setSize] = React.useState(() => read(props.autoSaveId, start))
  const [drag, setDrag] = React.useState(false)
  const fold = !!props.collapsed
  const gap = fold ? 0 : rail

  React.useEffect(() => {
    setSize(read(props.autoSaveId, start))
  }, [props.autoSaveId, start])

  React.useEffect(() => {
    const node = root.current
    if (!node || !left || !right) {
      return
    }

    const sync = () => {
      setSize((prev) => clamp(prev, node.clientWidth, gap, left, right))
    }

    sync()
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

    const move = (event: PointerEvent) => {
      const node = root.current
      if (!node || !left || !right) {
        return
      }

      const rect = node.getBoundingClientRect()
      const span = rect.width - gap
      const min = left.props.minSize ?? 320
      const max = span - (right.props.minSize ?? 520)
      const next = Math.min(Math.max(event.clientX - rect.left, min), max)
      const value = clamp((next / span) * 100, rect.width, gap, left, right)
      setSize(value)
    }

    const up = () => {
      setDrag(false)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [drag, fold, gap, left, right])

  React.useEffect(() => {
    if (!fold) {
      return
    }

    setDrag(false)
  }, [fold])

  React.useEffect(() => {
    write(props.autoSaveId, size)
  }, [props.autoSaveId, size])

  if (props.direction !== "horizontal" || !left || !right) {
    return <div className={props.className}>{props.children}</div>
  }

  return (
    <div ref={root} className={cn("flex min-h-0 min-w-0 overflow-hidden", props.className)}>
      <div
        className={cn("flex min-h-0 min-w-0 w-full flex-col overflow-hidden", left.props.className)}
        style={{
          flexBasis: fold ? "100%" : `calc((100% - ${gap}px) * ${size / 100})`,
          flexGrow: 0,
          flexShrink: 0,
          width: fold ? "100%" : `calc((100% - ${gap}px) * ${size / 100})`,
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
          flexBasis: fold ? 0 : `calc((100% - ${gap}px) * ${(100 - size) / 100})`,
          flexGrow: 0,
          flexShrink: 0,
          width: fold ? 0 : `calc((100% - ${gap}px) * ${(100 - size) / 100})`,
        }}
        aria-hidden={fold}
      >
        {right.props.children}
      </div>
    </div>
  )
}
