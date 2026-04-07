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

function time(value: number) {
  return fmt.format(new Date(value))
}

export function WorkflowListCard(props: { item: WorkflowItem; onOpen: (id: string) => void }) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="group min-h-[198px] cursor-pointer gap-0 overflow-hidden rounded-md border py-0 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.38)]"
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
              <div className="mt-1 text-xs text-muted-foreground">
                {props.item.status === "ready" ? "已就绪" : "草稿"}
              </div>
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

        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" />
            最近更新 {time(props.item.updated_at)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            打开编排
          </div>
        </div>
      </div>
    </Card>
  )
}
