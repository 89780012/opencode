import { RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WorkflowTopbar(props: {
  busy?: boolean
  onSave: () => void
  onRefresh: () => void
}) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border/70 bg-white/92 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:bg-[#111417]/92">
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-muted-foreground hover:bg-primary/6 hover:text-foreground"
        onClick={props.onSave}
        title="保存工作流"
        disabled={props.busy}
      >
        <Save className="size-[18px] text-blue-600" strokeWidth={2.35} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-muted-foreground hover:bg-primary/6 hover:text-foreground"
        onClick={props.onRefresh}
        title="刷新工作流"
        disabled={props.busy}
      >
        <RefreshCw className={`size-[18px] text-indigo-500 ${props.busy ? "animate-spin" : ""}`} strokeWidth={2.35} />
      </Button>
    </div>
  )
}
