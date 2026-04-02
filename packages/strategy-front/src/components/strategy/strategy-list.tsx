import { ArrowUpRight, Braces, CalendarClock, Check, Code2, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LocalWorkspace } from "@/types/workspace"

interface Props {
  items: LocalWorkspace[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onSelect: (item: LocalWorkspace) => void
  onDelete: (item: LocalWorkspace) => void
  selecting: boolean
  selected: string[]
  onToggle: (item: LocalWorkspace) => void
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
  if (value === "js") return "JavaScript"
  if (value === "other") return "自定义"
  return "SmartX"
}

function sourceLabel(value?: string) {
  if (value === "default_plugin") return "默认模板"
  if (value === "imported") return "已导入"
  return "用户创建"
}

function tone(value?: string) {
  if (value === "python") {
    return {
      shell: "from-sky-500/14 via-sky-500/5 to-transparent",
      icon: "bg-sky-500/10 text-sky-700 ring-sky-500/10 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-sky-400/20",
      badge: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100",
    }
  }
  if (value === "js") {
    return {
      shell: "from-amber-500/14 via-amber-500/5 to-transparent",
      icon: "bg-amber-500/10 text-amber-700 ring-amber-500/10 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/20",
      badge:
        "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100",
    }
  }
  if (value === "other") {
    return {
      shell: "from-slate-500/14 via-slate-500/5 to-transparent",
      icon: "bg-slate-500/10 text-slate-700 ring-slate-500/10 dark:bg-slate-500/15 dark:text-slate-100 dark:ring-slate-400/20",
      badge:
        "border-slate-500/20 bg-slate-500/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-100",
    }
  }
  return {
    shell: "from-emerald-500/14 via-emerald-500/5 to-transparent",
    icon: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/10 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-400/20",
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100",
  }
}

function Icon(props: { type?: string }) {
  if (props.type === "python") return <Code2 className="size-4" />
  if (props.type === "js") return <Braces className="size-4" />
  return <Sparkles className="size-4" />
}

function Chip(props: { text: string; tone?: "good" | "warn" | "plain" }) {
  const style =
    props.tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"
      : props.tone === "warn"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100"
        : "border-border/70 bg-background/85 text-muted-foreground dark:bg-background/40"

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium", style)}>
      {props.text}
    </span>
  )
}

function Row(props: {
  item: LocalWorkspace
  onSelect: (item: LocalWorkspace) => void
  onDelete: (item: LocalWorkspace) => void
  selecting: boolean
  selected: boolean
  onToggle: (item: LocalWorkspace) => void
}) {
  const ui = tone(props.item.type)
  const action = () => {
    if (props.selecting) {
      props.onToggle(props.item)
      return
    }
    props.onSelect(props.item)
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      className={cn(
        "group relative min-h-[180px] cursor-pointer gap-0 overflow-hidden rounded-xl border py-0 text-left shadow-[0_18px_36px_-30px_rgba(15,23,42,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_22px_42px_-28px_rgba(15,23,42,0.38)] dark:shadow-black/20",
        props.selected &&
          "border-primary/55 shadow-[0_0_0_1px_hsl(var(--primary)/0.16),0_22px_40px_-28px_rgba(15,23,42,0.4)]",
      )}
      onClick={action}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          action()
        }
      }}
    >
      {/* <div className={cn("absolute inset-x-0 top-0 h-20 bg-gradient-to-b", ui.shell)} /> */}

      <div className="relative flex h-full flex-col px-4 pb-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-[18px] ring-1", ui.icon)}>
              <Icon type={props.item.type} />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-[18px] font-semibold tracking-tight text-foreground">
                  {props.item.name}
                </div>
              </div>
            </div>
          </div>

          {props.selecting ? (
            <button
              type="button"
              aria-label={props.selected ? "取消选择" : "选择策略"}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border bg-background/90 transition-all",
                props.selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border/80 text-transparent hover:border-primary/40",
              )}
              onClick={(event) => {
                event.stopPropagation()
                props.onToggle(props.item)
              }}
            >
              <Check className="size-4" />
            </button>
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-all group-hover:border-primary/30 group-hover:text-foreground">
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              ui.badge,
            )}
          >
            <Icon type={props.item.type} />
            {typeLabel(props.item.type)}
          </span>
          <Chip text={props.item.missing ? "目录缺失" : "可开发"} tone={props.item.missing ? "warn" : "good"} />
          <Chip text={sourceLabel(props.item.source)} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            最近更新 {time(props.item.updated_at)}
          </div>

          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation()
              props.onDelete(props.item)
            }}
          >
            <Trash2 className="size-3.5" />
            删除
          </button>
        </div>
      </div>
    </Card>
  )
}

export function StrategyList(props: Props) {
  if (props.loading && props.items.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
        正在加载策略...
      </div>
    )
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
          <div className="text-base font-semibold">还没有策略</div>
          <p className="text-sm text-muted-foreground">新建、导入或迁移后的策略都会展示在这里。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {props.items.map((item) => (
        <Row
          key={item.path}
          item={item}
          onSelect={props.onSelect}
          onDelete={props.onDelete}
          selecting={props.selecting}
          selected={props.selected.includes(item.path)}
          onToggle={props.onToggle}
        />
      ))}
    </div>
  )
}
