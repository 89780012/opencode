import type { ReactNode } from "react"
import { ScrollArea as Scroll } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  open: string[]
  active: string | null
  onPick: (path: string) => void
  onClose: (path: string) => void
  side?: ReactNode
}

const label = (paths: string[]) => {
  const seen = paths.reduce((map, path) => {
    const name = path.split("/").pop() ?? path
    map.set(name, (map.get(name) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  return paths.reduce(
    (map, path) => {
      const part = path.split("/").filter(Boolean)
      const name = part[part.length - 1] ?? path
      map[path] = seen.get(name) === 1 ? name : part.slice(-2).join("/")
      return map
    },
    {} as Record<string, string>,
  )
}

export function WorkspaceFileTabs(props: Props) {
  const names = label(props.open)

  return (
    <div className="flex min-w-0 items-end border-b bg-muted/15 pt-1">
      <div className="min-w-0 flex-1 overflow-hidden">
        <Scroll.Root className="relative min-w-0">
          <Scroll.Viewport className="w-full outline-none">
            <div className="flex min-w-max items-end">
              {props.open.length === 0 ? (
                <div className="px-2 pb-2 text-xs text-muted-foreground">No open files</div>
              ) : (
                props.open.map((path) => {
                  const active = path === props.active

                  return (
                    <div
                      key={path}
                      className={cn(
                        "group -mb-px flex h-9 shrink-0 items-center gap-1 rounded-none border border-b-transparent pr-1 transition-[background-color,color,border-color]",
                        active
                          ? "border-border bg-background text-foreground"
                          : "border-border bg-muted/45 text-muted-foreground hover:bg-muted/65 hover:text-foreground",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => props.onPick(path)}
                        className={cn(
                          "min-w-0 px-3 text-sm outline-none transition-colors",
                          active ? "font-medium" : "font-normal",
                        )}
                        title={path}
                      >
                        <span className="block max-w-52 truncate">{names[path]}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          props.onClose(path)
                        }}
                        className={cn(
                          "rounded-none p-1 transition-[background-color,color,opacity] hover:bg-muted hover:text-foreground",
                          active
                            ? "text-muted-foreground opacity-100"
                            : "text-muted-foreground/70 opacity-70 group-hover:opacity-100",
                        )}
                        aria-label={`Close ${names[path]}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </Scroll.Viewport>
          <Scroll.ScrollAreaScrollbar
            orientation="horizontal"
            className="absolute right-0 bottom-0 left-0 z-10 flex h-1.5 touch-none p-0 select-none opacity-0 transition-opacity hover:opacity-100 data-[state=visible]:opacity-100"
          >
            <Scroll.ScrollAreaThumb className="bg-border/75 hover:bg-border relative flex-1 rounded-full" />
          </Scroll.ScrollAreaScrollbar>
          <Scroll.Corner />
        </Scroll.Root>
      </div>
      {props.side ? (
        <div className="flex shrink-0 items-center gap-2 border-l bg-background/95 pb-1 pl-3 pr-2 backdrop-blur-sm">
          {props.side}
        </div>
      ) : null}
    </div>
  )
}
