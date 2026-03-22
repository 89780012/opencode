import { FileCode2, FilePlus2, FileSymlink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatFileDiff } from "@/types/chat"

interface Props {
  diffs: ChatFileDiff[]
  file: string | null
  loading?: boolean
  onFile: (path: string) => void
  onRefresh: () => void
}

const mark = (status?: ChatFileDiff["status"]) => {
  if (status === "added") {
    return { Icon: FilePlus2, tone: "text-emerald-500 dark:text-emerald-400", tag: "Added", code: "A" }
  }
  if (status === "deleted") {
    return { Icon: FileSymlink, tone: "text-red-500 dark:text-red-400", tag: "Deleted", code: "D" }
  }
  return { Icon: FileCode2, tone: "text-sky-500 dark:text-sky-400", tag: "Modified", code: "M" }
}

export function ReviewFileList(props: Props) {
  return (
    <div className="flex h-full min-h-0 w-full shrink-0 flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:w-[280px] lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">代表变更</div>
          <div className="text-xs text-sidebar-foreground/60">{props.diffs.length} 文件</div>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={props.onRefresh}
          disabled={props.loading}
          className="h-7 border-sidebar-border bg-sidebar px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <RefreshCw className={cn("size-3.5", props.loading ? "animate-spin" : undefined)} />
          刷新
        </Button>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto px-1 py-1.5">
        {props.diffs.map((item) => {
          const meta = mark(item.status)
          const name = item.file.split("/").pop() ?? item.file
          const dir = item.file.includes("/") ? item.file.slice(0, item.file.length - name.length - 1) : ""
          const active = props.file === item.file
          const tip = `${item.file}\n${meta.tag}  +${item.additions}  -${item.deletions}`

          return (
            <button
              key={item.file}
              type="button"
              onClick={() => props.onFile(item.file)}
              title={tip}
              className={cn(
                "group relative mb-0.5 flex min-h-9 w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left outline-hidden transition-colors focus-visible:ring-1 focus-visible:ring-sidebar-ring",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0.5 left-0 w-0.5 rounded-full bg-sidebar-primary transition-opacity",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
                )}
              />
              <meta.Icon className={cn("size-3.5 shrink-0", meta.tone)} />
              <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden">
                <span className="max-w-[52%] shrink truncate text-[12px] leading-5 font-medium">{name}</span>
                {dir ? (
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-[11px] leading-5",
                      active ? "text-sidebar-accent-foreground/55" : "text-sidebar-foreground/45",
                    )}
                  >
                    {dir}
                  </span>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 pl-1 text-[10px] leading-5 font-medium tabular-nums">
                <span className={meta.tone} title={meta.tag}>
                  {meta.code}
                </span>
                {item.additions > 0 ? <span className="text-emerald-500 dark:text-emerald-400">+{item.additions}</span> : null}
                {item.deletions > 0 ? <span className="text-red-500 dark:text-red-400">-{item.deletions}</span> : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
