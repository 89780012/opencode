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

const GAP = 24

const Context = createContext<{
  body: RefObject<HTMLDivElement | null>
  bot: boolean
  jump: (mode?: ScrollBehavior) => void
} | null>(null)

function useConversation() {
  const ctx = useContext(Context)
  if (!ctx) {
    throw new Error("Conversation components must be used inside Conversation")
  }
  return ctx
}

export type ConversationProps = ComponentProps<"div">

export const Conversation = ({ children, className, onScroll, ...props }: ConversationProps) => {
  const body = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const frame = useRef(0)
  const last = useRef(true)
  const [bot, setBot] = useState(true)
  const [ready, setReady] = useState(false)

  const sync = useCallback(() => {
    const node = root.current
    if (!node) return
    const next = node.scrollHeight - node.clientHeight - node.scrollTop <= GAP
    last.current = next
    setBot((prev) => (prev === next ? prev : next))
  }, [])

  const jump = useCallback((mode: ScrollBehavior = "auto") => {
    const node = root.current
    if (!node) return
    if (mode === "smooth") {
      node.scrollTo({ top: node.scrollHeight, behavior: mode })
      return
    }
    node.scrollTop = node.scrollHeight
  }, [])

  useLayoutEffect(() => {
    jump()
    sync()
    setReady(true)
  }, [jump, sync])

  useEffect(() => {
    const node = body.current
    if (!node) return
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
      if (frame.current) {
        cancelAnimationFrame(frame.current)
      }
      obs.disconnect()
    }
  }, [jump, sync])

  return (
    <Context.Provider value={{ body, bot, jump }}>
      <div
        className={cn("relative min-h-0 flex-1 overflow-y-auto", !ready && "invisible", className)}
        ref={root}
        role="log"
        {...props}
        onScroll={(event) => {
          sync()
          onScroll?.(event)
        }}
      >
        {children}
      </div>
    </Context.Provider>
  )
}

export type ConversationContentProps = ComponentProps<"div">

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => {
  const ctx = useConversation()
  return <div className={cn("flex flex-col gap-4 p-4", className)} ref={ctx.body} {...props} />
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
  const { bot, jump } = useConversation()

  const handleScrollToBottom = useCallback(() => {
    jump("smooth")
  }, [jump])

  if (bot) {
    return null
  }

  return (
    <Button
      className={cn("absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full", className)}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon className="size-4" />
    </Button>
  )
}
