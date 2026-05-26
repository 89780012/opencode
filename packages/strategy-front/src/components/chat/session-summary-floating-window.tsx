import { useState } from "react"
import { FileText, Loader2, RefreshCw, Sparkles, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SessionSummary } from "@/types/summary"

type Props = {
  summary: SessionSummary
  load: boolean
  err?: string | null
  ready: boolean
  onRefresh: () => void
  onRun: () => void
  onStop: () => void
}

function desc(props: Props) {
  if (!props.ready) return "会话完成后会自动生成总结"
  if (props.summary.state === "running") return props.err || "正在后台生成总结..."
  if (props.summary.state === "ready") return "已完成当前会话总结"
  if (props.summary.state === "error") return props.summary.err || props.err || "总结生成失败"
  return "等待会话完成后自动总结"
}

export function SessionSummaryFloatingWindow(props: Props) {
  const [open, setOpen] = useState(false)
  const busy = props.load || props.summary.state === "running"

  if (!open) {
    return (
      <div className="pointer-events-none absolute left-4 top-4 z-20">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="pointer-events-auto h-auto min-h-16 w-16 flex-col gap-1.5 rounded-2xl border-slate-200 bg-white/95 px-2 py-3 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-slate-50 dark:border-[#2a312f] dark:bg-[#151918]/95 dark:text-[#e4ece8] dark:hover:bg-[#1b201f]"
          onClick={() => setOpen(true)}
        >
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          <span className="text-[11px] leading-none font-medium">总结</span>
        </Button>
      </div>
    )
  }

  return (
    <aside className="pointer-events-auto absolute left-4 top-4 z-20 flex w-[280px] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur dark:border-[#29312e] dark:bg-[#121615]/95 dark:shadow-none">
      <div className="flex items-start gap-3 border-b border-slate-100 p-3 dark:border-[#242b29]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-[#eef6f2]">会话总结</div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-[#94a39d]">{desc(props)}</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 size-7 shrink-0 text-slate-400 hover:text-slate-700 dark:text-[#94a39d] dark:hover:text-[#eef6f2]"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="custom-scrollbar max-h-[280px] overflow-y-auto p-3">
        {props.summary.state === "ready" && props.summary.text ? (
          <div className="whitespace-pre-wrap text-xs leading-6 text-slate-700 dark:text-[#d8e3df]">
            {props.summary.text}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-[#2a312f]">
            <FileText className="size-5 text-slate-400" />
            <div className="text-xs leading-5 text-slate-500 dark:text-[#94a39d]">{desc(props)}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3 dark:border-[#242b29]">
        <div className="text-[11px] text-slate-400"></div>
        <div className="flex gap-2">
          {props.summary.state === "running" ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={props.onStop}
              disabled={props.load}
            >
              <Square className="size-3" />
              打断
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={props.onRefresh}
              disabled={props.load}
            >
              <RefreshCw className={`size-3 ${props.load ? "animate-spin" : ""}`} />
              刷新
            </Button>
          )}
          <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={props.onRun} disabled={!props.ready || busy}>
            <Sparkles className="size-3" />
            总结
          </Button>
        </div>
      </div>
    </aside>
  )
}
