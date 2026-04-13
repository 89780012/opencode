import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

type Stat = {
  label: string
  value: number
}

type SectionProps = {
  title: string
  desc: ReactNode
  children: ReactNode
}

type StateProps = {
  loading: boolean
  empty: boolean
  loading_text: string
  empty_text: string
  children: ReactNode
}

type CardProps = {
  title: string
  badges?: string[]
  desc?: ReactNode
  meta?: ReactNode[]
  actions?: ReactNode
}

/**
 * 渲染页面顶部的统计卡片区域。
 */
export function StatCards(props: { items: Stat[] }) {
  const grid =
    props.items.length === 4
      ? "md:grid-cols-4"
      : props.items.length === 3
        ? "md:grid-cols-3"
        : props.items.length === 2
          ? "md:grid-cols-2"
          : "md:grid-cols-1"

  return (
    <div className={`grid gap-4 py-6 ${grid}`}>
      {props.items.map((item) => (
        <div key={item.label} className="rounded-2xl border bg-muted/20 px-4 py-4">
          <div className="text-muted-foreground text-sm">{item.label}</div>
          <div className="mt-2 text-3xl font-semibold">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * 渲染页面中的说明提示条。
 */
export function InfoBanner(props: { children: ReactNode }) {
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{props.children}</div>
}

/**
 * 渲染统一的分组标题和说明。
 */
export function ResourceSection(props: SectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{props.title}</h2>
        <div className="text-muted-foreground mt-1 text-sm">{props.desc}</div>
      </div>
      {props.children}
    </section>
  )
}

/**
 * 在加载、空态和正常列表之间切换展示。
 */
export function ResourceState(props: StateProps) {
  if (props.loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        {props.loading_text}
      </div>
    )
  }

  if (props.empty) {
    return <div className="text-muted-foreground rounded-xl border border-dashed px-4 py-6 text-sm">{props.empty_text}</div>
  }

  return <>{props.children}</>
}

/**
 * 渲染通用资源卡片。
 */
export function ResourceCard(props: CardProps) {
  return (
    <div className="bg-background rounded-2xl border px-5 py-4 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-base font-semibold">{props.title}</div>
            {props.badges?.map((item) => (
              <span key={item} className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                {item}
              </span>
            ))}
          </div>
          {props.desc ? <div className="text-muted-foreground text-sm leading-6">{props.desc}</div> : null}
          {props.meta?.map((item, i) => (
            <div key={i} className="text-muted-foreground break-all text-xs">
              {item}
            </div>
          ))}
        </div>
        {props.actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{props.actions}</div> : null}
      </div>
    </div>
  )
}
