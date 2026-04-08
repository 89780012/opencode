import { memo } from "react"
import { ClipboardList } from "lucide-react"
import type { NodeProps } from "@xyflow/react"
import type { WorkflowFlowNode } from "@/types/workflow"
import { WorkflowNodeFrame } from "./workflow-node-shared"

function PlanView(props: NodeProps<WorkflowFlowNode>) {
  return (
    <WorkflowNodeFrame
      props={props}
      icon={ClipboardList}
      badge="规划"
      top={
        <div className="rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-blue-700">
            <span>规划阶段</span>
            <span>蓝图</span>
          </div>
          <div className="mt-2 text-[12px] leading-5 text-blue-900/75">聚焦拆解问题、识别风险，并安排后续实施顺序。</div>
        </div>
      }
    />
  )
}

export const WorkflowPlanNode = memo(PlanView)
