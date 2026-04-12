import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, ChevronDown, Circle, ListTodo, LoaderCircle, MinusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatTodo } from "@/types/chat"

interface Props {
  todos: ChatTodo[]
  collapsed?: boolean
  compact?: boolean
  preview?: string
}

function icon(status: string, compact?: boolean) {
  const size = compact ? "size-3.5" : "size-4"
  if (status === "completed") {
    return <CheckCircle2 className={`${size} text-emerald-600`} />
  }
  if (status === "in_progress") {
    return <LoaderCircle className={`${size} animate-spin text-sky-600`} />
  }
  if (status === "cancelled") {
    return <MinusCircle className={`${size} text-muted-foreground`} />
  }
  return <Circle className={`${size} text-muted-foreground`} />
}

export function TodoPanel(props: Props) {
  const [user, setUser] = useState<boolean | undefined>(undefined)
  const body = useRef<HTMLDivElement | null>(null)
  const [stuck, setStuck] = useState(false)
  const total = props.todos.length
  const count = useMemo(() => props.todos.filter((item) => item.status === "completed").length, [props.todos])
  const base = props.compact ? true : !!props.collapsed
  const collapsed = user ?? base
  const pane = props.compact ? "max-h-28" : "max-h-40"

  useEffect(() => {
    if (collapsed) return

    const root = body.current
    if (!root) return

    const el = root.querySelector("[data-in-progress]")
    if (!(el instanceof HTMLElement)) return

    requestAnimationFrame(() => {
      el.scrollIntoView({
        block: "nearest",
      })
      const root = body.current
      if (!root) return
      setStuck(root.scrollTop > 0)
    })
  }, [collapsed, props.todos])

  if (props.todos.length === 0) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[22px] border border-black/8 bg-black/[0.02] backdrop-blur-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-white/[0.03]",
        collapsed ? "shadow-none" : "shadow-sm shadow-black/5 dark:shadow-black/20",
      )}
    >
      <div className={cn("flex items-center gap-3", props.compact ? "px-3 py-2" : "px-3 py-2.5")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-2xl bg-background/90 text-muted-foreground ring-1 ring-black/6 dark:bg-white/[0.05] dark:ring-white/10">
          <ListTodo className={props.compact ? "size-[14px]" : "size-[15px]"} />
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            setUser((value) => !(value ?? base))
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            <span>待办</span>
            <span className="rounded-full bg-background/90 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-black/6 dark:bg-white/[0.05] dark:ring-white/10">
              {count} / {total}
            </span>
          </div>
          <div className={cn("relative overflow-hidden text-muted-foreground", props.compact ? "mt-0.5 h-4 text-[11px]" : "mt-1 h-4 text-[12px]")}>
            <div
              className={cn(
                "absolute inset-0 truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                collapsed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
              )}
            >
              {props.preview || "正在跟踪当前任务"}
            </div>
            <div
              className={cn(
                "absolute inset-0 truncate transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                collapsed ? "-translate-y-1 opacity-0" : "translate-y-0 opacity-100",
              )}
            >
              {`已跟踪 ${total} 项`}
            </div>
          </div>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 rounded-full text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          onClick={(e) => {
            e.stopPropagation()
            setUser((value) => !(value ?? base))
          }}
        >
          <ChevronDown className={cn("size-4 transition-transform", collapsed ? "rotate-180" : "")} />
        </Button>
      </div>

      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div
          ref={body}
          className={`relative min-h-0 overflow-y-auto border-t border-black/6 px-3 py-2.5 dark:border-white/8 ${pane}`}
          onScroll={(e) => {
            setStuck(e.currentTarget.scrollTop > 0)
          }}
        >
          <div className={props.compact ? "space-y-1" : "space-y-1.5"}>
            {props.todos.map((item, i) => (
              <div
                key={`${item.content}:${item.status}:${i}`}
                data-in-progress={item.status === "in_progress" ? "" : undefined}
                className={cn("flex items-start rounded-xl", props.compact ? "gap-2 px-1 py-0.5" : "gap-2.5 px-1.5 py-1")}
              >
                <div className="mt-0.5 shrink-0">{icon(item.status, props.compact)}</div>
                <div
                  className={cn(
                    props.compact ? "min-w-0 text-xs leading-5" : "min-w-0 text-[13px] leading-5",
                    "transition-[color,opacity,text-decoration-color] duration-200",
                    item.status === "completed" || item.status === "cancelled"
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                    item.status === "pending" ? "opacity-90" : "opacity-100",
                  )}
                >
                  {item.content}
                </div>
              </div>
            ))}
          </div>
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-background to-transparent transition-opacity duration-200",
              stuck ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </div>
    </div>
  )
}
