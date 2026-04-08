import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkflowEmpty } from "@/components/workflow/workflow-empty"
import { WorkflowListCard } from "@/components/workflow/workflow-list-card"
import type { WorkflowItem } from "@/types/workflow"

export function WorkflowList(props: {
  items: WorkflowItem[]
  onOpen: (id: string) => void
  err?: string | null
  onRetry?: () => void
}) {
  if (props.err) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-3xl border bg-background px-4 text-center shadow-sm">
        <p className="text-sm text-destructive">{props.err}</p>
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    )
  }

  if (props.items.length === 0) {
    return <WorkflowEmpty />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {props.items.map((item) => (
        <WorkflowListCard key={item.id} item={item} onOpen={props.onOpen} />
      ))}
    </div>
  )
}
