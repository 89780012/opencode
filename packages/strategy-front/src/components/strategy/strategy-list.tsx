import { ArrowRight, CalendarClock, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  items: LocalWorkspace[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (item: LocalWorkspace) => void
  onDelete: (item: LocalWorkspace) => void
}

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function time(value?: number) {
  if (!value) return "暂无时间"
  return fmt.format(new Date(value))
}

function typeLabel(value?: string) {
  if (value === "python") return "Python"
  if (value === "js") return "JS"
  return "SmartX"
}

function Row(props: {
  item: LocalWorkspace
  onSelect: (item: LocalWorkspace) => void
  onDelete: (item: LocalWorkspace) => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-background px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/35 hover:bg-primary/[0.03] dark:border-[#2d3431] dark:bg-[#121616] dark:hover:border-[#46665b] dark:hover:bg-[#161b1a]"
      onClick={() => props.onSelect(props.item)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold text-foreground">{props.item.name}</div>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-[#33403b] dark:bg-[#171c1b] dark:text-[#d7dfdb]">
            {typeLabel(props.item.type)}
          </span>
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-[#96a39d]">
          <CalendarClock className="size-3.5" />
          {time(props.item.updated_at)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation()
            props.onDelete(props.item)
          }}
        >
          <Trash2 className="size-3.5" />
          删除
        </button>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 dark:text-[#dce7e1]">
          进入
          <ArrowRight className="size-4" />
        </span>
      </div>
    </button>
  )
}

export function StrategyList(props: Props) {
  if (props.loading && props.items.length === 0) {
    return <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">正在加载策略...</div>
  }

  if (props.error) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border bg-background px-4 text-center shadow-sm dark:border-[#2d3431] dark:bg-[#121616] dark:shadow-none">
        <p className="text-sm text-destructive">{props.error}</p>
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    )
  }

  if (props.items.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-background px-6 text-center dark:border-[#2d3431] dark:bg-[#121616]">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-[#18201e] dark:text-[#b8c7c0]">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold">还没有单策略</div>
          <p className="text-sm text-muted-foreground">新建工作区后会显示在这里，进入后即可开始聊天和改代码。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {props.items.map((item) => (
        <Row key={item.path} item={item} onSelect={props.onSelect} onDelete={props.onDelete} />
      ))}
    </div>
  )
}
