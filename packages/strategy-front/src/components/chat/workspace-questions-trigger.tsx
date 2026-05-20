import { MessageSquareMore } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  count: number
  onClick: () => void
  className?: string
}

export function WorkspaceQuestionsTrigger(props: Props) {
  return (
    <div className={cn("pointer-events-none absolute top-4 right-5 z-20", props.className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="pointer-events-auto h-auto min-h-16 w-16 flex-col gap-1.5 rounded-2xl border-slate-200 bg-white/95 px-2 py-3 text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-slate-50 dark:border-[#2a312f] dark:bg-[#151918]/95 dark:text-[#e4ece8] dark:hover:bg-[#1b201f]"
        onClick={props.onClick}
      >
        <MessageSquareMore className="size-5" />
        <span className="text-[11px] leading-none font-medium">问题</span>
        <span className="text-lg leading-none font-semibold tabular-nums">{props.count}</span>
      </Button>
    </div>
  )
}
