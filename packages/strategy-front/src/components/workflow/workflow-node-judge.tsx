import { memo } from "react"
import { GitBranch } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function JudgeView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={GitBranch}
      badge="Judge"
      top={
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-700">
            <span>通用判断</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                pass
              </span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">fail</span>
            </div>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-slate-700">适合做条件判断、质量阈值判断或自定义分支判断。</div>
        </div>
      }
      foot={
        <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          记得给出 <code>pass/fail</code> 两条边，节点会按结构化结果自动分流。
        </div>
      }
    />
  )
}

export const WorkflowJudgeNode = memo(JudgeView)
