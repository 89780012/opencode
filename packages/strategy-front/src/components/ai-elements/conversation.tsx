"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowDownIcon } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"

const GAP = 24

const Context = createContext<{
  body: RefObject<HTMLDivElement | null>
  wrap: RefObject<HTMLDivElement | null>
  bot: boolean
  jump: (mode?: ScrollBehavior) => void
  setBody: (node: HTMLDivElement | null) => void
} | null>(null)

function useConversation() {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error("Conversation 相关组件必须在 Conversation 内使用")
  }
  return ctx
}

export type ConversationProps = ComponentProps<"div">

export const Conversation = ({ children, className, onScroll, onWheel, ...props }: ConversationProps) => {
  const body = useRef<HTMLDivElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const anim = useRef(0)
  const last = useRef(true)
  const [bot, setBot] = useState(true)
  const setBody = useCallback((node: HTMLDivElement | null) => {
    body.current = node
  }, [])

  const sync = useCallback(() => {
    const node = root.current
    if (!node) return
    const next = node.scrollHeight - node.clientHeight - node.scrollTop <= GAP
    last.current = next
    setBot((prev) => (prev === next ? prev : next))
  }, [])

  const stop = useCallback(() => {
    if (!anim.current) {
      return
    }
    cancelAnimationFrame(anim.current)
    anim.current = 0
  }, [])

  const leave = useCallback(() => {
    stop()
    last.current = false
    setBot(false)
  }, [stop])

  const jump = useCallback((mode: ScrollBehavior = "auto") => {
    const node = root.current
    if (!node) return
    stop()
    if (mode === "smooth") {
      const from = node.scrollTop
      const dist = node.scrollHeight - node.clientHeight - from
      if (dist <= 4) {
        node.scrollTop = node.scrollHeight
        return
      }
      const span = Math.min(320, Math.max(160, dist * 0.18))
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / span)
        const eased = 1 - Math.pow(1 - p, 3)
        const top = node.scrollHeight - node.clientHeight
        node.scrollTop = from + (top - from) * eased
        if (p >= 1) {
          anim.current = 0
          node.scrollTop = node.scrollHeight
          sync()
          return
        }
        anim.current = requestAnimationFrame(step)
      }
      anim.current = requestAnimationFrame(step)
      return
    }
    node.scrollTop = node.scrollHeight
  }, [stop, sync])

  useLayoutEffect(() => {
    jump()
    sync()
  }, [jump, sync])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  useEffect(() => {
    const node = body.current
    if (!node) return
    if (typeof ResizeObserver === "undefined") {
      const onResize = () => {
        if (last.current) {
          jump()
        }
        sync()
      }
      window.addEventListener("resize", onResize)
      return () => {
        window.removeEventListener("resize", onResize)
      }
    }
    const obs = new ResizeObserver(() => {
      if (frame.current) {
        return
      }
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        if (last.current) {
          jump()
        }
        sync()
      })
    })
    obs.observe(node)
    return () => {
      stop()
      if (frame.current) {
        cancelAnimationFrame(frame.current)
      }
      obs.disconnect()
    }
  }, [jump, stop, sync])

  return (
    <Context.Provider value={{ body, wrap, bot, jump, setBody }}>
      <div className="conversation-wrap relative flex h-full min-h-0 min-w-0 flex-1 flex-col" ref={wrap}>
        <div
          className={cn("conversation-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto", className)}
          ref={root}
          role="log"
          {...props}
          onWheel={(event) => {
            if (event.deltaY < 0) {
              leave()
            }
            onWheel?.(event)
          }}
          onScroll={(event) => {
            sync()
            onScroll?.(event)
          }}
        >
          {children}
        </div>
      </div>
    </Context.Provider>
  )
}

export type ConversationContentProps = ComponentProps<"div"> & {
  plain?: boolean
}

export const ConversationContent = ({ className, plain, ...props }: ConversationContentProps) => {
  const ctx = useConversation()
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      ctx.setBody(node)
    },
    [ctx],
  )
  return <div className={cn("conversation-body min-w-0", plain ? "" : "space-y-4 p-4", className)} ref={ref} {...props} />
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string
  description?: string
  icon?: ReactNode
}

export const ConversationEmptyState = ({
  className,
  title = "暂无消息",
  description = "开始对话后，消息会显示在这里",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn("flex size-full flex-col items-center justify-center gap-3 p-8 text-center", className)}
    {...props}
  >
    {children ?? (
      <>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </>
    )}
  </div>
)

export type ConversationScrollButtonProps = ComponentProps<typeof Button>

export const ConversationScrollButton = ({ className, ...props }: ConversationScrollButtonProps) => {
  const { wrap, bot, jump } = useConversation()

  const handleScrollToBottom = useCallback(() => {
    jump("smooth")
  }, [jump])

  if (bot) {
    return null
  }

  if (!wrap.current) {
    return null
  }

  return createPortal(
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
      <Button
        className={cn("pointer-events-auto rounded-full shadow-sm", className)}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    </div>,
    wrap.current,
  )
}
