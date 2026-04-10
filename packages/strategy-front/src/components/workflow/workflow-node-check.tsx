import { memo } from "react"
import { FileSearch } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function CheckView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={FileSearch}
      badge="检查"
      top={
        <div className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,rgba(241,245,249,0.95),rgba(255,255,255,0.96))] px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-700">
            <span>结构化检查</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">pass</span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-700">fail</span>
            </div>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-slate-700">核实当前结果是否满足要求，并把阻塞问题写回工作流。</div>
        </div>
      }
      foot={
        <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
          检查节点必须输出 <code>pass</code>，失败时补充 <code>issues</code> 和回写提示。
        </div>
      }
    />
  )
}

export const WorkflowCheckNode = memo(CheckView)
