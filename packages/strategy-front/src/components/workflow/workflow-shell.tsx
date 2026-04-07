import { useState } from "react"
import { ArrowLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas"
import { WorkflowLibrary } from "@/components/workflow/workflow-library"
import { WorkflowTopbar } from "@/components/workflow/workflow-topbar"
import type { WorkflowDetail } from "@/types/workflow"

export function WorkflowShell(props: { item: WorkflowDetail }) {
  const [open, setOpen] = useState(true)
  const [q, setQ] = useState("")

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="border-b border-border/70 bg-sidebar px-5 py-1 backdrop-blur ">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button variant="outline" size="icon-sm" className="rounded-full" asChild>
              <Link to="/app/workflows">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">{props.item.name}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpen((prev) => !prev)}>
            {open ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            {open ? "收起组件库" : "展开组件库"}
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0">
          {open ? (
            <WorkflowLibrary value={q} onValue={setQ} />
          ) : null}

          <div className="relative min-h-0 flex-1">
            <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2">
              <WorkflowTopbar onAction={(key) => toast.success(`Demo 动作: ${key}`)} />
            </div>

            <div className="h-full">
              <WorkflowCanvas item={props.item} onPick={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
