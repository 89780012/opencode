import { memo } from "react"
import { Hammer } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function ExecuteView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={Hammer}
      badge="执行"
      top={
        <div className="rounded-xl border border-amber-200 bg-amber-50/85 px-3 py-3">
          <div className="flex items-center gap-2 text-[11px] font-medium text-amber-700">
            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5">实现</span>
            <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5">验证</span>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-amber-950/75">在工作区里真实执行任务、完成改动，并把结果交给下游检查节点。</div>
        </div>
      }
    />
  )
}

export const WorkflowExecuteNode = memo(ExecuteView)
