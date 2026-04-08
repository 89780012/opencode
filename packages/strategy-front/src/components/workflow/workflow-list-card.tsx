import { ArrowUpRight, Clock3, Network, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WorkflowItem } from "@/types/workflow"

const fmt = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function time(value?: number) {
  if (!value) return "-"
  return fmt.format(new Date(value))
}

function status(value?: WorkflowItem["run_status"]) {
  if (value === "running") return "运行中"
  if (value === "blocked") return "已阻塞"
  if (value === "failed") return "失败"
  if (value === "done") return "完成"
  return "未运行"
}

function tone(value?: WorkflowItem["run_status"]) {
  if (value === "running") return "border-sky-200 bg-sky-50 text-sky-700"
  if (value === "blocked") return "border-amber-200 bg-amber-50 text-amber-700"
  if (value === "failed") return "border-red-200 bg-red-50 text-red-700"
  if (value === "done") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  return "border-border/70 bg-background/85 text-muted-foreground"
}

export function WorkflowListCard(props: { item: WorkflowItem; onOpen: (id: string) => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="group min-h-[232px] cursor-pointer gap-0 overflow-hidden rounded-md border py-0 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.38)]"
      onClick={() => props.onOpen(props.item.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        props.onOpen(props.item.id)
      }}
    >
      <div className="flex h-full flex-col px-5 pb-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary ring-1 ring-primary/10">
              <Network className="size-5" />
            </div>
            <div>
              <div className="text-[18px] tracking-tight text-foreground">{props.item.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{props.item.status === "ready" ? "可运行" : "草稿"}</div>
            </div>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-all group-hover:border-primary/30 group-hover:text-foreground">
            <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{props.item.desc}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary">
            {props.item.count} 个节点
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
              tone(props.item.run_status),
            )}
          >
            {status(props.item.run_status)}
          </span>
          {props.item.tags.map((item) => (
            <span
              key={item}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
                "border-border/70 bg-background/85 text-muted-foreground dark:bg-background/40",
              )}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border/70 bg-background/85 px-2 py-2">
            <div className="text-[10px] text-muted-foreground">运行次数</div>
            <div className="mt-1 text-sm font-medium text-foreground">{props.item.run_total || 0}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/85 px-2 py-2">
            <div className="text-[10px] text-muted-foreground">完成次数</div>
            <div className="mt-1 text-sm font-medium text-emerald-600">{props.item.done_runs || 0}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/85 px-2 py-2">
            <div className="text-[10px] text-muted-foreground">问题数</div>
            <div className="mt-1 text-sm font-medium text-destructive">
              {(props.item.failed_runs || 0) + (props.item.blocked_runs || 0)}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            最近更新 {time(props.item.updated_at)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            最近运行 {time(props.item.run_at)}
          </div>
        </div>
      </div>
    </Card>
  )
}
