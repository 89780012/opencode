import { ArrowRight, Boxes, CalendarClock, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { StrategyGroup } from "@/types/group"

interface Props {
  groups: StrategyGroup[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (group: StrategyGroup) => void
  onDelete: (group: StrategyGroup) => void
}

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function time(value: number) {
  return fmt.format(new Date(value))
}

function GroupCard(props: {
  group: StrategyGroup
  onSelect: (group: StrategyGroup) => void
  onDelete: (group: StrategyGroup) => void
}) {
  const names = props.group.items.map((item) => item.workspace.name)
  return (
    <Card
      className="group cursor-pointer gap-0 overflow-hidden border-primary/20 bg-background py-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-[#2d3431] dark:bg-[#121616] dark:shadow-none dark:hover:border-[#46665b]"
      onClick={() => props.onSelect(props.group)}
    >
      <div className="h-px w-full bg-primary/30 dark:bg-[#5f8d7d]" />
      <CardContent className="space-y-2.5 px-3.5 py-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-foreground">{props.group.name}</div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Boxes className="size-4" />
              {props.group.count} 个策略工作区
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-[#355145] dark:bg-[#18201e] dark:text-[#b8c7c0]">
            多屏协作
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <span
              key={name}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 transition-colors group-hover:border-slate-300 group-hover:bg-slate-50 group-hover:text-slate-700 dark:border-[#355145] dark:bg-[#18201e] dark:text-[#b8c7c0] dark:group-hover:border-[#4d7163] dark:group-hover:bg-[#1b2421] dark:group-hover:text-[#dbe6e0]"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between border-t pt-2.5 text-sm dark:border-[#2a2f2d]">
          <div className="flex items-center gap-3 text-muted-foreground dark:text-[#96a39d]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="size-4" />
              {time(props.group.updated_at)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation()
                props.onDelete(props.group)
              }}
            >
              <Trash2 className="size-3.5" />
              删除
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-[#dce7e1]"
              onClick={(event) => {
                event.stopPropagation()
                props.onSelect(props.group)
              }}
            >
              进入
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function GroupList(props: Props) {
  if (props.loading && props.groups.length === 0) {
    return <div className="flex min-h-[260px] items-center justify-center text-sm text-muted-foreground">正在加载组合策略...</div>
  }

  if (props.error) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-3xl border bg-background px-4 text-center shadow-sm dark:border-[#2d3431] dark:bg-[#121616] dark:shadow-none">
        <p className="text-sm text-destructive">{props.error}</p>
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    )
  }

  if (props.groups.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed bg-background px-6 text-center dark:border-[#2d3431] dark:bg-[#121616]">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-[#18201e] dark:text-[#b8c7c0]">
          <Sparkles className="size-5" />
        </div>
        <div className="space-y-1">
          <div className="text-base font-semibold">还没有组合策略</div>
          <p className="text-sm text-muted-foreground">新建后会自动生成 2 或 3 个真实工作区，并显示在这里。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {props.groups.map((group) => (
        <GroupCard key={group.id} group={group} onSelect={props.onSelect} onDelete={props.onDelete} />
      ))}
    </div>
  )
}
