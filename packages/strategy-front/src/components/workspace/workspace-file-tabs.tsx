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
    <div className="workspace-tabs flex min-w-0 items-end border-b border-slate-200 bg-slate-50 pt-1 dark:border-[#2a312f] dark:bg-[#121716]">
      <div className="min-w-0 flex-1 overflow-hidden">
        <Scroll.Root className="relative min-w-0">
          <Scroll.Viewport className="w-full outline-none">
            <div className="flex min-w-max items-end">
              {props.open.length === 0 ? (
                <div className="px-2 pb-2 text-xs text-slate-500 dark:text-[#8d9b94]">No open files</div>
              ) : (
                props.open.map((path) => {
                  const active = path === props.active

                  return (
                    <div
                      key={path}
                      data-active={active ? "" : undefined}
                      className={cn(
                        "workspace-tab group -mb-px flex h-9 shrink-0 items-center gap-1 rounded-none border border-b-transparent pr-1 transition-[background-color,color,border-color]",
                        active
                          ? "border-slate-200 border-b-white bg-white text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-[#2a312f] dark:border-b-[#121716] dark:bg-[#121716] dark:text-[#eef5f1] dark:shadow-none"
                          : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-[#2a312f] dark:bg-[#1d2422] dark:text-[#8f9d96] dark:hover:bg-[#242c29] dark:hover:text-[#eef5f1]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => props.onPick(path)}
                        className={cn(
                          "min-w-0 bg-transparent px-3 text-sm outline-none transition-colors appearance-none",
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
                          "rounded-none bg-transparent p-1 transition-[background-color,color,opacity] appearance-none",
                          active
                            ? "text-slate-500 opacity-100 hover:bg-slate-100 hover:text-slate-800 dark:text-[#8f9d96] dark:hover:bg-[#202725] dark:hover:text-[#eef5f1]"
                            : "text-slate-400 opacity-70 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100 dark:text-[#6f7d76] dark:hover:bg-[#202725] dark:hover:text-[#dbe5e1]",
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
            <Scroll.ScrollAreaThumb className="relative flex-1 rounded-full bg-slate-300 hover:bg-slate-400 dark:bg-[#313b37] dark:hover:bg-[#445049]" />
          </Scroll.ScrollAreaScrollbar>
          <Scroll.Corner />
        </Scroll.Root>
      </div>
      {props.side ? (
        <div className="workspace-tabs-side flex shrink-0 items-center gap-2 border-l border-slate-200 bg-slate-50 pb-1 pl-3 pr-2 dark:border-[#2a312f] dark:bg-[#121716]">
          {props.side}
        </div>
      ) : null}
    </div>
  )
}
