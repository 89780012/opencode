import { memo } from "react"
import { FileSearch } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function ReviewView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={FileSearch}
      badge="Review"
      top={
        <div className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(255,255,255,0.96))] px-3 py-3">
          <div className="text-[11px] font-medium text-slate-700">审查节点</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/80 bg-white px-2 py-1.5 text-[11px] text-slate-600">输出总结</div>
            <div className="rounded-lg border border-white/80 bg-white px-2 py-1.5 text-[11px] text-slate-600">给出 next_prompt</div>
          </div>
        </div>
      }
      foot={
        <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          审查型节点会解析 JSON 里的 <code>pass</code>、<code>summary</code>、<code>next_prompt</code>。
        </div>
      }
    />
  )
}

export const WorkflowReviewNode = memo(ReviewView)
